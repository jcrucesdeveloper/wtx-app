-- Group workouts: rooms → room_members → room_set_logs.
--
-- Who can read: only the room's members, for all three tables.
-- Who can write:
--   rooms           created by create_room(); the host moves the status and
--                   sets the plan (set_room_routine); nothing else.
--   room_members    created by create_room() / join_room(); you can mark
--                   yourself finished, and leave with leave_room().
--   room_set_logs   your own sets, only while the room is active.
-- All three are on Realtime, so members get every change live.
--
-- A workout outlives its host: when the host leaves or finishes, the role
-- passes to whoever joined earliest of those still working out, and a host
-- whose phone went silent for 5 minutes is replaced by a member who claims
-- the role (claim_room_host). With nobody left working out, the room ends.

-- ===== rooms =====

create table public.rooms (
  id              uuid primary key default gen_random_uuid(),
  code            text not null check (code ~ '^[A-HJKMNP-Z2-9]{6}$'),  -- no 0 O 1 I L
  host_id         uuid references public.profiles (id) on delete set null,
  routine_name    text not null,
  routine_wtt     text not null check (char_length(routine_wtt) <= 100000),
  unit            text,
  status          text not null default 'lobby' check (status in ('lobby', 'active', 'finished')),
  created_at      timestamptz not null default now(),
  started_at      timestamptz,
  finished_at     timestamptz,

  -- The host's live plan, written only by set_room_routine() and bumped
  -- together under order_version (it only goes up, so a client that sees an
  -- older version than it holds ignores it). Slots are positions in
  -- routine_wtt; added exercises take the slots after the written routine's.
  -- The server can't parse routine_wtt, so it only bounds these; clients
  -- normalize them against the routine they hold.
  exercise_order  smallint[],                          -- a permutation of the slots; null = as written
  order_version   integer not null default 0,
  removed_slots   smallint[] not null default '{}',    -- slots the host took out
  added_exercises text[] not null default '{}',        -- exercises the host added, by name
  swapped_slots   jsonb not null default '{}',         -- slot (as text) → movement swapped in
  focus_slot      smallint,                            -- the slot the host is on; members follow it

  constraint rooms_routine_name_length check (char_length(routine_name) <= 120),
  constraint rooms_unit_length check (char_length(unit) <= 16),
  constraint rooms_exercise_order_length check (cardinality(exercise_order) <= 200),
  constraint rooms_removed_slots_length check (cardinality(removed_slots) <= 200),
  constraint rooms_added_exercises_length check (cardinality(added_exercises) <= 100),
  constraint rooms_swapped_slots_shape
    check (jsonb_typeof(swapped_slots) = 'object' and octet_length(swapped_slots::text) <= 32768),
  constraint rooms_focus_slot_range check (focus_slot is null or (focus_slot >= 0 and focus_slot < 400))
);

-- A code only has to be unique among rooms people can still join.
create unique index rooms_open_code on public.rooms (code) where status <> 'finished';
-- For the stale-room sweep at the end of this file.
create index rooms_open_created_at on public.rooms (created_at) where status <> 'finished';
-- Foreign key: deleting an account looks up the rooms it hosted.
create index rooms_host on public.rooms (host_id);

-- Keeps status moving forward only and stamps started_at / finished_at.
create function private.room_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if (old.status = 'lobby' and new.status in ('active', 'finished'))
     or (old.status = 'active' and new.status = 'finished') then
    if new.status = 'active' then
      new.started_at := coalesce(new.started_at, now());
    end if;
    if new.status = 'finished' then
      new.finished_at := coalesce(new.finished_at, now());
    end if;
    return new;
  end if;
  raise exception 'invalid room status change: % -> %', old.status, new.status;
end;
$$;

create trigger rooms_status_transition
  before update of status on public.rooms
  for each row execute function private.room_status_transition();

revoke execute on function private.room_status_transition() from public, anon, authenticated;

alter table public.rooms enable row level security;
revoke all on public.rooms from anon;

create policy "rooms: members read" on public.rooms
  for select to authenticated
  using (private.is_room_member(id));

create policy "rooms: host updates" on public.rooms
  for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

revoke insert, update, delete on public.rooms from authenticated;
grant update (status) on public.rooms to authenticated;

alter publication supabase_realtime add table public.rooms;

-- ===== room_members =====

create table public.room_members (
  room_id     uuid not null references public.rooms (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  finished_at timestamptz,
  -- Left a running room: the row (and the sets hanging off it) stays for the
  -- recap; they just aren't in the workout any more. Rejoining clears it.
  left_at     timestamptz,
  primary key (room_id, user_id)
);

create index room_members_user on public.room_members (user_id);

-- Closes the room once every member has finished their workout or left.
-- Training together counts as introducing yourselves: every pair of members
-- then follows each other, unless either has blocked the other.
create function private.finish_room_when_done()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.finished_at is not null or new.left_at is not null) and not exists (
    select 1 from public.room_members
    where room_id = new.room_id and finished_at is null and left_at is null
  ) then
    update public.rooms set status = 'finished'
    where id = new.room_id and status = 'active';

    if found then
      insert into public.follows (follower_id, followee_id)
      select a.user_id, b.user_id
      from public.room_members a
      join public.room_members b on b.room_id = a.room_id and b.user_id <> a.user_id
      where a.room_id = new.room_id
        and not private.is_blocked_between(a.user_id, b.user_id)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger room_members_finish_room
  after update of finished_at, left_at on public.room_members
  for each row execute function private.finish_room_when_done();

revoke execute on function private.finish_room_when_done() from public, anon, authenticated;

-- When the host was last seen (room_host_beat). Written and read only by the
-- functions here, and outside the Realtime publication, so a heartbeat
-- doesn't wake every member's app.
create table private.room_host_beats (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  seen_at timestamptz not null default now()
);

alter table private.room_host_beats enable row level security;
revoke all on private.room_host_beats from public, anon, authenticated;

-- Makes sure an open room's host is someone still working out in it: else
-- the role goes to whoever joined earliest of those who are, and with nobody
-- left the room ends. Runs under a row lock on the room, so two people
-- leaving at once can never leave two hosts — or a host who has gone.
create function private.pass_room_host(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_next uuid;
begin
  -- The lock: every handoff of this room waits for the one before it, then
  -- reads the host it left behind.
  select * into v_room from public.rooms where id = p_room_id for update;
  if v_room.id is null or v_room.status = 'finished' then
    return;
  end if;

  if v_room.host_id is not null and exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = v_room.host_id
      and left_at is null and finished_at is null
  ) then
    return;
  end if;

  select user_id into v_next
  from public.room_members
  where room_id = p_room_id and left_at is null and finished_at is null
  order by joined_at, user_id
  limit 1;

  if v_next is null then
    -- Nobody left to work out with: the room is over.
    update public.rooms set status = 'finished' where id = p_room_id;
    return;
  end if;

  update public.rooms set host_id = v_next where id = p_room_id;
  -- The new host's grace period starts now.
  insert into private.room_host_beats (room_id, seen_at) values (p_room_id, now())
  on conflict (room_id) do update set seen_at = excluded.seen_at;
end;
$$;

create function private.room_members_pass_host()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.pass_room_host(old.room_id);
    return old;
  end if;
  if (new.finished_at is not null and old.finished_at is null)
     or (new.left_at is not null and old.left_at is null) then
    perform private.pass_room_host(new.room_id);
  end if;
  return new;
end;
$$;

-- Fires after room_members_finish_room (triggers run in name order): a room
-- that just finished needs no host.
create trigger room_members_pass_host
  after update of finished_at, left_at or delete on public.room_members
  for each row execute function private.room_members_pass_host();

revoke execute on function private.pass_room_host(uuid) from public, anon, authenticated;
revoke execute on function private.room_members_pass_host() from public, anon, authenticated;

alter table public.room_members enable row level security;
revoke all on public.room_members from anon;

create policy "room_members: members read" on public.room_members
  for select to authenticated
  using (private.is_room_member(room_id));

create policy "room_members: update self" on public.room_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert, update on public.room_members from authenticated;
grant update (finished_at) on public.room_members to authenticated;

alter publication supabase_realtime add table public.room_members;

-- ===== room_set_logs =====

-- Completed sets inside a room, sent live as members train.
create table public.room_set_logs (
  id            uuid primary key,                      -- SessionSetDraft.id, so re-sends are idempotent
  room_id       uuid not null,
  user_id       uuid not null,
  exercise_name text not null,
  set_type      text not null check (set_type in ('number', 'W', 'D')),
  weight        numeric(7, 2) not null default 0,
  reps          integer not null default 0 check (reps >= 0),  -- seconds for timed exercises
  completed_at  timestamptz not null default now(),
  foreign key (room_id, user_id) references public.room_members (room_id, user_id) on delete cascade,
  constraint room_set_logs_exercise_name_length check (char_length(exercise_name) <= 200)
);

-- Covers the (room_id, user_id) foreign key, reads by room and the set limit below.
create index room_set_logs_room_user on public.room_set_logs (room_id, user_id);

-- At most 500 sets per person per room (a long workout logs ~40), so a
-- member can't flood the table — or everyone's screens over Realtime.
-- Only app requests are limited (auth.uid() set), never a migration.
create function private.room_set_logs_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    select count(*) from public.room_set_logs
    where room_id = new.room_id and user_id = new.user_id
  ) >= 500 then
    raise exception 'room_set_limit' using hint = 'Too many sets logged in this room.';
  end if;
  return new;
end;
$$;

create trigger room_set_logs_limit
  before insert on public.room_set_logs
  for each row execute function private.room_set_logs_limit();

revoke execute on function private.room_set_logs_limit() from public, anon, authenticated;

alter table public.room_set_logs enable row level security;
revoke all on public.room_set_logs from anon;

create policy "room_set_logs: members read" on public.room_set_logs
  for select to authenticated
  using (private.is_room_member(room_id));

create policy "room_set_logs: insert own while active" on public.room_set_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_room_active(room_id));

create policy "room_set_logs: update own while active" on public.room_set_logs
  for update to authenticated
  using (user_id = (select auth.uid()) and private.is_room_active(room_id))
  with check (user_id = (select auth.uid()) and private.is_room_active(room_id));

create policy "room_set_logs: delete own while active" on public.room_set_logs
  for delete to authenticated
  using (user_id = (select auth.uid()) and private.is_room_active(room_id));

alter publication supabase_realtime add table public.room_set_logs;

-- ===== RPCs =====

-- Creates a room with a fresh code and the caller as host (and first member).
create function public.create_room(p_routine_wtt text, p_routine_name text, p_unit text default null)
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

  perform private.enforce_rate_limit(v_uid, 'room_create', 20, interval '1 hour');

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
  perform private.record_rate_limit_event(v_uid, 'room_create');
  return v_room;
end;
$$;

-- Joins an open room by its code (max 8 people). Joining twice is a no-op,
-- and someone who left comes back into the workout. An unknown code returns
-- an all-null row (see 03_rate_limits).
create function public.join_room(p_code text)
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

  perform private.enforce_rate_limit(v_uid, 'room_code_miss', 10, interval '10 minutes');

  select * into v_room
  from public.rooms
  where code = upper(regexp_replace(p_code, '\s', '', 'g')) and status <> 'finished'
  for update;

  if v_room.id is null then
    perform private.record_rate_limit_event(v_uid, 'room_code_miss');
    return null;
  end if;

  if exists (select 1 from public.room_members where room_id = v_room.id and user_id = v_uid) then
    update public.room_members set left_at = null
    where room_id = v_room.id and user_id = v_uid and left_at is not null;
    return v_room;
  end if;

  if (select count(*) from public.room_members where room_id = v_room.id) >= 8 then
    raise exception 'room_full';
  end if;

  perform private.enforce_rate_limit(v_uid, 'room_join', 30, interval '1 hour');

  insert into public.room_members (room_id, user_id) values (v_room.id, v_uid);
  perform private.record_rate_limit_event(v_uid, 'room_join');
  return v_room;
end;
$$;

-- The host sets the room's whole plan — order, removed slots, added
-- exercises, swaps and focus — together, bumping the version. Only the host,
-- and only while the room is still open.
create function public.set_room_routine(
  p_room_id uuid,
  p_order smallint[],
  p_removed smallint[],
  p_added text[],
  p_swaps jsonb,
  p_focus smallint
)
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

  if p_order is null
     or cardinality(p_order) > 200
     or exists (select 1 from unnest(p_order) s where s is null or s < 0)
     or (select count(distinct s) from unnest(p_order) s) <> cardinality(p_order) then
    raise exception 'invalid_order';
  end if;

  if p_removed is null
     or cardinality(p_removed) > 200
     or exists (select 1 from unnest(p_removed) s where s is null or s < 0)
     or (select count(distinct s) from unnest(p_removed) s) <> cardinality(p_removed) then
    raise exception 'invalid_order';
  end if;

  if p_added is null
     or cardinality(p_added) > 100
     or exists (select 1 from unnest(p_added) n where n is null or char_length(btrim(n)) = 0 or char_length(n) > 200) then
    raise exception 'invalid_order';
  end if;

  if p_swaps is null
     or jsonb_typeof(p_swaps) <> 'object'
     or octet_length(p_swaps::text) > 32768
     or exists (
       select 1 from jsonb_each(p_swaps) e
       where e.key !~ '^(0|[1-9][0-9]{0,2})$'
          or jsonb_typeof(e.value) <> 'string'
          or char_length(btrim(e.value #>> '{}')) = 0
          or char_length(e.value #>> '{}') > 200
     ) then
    raise exception 'invalid_order';
  end if;

  if p_focus is not null and (p_focus < 0 or p_focus >= 400) then
    raise exception 'invalid_order';
  end if;

  update public.rooms
  set exercise_order = p_order,
      removed_slots = p_removed,
      added_exercises = p_added,
      swapped_slots = p_swaps,
      focus_slot = p_focus,
      order_version = order_version + 1
  where id = p_room_id and host_id = v_uid and status <> 'finished'
  returning * into v_room;

  if v_room.id is null then
    raise exception 'room_not_found';
  end if;
  return v_room;
end;
$$;

-- Leaves a room: the one way to leave. Before it starts the membership goes;
-- once it's running the member is marked as left, keeping their sets in the
-- recap. Either way room_members_pass_host passes the host role on if it was
-- theirs.
create function public.leave_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select status into v_status from public.rooms where id = p_room_id;
  if v_status is null or not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = v_uid
  ) then
    raise exception 'room_not_found';
  end if;

  if v_status = 'lobby' then
    delete from public.room_members where room_id = p_room_id and user_id = v_uid;
  elsif v_status = 'active' then
    update public.room_members set left_at = now()
    where room_id = p_room_id and user_id = v_uid and left_at is null;
  end if;
end;
$$;

-- The host's app says it's still here (every 30 s while open).
create function public.room_host_beat(p_room_id uuid)
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
  if not exists (
    select 1 from public.rooms
    where id = p_room_id and host_id = v_uid and status <> 'finished'
  ) then
    return;
  end if;
  insert into private.room_host_beats (room_id, seen_at) values (p_room_id, now())
  on conflict (room_id) do update set seen_at = excluded.seen_at;
end;
$$;

-- A member still working out takes over from a host who has been silent for
-- 5 minutes (longer than a heavy set's rest, so a host resting with the
-- screen off keeps the role) or is no longer working out. The first claim
-- wins; the ones after it find a host seen just now and get `host_present`.
create function public.claim_room_host(p_room_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_room public.rooms;
  v_seen timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_room from public.rooms where id = p_room_id for update;
  if v_room.id is null or v_room.status = 'finished' or not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = v_uid and left_at is null and finished_at is null
  ) then
    raise exception 'room_not_found';
  end if;

  if v_room.host_id = v_uid then
    return v_room;
  end if;

  if v_room.host_id is not null and exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = v_room.host_id
      and left_at is null and finished_at is null
  ) then
    select seen_at into v_seen from private.room_host_beats where room_id = p_room_id;
    if coalesce(v_seen, v_room.started_at, v_room.created_at) > now() - interval '5 minutes' then
      raise exception 'host_present';
    end if;
  end if;

  update public.rooms set host_id = v_uid where id = p_room_id returning * into v_room;
  insert into private.room_host_beats (room_id, seen_at) values (p_room_id, now())
  on conflict (room_id) do update set seen_at = excluded.seen_at;
  return v_room;
end;
$$;

revoke execute on function public.create_room(text, text, text) from public, anon;
grant execute on function public.create_room(text, text, text) to authenticated;
revoke execute on function public.join_room(text) from public, anon;
grant execute on function public.join_room(text) to authenticated;
revoke execute on function public.set_room_routine(uuid, smallint[], smallint[], text[], jsonb, smallint) from public, anon;
grant execute on function public.set_room_routine(uuid, smallint[], smallint[], text[], jsonb, smallint) to authenticated;
revoke execute on function public.leave_room(uuid) from public, anon;
grant execute on function public.leave_room(uuid) to authenticated;
revoke execute on function public.room_host_beat(uuid) from public, anon;
grant execute on function public.room_host_beat(uuid) to authenticated;
revoke execute on function public.claim_room_host(uuid) from public, anon;
grant execute on function public.claim_room_host(uuid) to authenticated;

-- ===== The room's live channel =====

-- Each room has one private Realtime channel, `room:<room id>`, carrying
-- presence (who's online) and broadcasts (cheers, live PRs) — neither of
-- which goes through a table, so the table policies above don't cover them.
-- Realtime checks these policies on realtime.messages when someone joins a
-- private channel: only the room's members may listen (select) or send and
-- track presence (insert). Row changes on the channel still follow the table
-- policies.

-- The room id in a `room:<uuid>` topic, or null for any other topic.
create function private.room_topic_id(p_topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_topic ~ '^room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then substr(p_topic, 6)::uuid
  end
$$;

revoke execute on function private.room_topic_id(text) from public, anon, authenticated;
grant execute on function private.room_topic_id(text) to authenticated;

create policy "room channels: members listen" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and private.is_room_member(private.room_topic_id((select realtime.topic())))
  );

create policy "room channels: members send" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and private.is_room_member(private.room_topic_id((select realtime.topic())))
  );

-- ===== Stale rooms =====

-- Closes rooms nobody finished or closed, so an abandoned room doesn't keep
-- its code reserved forever. 'finished' is a valid move from both 'lobby' and
-- 'active' (room_status_transition), which stamps finished_at.
select cron.schedule(
  'expire_stale_rooms',
  '*/15 * * * *',
  $$
    update public.rooms
    set status = 'finished'
    where status <> 'finished'
      and created_at < now() - interval '7 hours'
  $$
);
