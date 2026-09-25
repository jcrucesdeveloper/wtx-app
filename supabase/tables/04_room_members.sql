-- room_members — who is in each room.

create table public.room_members (
  room_id     uuid not null references public.rooms (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  finished_at timestamptz,
  primary key (room_id, user_id)
);

create index room_members_user on public.room_members (user_id);

-- Closes the room once every member has finished their workout.
create function public.finish_room_when_done()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.finished_at is not null and not exists (
    select 1 from public.room_members
    where room_id = new.room_id and finished_at is null
  ) then
    update public.rooms set status = 'finished'
    where id = new.room_id and status = 'active';
  end if;
  return new;
end;
$$;

create trigger room_members_finish_room
  after update of finished_at on public.room_members
  for each row execute function public.finish_room_when_done();

-- RPC: joins an open room by its code (joining twice is a no-op; max 8 people).
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

  select * into v_room
  from public.rooms
  where code = upper(regexp_replace(p_code, '\s', '', 'g')) and status <> 'finished'
  for update;

  if v_room.id is null then
    raise exception 'room_not_found';
  end if;

  if exists (select 1 from public.room_members where room_id = v_room.id and user_id = v_uid) then
    return v_room;
  end if;

  if (select count(*) from public.room_members where room_id = v_room.id) >= 8 then
    raise exception 'room_full';
  end if;

  insert into public.room_members (room_id, user_id) values (v_room.id, v_uid);
  return v_room;
end;
$$;

revoke execute on function public.join_room(text) from public, anon;
grant execute on function public.join_room(text) to authenticated;

-- RLS: members see each other; you can mark yourself finished or leave.
-- Rows are created by create_room() / join_room().
alter table public.room_members enable row level security;
revoke all on public.room_members from anon;

create policy "room_members: members read" on public.room_members
  for select to authenticated
  using (public.is_room_member(room_id));

create policy "room_members: update self" on public.room_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "room_members: leave" on public.room_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update on public.room_members from authenticated;
grant update (finished_at) on public.room_members to authenticated;

alter publication supabase_realtime add table public.room_members;
