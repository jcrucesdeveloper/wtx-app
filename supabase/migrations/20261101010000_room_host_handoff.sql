-- A group workout outlives its host.
--
--   00 room_members.left_at: someone who left a running room. Their row (and
--      the sets hanging off it) stays for the recap; they just aren't in the
--      workout any more.
--   01 pass_room_host(): when the host leaves or finishes, the host role goes
--      to whoever joined earliest of the members still working out; with
--      nobody left, the room ends. Runs from a trigger on room_members, under
--      a row lock on the room, so two people leaving at once can never leave
--      two hosts — or a host who has gone.
--   02 leave_room(): the one way to leave, lobby or not.
--   03 Host heartbeats and claim_room_host(): a host whose phone died is
--      replaced by a member once they've been silent for 5 minutes (longer
--      than a heavy set's rest, so a host who's just resting with the screen
--      off keeps the role). Heartbeats live in their own table, outside the
--      Realtime publication, so they don't wake every member's app.
--   04 finish_room_when_done(): a member who left counts as done.
--   05 join_room(): rejoining with the code undoes a leave.
--
-- Idempotent: safe to run again.

-- ===== 00_left_at.sql =====

alter table public.room_members add column if not exists left_at timestamptz;

-- ===== 01_pass_room_host.sql =====

-- Makes sure an open room's host is someone still working out in it. Only
-- ever called from triggers / other security definer functions.
create or replace function public.pass_room_host(p_room_id uuid)
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
  insert into public.room_host_beats (room_id, seen_at) values (p_room_id, now())
  on conflict (room_id) do update set seen_at = excluded.seen_at;
end;
$$;

create or replace function public.room_members_pass_host()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.pass_room_host(old.room_id);
    return old;
  end if;
  if (new.finished_at is not null and old.finished_at is null)
     or (new.left_at is not null and old.left_at is null) then
    perform public.pass_room_host(new.room_id);
  end if;
  return new;
end;
$$;

-- Named to fire after room_members_finish_room (triggers run in name order):
-- a room that just finished needs no host.
drop trigger if exists room_members_pass_host on public.room_members;
create trigger room_members_pass_host
  after update of finished_at, left_at or delete on public.room_members
  for each row execute function public.room_members_pass_host();

-- ===== 02_leave_room.sql =====

-- Leaves a room. Before it starts the membership goes; once it's running the
-- member is marked as left, keeping their sets in the recap. Either way the
-- trigger above passes the host role on if it was theirs.
create or replace function public.leave_room(p_room_id uuid)
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

revoke execute on function public.leave_room(uuid) from public, anon;
grant execute on function public.leave_room(uuid) to authenticated;

-- ===== 03_host_heartbeat.sql =====

-- When the host was last seen. Written and read only by the functions below.
create table if not exists public.room_host_beats (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  seen_at timestamptz not null default now()
);

alter table public.room_host_beats enable row level security;
revoke all on public.room_host_beats from anon, authenticated;

-- The host's app says it's still here (every 30 s while open).
create or replace function public.room_host_beat(p_room_id uuid)
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
  insert into public.room_host_beats (room_id, seen_at) values (p_room_id, now())
  on conflict (room_id) do update set seen_at = excluded.seen_at;
end;
$$;

revoke execute on function public.room_host_beat(uuid) from public, anon;
grant execute on function public.room_host_beat(uuid) to authenticated;

-- A member still working out takes over from a host who has been silent for
-- 5 minutes (or is no longer working out). The first claim wins; the ones
-- after it find a host seen just now and get `host_present`.
create or replace function public.claim_room_host(p_room_id uuid)
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
    select seen_at into v_seen from public.room_host_beats where room_id = p_room_id;
    if coalesce(v_seen, v_room.started_at, v_room.created_at) > now() - interval '5 minutes' then
      raise exception 'host_present';
    end if;
  end if;

  update public.rooms set host_id = v_uid where id = p_room_id returning * into v_room;
  insert into public.room_host_beats (room_id, seen_at) values (p_room_id, now())
  on conflict (room_id) do update set seen_at = excluded.seen_at;
  return v_room;
end;
$$;

revoke execute on function public.claim_room_host(uuid) from public, anon;
grant execute on function public.claim_room_host(uuid) to authenticated;

-- ===== 04_finish_room_when_done.sql =====

-- Same as 20260930000000_moderation.sql, but a member who left counts as done.
create or replace function public.finish_room_when_done()
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
        and not public.is_blocked_between(a.user_id, b.user_id)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

-- Was "after update of finished_at"; leaving can be the last move now too.
drop trigger if exists room_members_finish_room on public.room_members;
create trigger room_members_finish_room
  after update of finished_at, left_at on public.room_members
  for each row execute function public.finish_room_when_done();

-- ===== 05_join_room.sql =====

-- Same as 20261001000000_abuse_hardening.sql, but someone who left and comes
-- back with the code is back in the workout.
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
    update public.room_members set left_at = null
    where room_id = v_room.id and user_id = v_uid and left_at is not null;
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

-- Internal helpers and trigger functions: never callable as RPCs.
revoke execute on function public.pass_room_host(uuid) from public, anon, authenticated;
revoke execute on function public.room_members_pass_host() from public, anon, authenticated;
revoke execute on function public.finish_room_when_done() from public, anon, authenticated;
