-- Abuse hardening before the first public launch:
--   00 per-user rate limits inside the security definer RPCs (`rate_limited`)
--   01 app_events: column grants, size caps and a coarse insert throttle
--   02 length/size caps on the free-text and jsonb columns that had none
--   03 invite codes readable only by their owner, and rotatable
--   04 EXECUTE on the security definer helpers revoked from anon/public
--
-- Every function redefined here is copied from the newest migration that
-- defined it and only extended — block checks and the rest are unchanged.
-- Limits below are mirrored nowhere on the client; it only needs to know the
-- error code `rate_limited`.

-- ===== 00_rate_limits.sql =====

-- One row per counted action. Written and read only by the functions below
-- (which run as the table owner), never through the API.
create table public.rate_limit_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  action     text not null check (char_length(action) <= 32),
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup on public.rate_limit_events (user_id, action, created_at);
create index rate_limit_events_created on public.rate_limit_events (created_at);

alter table public.rate_limit_events enable row level security;
revoke all on public.rate_limit_events from anon, authenticated;

-- Raises `rate_limited` once p_user_id has p_max `p_action` events inside the
-- sliding window. A count, then the caller's own write: two racing calls can
-- overshoot by one, which is fine for a throttle.
create function public.enforce_rate_limit(p_user_id uuid, p_action text, p_max integer, p_window interval)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if (
    select count(*) from public.rate_limit_events
    where user_id = p_user_id and action = p_action and created_at > now() - p_window
  ) >= p_max then
    raise exception 'rate_limited' using hint = 'Too many attempts. Try again later.';
  end if;
end;
$$;

create function public.record_rate_limit_event(p_user_id uuid, p_action text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.rate_limit_events (user_id, action) values (p_user_id, p_action);
end;
$$;

-- Only ever called from other (security definer) functions.
revoke execute on function public.enforce_rate_limit(uuid, text, integer, interval) from public, anon, authenticated;
revoke execute on function public.record_rate_limit_event(uuid, text) from public, anon, authenticated;

-- The longest window is a day; keep two.
select cron.schedule(
  'purge_rate_limit_events',
  '17 * * * *',
  $$ delete from public.rate_limit_events where created_at < now() - interval '2 days' $$
);

-- Limits (per account):
--   room_create        20 / hour    rooms created
--   room_join          30 / hour    rooms newly joined
--   room_code_miss     10 / 10 min  join_room with a code matching no open room
--   invite_code_miss   10 / 10 min  follow_by_code with a code matching no one
--   follow             60 / hour    new follow edges (by code or by id)
--   block              30 / hour    new blocks
--   invite_rotate      10 / day     rotate_invite_code()
--   content_reports    20 / day     counted from content_reports itself
--
-- A failed code lookup has to be *recorded* to be throttled, and a raised
-- exception rolls back everything the RPC wrote — so a miss no longer raises:
-- join_room / follow_by_code record it and return an empty (all-null) row,
-- which the client reads as "not found". Every other error still raises.

-- Same as 20260925000000_accounts_sync_rooms.sql, plus the room_create limit
-- and a cap on p_unit (see rooms_unit_length below).
create or replace function public.create_room(p_routine_wtt text, p_routine_name text, p_unit text default null)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code     text;
  v_room     public.rooms;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform public.enforce_rate_limit(v_uid, 'room_create', 20, interval '1 hour');

  for attempt in 1..10 loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    begin
      insert into public.rooms (code, host_id, routine_name, routine_wtt, unit)
      values (v_code, v_uid, left(p_routine_name, 120), p_routine_wtt, left(p_unit, 16))
      returning * into v_room;
      exit;
    exception when unique_violation then
      v_room := null;  -- code clash with an open room: try another
    end;
  end loop;

  if v_room.id is null then
    raise exception 'room_code_exhausted';
  end if;

  insert into public.room_members (room_id, user_id) values (v_room.id, v_uid);
  perform public.record_rate_limit_event(v_uid, 'room_create');
  return v_room;
end;
$$;

-- Same as 20260925000000_accounts_sync_rooms.sql, plus the room_code_miss and
-- room_join limits. An unknown code now returns an all-null row instead of
-- raising `room_not_found`, so the miss it records survives (see above).
create or replace function public.join_room(p_code text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_room public.rooms;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform public.enforce_rate_limit(v_uid, 'room_code_miss', 10, interval '10 minutes');

  select * into v_room
  from public.rooms
  where code = upper(regexp_replace(p_code, '\s', '', 'g')) and status <> 'finished'
  for update;

  if v_room.id is null then
    perform public.record_rate_limit_event(v_uid, 'room_code_miss');
    return null;
  end if;

  if exists (select 1 from public.room_members where room_id = v_room.id and user_id = v_uid) then
    return v_room;
  end if;

  if (select count(*) from public.room_members where room_id = v_room.id) >= 8 then
    raise exception 'room_full';
  end if;

  perform public.enforce_rate_limit(v_uid, 'room_join', 30, interval '1 hour');

  insert into public.room_members (room_id, user_id) values (v_room.id, v_uid);
  perform public.record_rate_limit_event(v_uid, 'room_join');
  return v_room;
end;
$$;

-- What the follow RPCs hand back about the person just followed — the
-- profile minus invite_code (returning public.profiles leaked the code of
-- anyone reachable through follow_user).
create type public.profile_card as (
  id           uuid,
  display_name text,
  bio          text
);

-- The return type changes, so these are dropped and recreated (and
-- re-granted) rather than replaced.
drop function public.follow_by_code(text);
drop function public.follow_user(uuid);

-- Same as 20260930000000_moderation.sql (a blocked pair still looks exactly
-- like an unknown code), plus the invite_code_miss and follow limits, and the
-- narrower return type. A miss returns an all-null row instead of raising
-- `code_not_found`, so the miss it records survives.
create function public.follow_by_code(p_code text)
returns public.profile_card
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profile_card;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform public.enforce_rate_limit(v_uid, 'invite_code_miss', 10, interval '10 minutes');

  select p.id, p.display_name, p.bio into v_profile
  from public.profiles p
  where p.invite_code = upper(regexp_replace(p_code, '\s', '', 'g'));

  if v_profile.id is null or public.is_blocked_between(v_uid, v_profile.id) then
    perform public.record_rate_limit_event(v_uid, 'invite_code_miss');
    return null;
  end if;

  if v_profile.id = v_uid then
    raise exception 'cannot_follow_self';
  end if;

  if not exists (select 1 from public.follows where follower_id = v_uid and followee_id = v_profile.id) then
    perform public.enforce_rate_limit(v_uid, 'follow', 60, interval '1 hour');
    insert into public.follows (follower_id, followee_id) values (v_uid, v_profile.id)
    on conflict do nothing;
    perform public.record_rate_limit_event(v_uid, 'follow');
  end if;

  return v_profile;
end;
$$;

revoke execute on function public.follow_by_code(text) from public, anon;
grant execute on function public.follow_by_code(text) to authenticated;

-- Same as 20260930000000_moderation.sql (can_view_profile() is false across a
-- block, so a blocked pair gets the same `not_found`), plus the follow limit
-- and the narrower return type.
create function public.follow_user(p_user_id uuid)
returns public.profile_card
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profile_card;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_user_id = v_uid then
    raise exception 'cannot_follow_self';
  end if;
  if not public.can_view_profile(p_user_id) then
    raise exception 'not_found';
  end if;

  select p.id, p.display_name, p.bio into v_profile from public.profiles p where p.id = p_user_id;

  if not exists (select 1 from public.follows where follower_id = v_uid and followee_id = p_user_id) then
    perform public.enforce_rate_limit(v_uid, 'follow', 60, interval '1 hour');
    insert into public.follows (follower_id, followee_id) values (v_uid, p_user_id)
    on conflict do nothing;
    perform public.record_rate_limit_event(v_uid, 'follow');
  end if;

  return v_profile;
end;
$$;

revoke execute on function public.follow_user(uuid) from public, anon;
grant execute on function public.follow_user(uuid) to authenticated;

-- Same as 20260930000000_moderation.sql, plus the block limit (re-blocking
-- someone already blocked is free).
create or replace function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_user_id = v_uid then
    raise exception 'cannot_block_self';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'not_found';
  end if;

  if not exists (select 1 from public.user_blocks where blocker_id = v_uid and blocked_id = p_user_id) then
    perform public.enforce_rate_limit(v_uid, 'block', 30, interval '1 hour');
    insert into public.user_blocks (blocker_id, blocked_id) values (v_uid, p_user_id)
    on conflict do nothing;
    perform public.record_rate_limit_event(v_uid, 'block');
  end if;

  delete from public.follows
  where (follower_id = v_uid and followee_id = p_user_id)
     or (follower_id = p_user_id and followee_id = v_uid);
end;
$$;

-- Reports are inserted straight into the table (RLS-checked), so their limit
-- is a trigger counting the reporter's own recent reports.
create index content_reports_reporter_created on public.content_reports (reporter_id, created_at);

create function public.content_reports_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.content_reports
    where reporter_id = new.reporter_id and created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'rate_limited' using hint = 'Too many reports. Try again later.';
  end if;
  return new;
end;
$$;

create trigger content_reports_rate_limit
  before insert on public.content_reports
  for each row execute function public.content_reports_rate_limit();

-- ===== 01_app_events.sql =====

-- Only the columns the app sends; created_at is always the server's.
revoke insert on public.app_events from anon, authenticated;
grant insert (event, user_id, platform, app_version) on public.app_events to anon, authenticated;

-- The app sends e.g. 'android' and '1.4.2'. NOT VALID: enforced on new rows
-- without re-checking old ones, so this can't fail on deploy.
alter table public.app_events
  add constraint app_events_platform_length check (char_length(platform) <= 32) not valid;
alter table public.app_events
  add constraint app_events_app_version_length check (char_length(app_version) <= 32) not valid;

create index app_events_user_created on public.app_events (user_id, created_at) where user_id is not null;
create index app_events_anon_created on public.app_events (created_at) where user_id is null;

-- Analytics must never break the app, so over-limit events are dropped
-- silently (a BEFORE trigger returning null skips the row; the insert still
-- succeeds) rather than rejected:
--   an account:           100 events / hour
--   everyone anonymous:   300 events / minute, shared — the anon key is
--                         public, so there is no caller to key on; this only
--                         bounds how fast a script can grow the table.
create function public.app_events_throttle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    if (
      select count(*) from public.app_events
      where user_id = new.user_id and created_at > now() - interval '1 hour'
    ) >= 100 then
      return null;
    end if;
  elsif (
    select count(*) from public.app_events
    where user_id is null and created_at > now() - interval '1 minute'
  ) >= 300 then
    return null;
  end if;
  new.created_at := now();
  return new;
end;
$$;

create trigger app_events_throttle
  before insert on public.app_events
  for each row execute function public.app_events_throttle();

-- ===== 02_column_caps.sql =====

-- All NOT VALID: new and updated rows are checked, existing rows aren't, so
-- the migration can't fail on data already there. Once a query shows no
-- violations, `alter table … validate constraint …` makes them fully valid.
-- The client truncates / drops to stay under these (src/lib/supabase/limits.ts).

alter table public.routines
  add constraint routines_filename_length check (char_length(filename) <= 255) not valid;

-- create_room() already truncates both; this covers any other write path.
alter table public.rooms
  add constraint rooms_routine_name_length check (char_length(routine_name) <= 120) not valid;
alter table public.rooms
  add constraint rooms_unit_length check (char_length(unit) <= 16) not valid;

alter table public.room_set_logs
  add constraint room_set_logs_exercise_name_length check (char_length(exercise_name) <= 200) not valid;

-- The text form, not pg_column_size(): the stored size depends on TOAST
-- compression, so a highly repetitive payload could be far larger than it looks.
alter table public.sessions
  add constraint sessions_feed_snapshot_size check (octet_length(feed_snapshot::text) <= 65536) not valid;

-- ===== 03_invite_codes.sql =====

-- The permanent invite code was readable by anyone who can read the profile
-- row (roommates, followers, followees), which let e.g. a removed follower
-- follow again with it. Now only its owner can read it, through
-- my_invite_code(), and can replace it with rotate_invite_code().
--
-- Column-level SELECT: a column added to profiles later is unreadable by the
-- app until it's added to this grant.
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, bio, created_at, updated_at) on public.profiles to authenticated;

create function public.my_invite_code()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  return (select invite_code from public.profiles where id = auth.uid());
end;
$$;

revoke execute on function public.my_invite_code() from public, anon;
grant execute on function public.my_invite_code() to authenticated;

-- Gives the caller a fresh code; old links and QR codes stop working. People
-- already following stay followed (remove them from your followers first to
-- keep them from coming back).
create function public.rotate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform public.enforce_rate_limit(v_uid, 'invite_rotate', 10, interval '1 day');

  for attempt in 1..10 loop
    v_code := public.generate_invite_code();
    begin
      update public.profiles set invite_code = v_code where id = v_uid;
      exit;
    exception when unique_violation then
      v_code := null;  -- taken between the check and the update: try another
    end;
  end loop;

  if v_code is null then
    raise exception 'invite_code_exhausted';
  end if;

  perform public.record_rate_limit_event(v_uid, 'invite_rotate');
  return v_code;
end;
$$;

revoke execute on function public.rotate_invite_code() from public, anon;
grant execute on function public.rotate_invite_code() to authenticated;

-- ===== 04_function_privileges.sql =====

-- Supabase grants EXECUTE on every new public function to anon and
-- authenticated by default. Policies run as the caller, so the helpers they
-- use stay executable by authenticated; nobody signed out needs any of them.
revoke execute on function public.is_room_member(uuid) from public, anon;
revoke execute on function public.is_room_active(uuid) from public, anon;
revoke execute on function public.shares_room_with(uuid) from public, anon;
revoke execute on function public.follows_user(uuid) from public, anon;
revoke execute on function public.is_followed_by(uuid) from public, anon;
revoke execute on function public.can_view_session(uuid) from public, anon;
revoke execute on function public.is_blocked_with(uuid) from public, anon;
revoke execute on function public.can_report(uuid, uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_room_active(uuid) to authenticated;
grant execute on function public.shares_room_with(uuid) to authenticated;
grant execute on function public.follows_user(uuid) to authenticated;
grant execute on function public.is_followed_by(uuid) to authenticated;
grant execute on function public.can_view_session(uuid) to authenticated;
grant execute on function public.is_blocked_with(uuid) to authenticated;
grant execute on function public.can_report(uuid, uuid) to authenticated;

-- profiles_content_filter() runs as the caller and calls it.
revoke execute on function public.contains_blocked_terms(text) from public, anon;
grant execute on function public.contains_blocked_terms(text) to authenticated;

-- Only used inside other security definer functions, never by a policy.
revoke execute on function public.can_view_profile(uuid) from public, anon, authenticated;
revoke execute on function public.generate_invite_code() from public, anon, authenticated;

-- Trigger functions (never callable as RPCs, but no reason to list them).
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.room_status_transition() from public, anon, authenticated;
revoke execute on function public.finish_room_when_done() from public, anon, authenticated;
revoke execute on function public.profiles_content_filter() from public, anon, authenticated;
revoke execute on function public.content_reports_rate_limit() from public, anon, authenticated;
revoke execute on function public.app_events_throttle() from public, anon, authenticated;
