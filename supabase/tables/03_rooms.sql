-- rooms — one per group workout.

create table public.rooms (
  id           uuid primary key default gen_random_uuid(),
  code         text not null check (code ~ '^[A-HJKMNP-Z2-9]{6}$'),  -- no 0 O 1 I L
  host_id      uuid references public.profiles (id) on delete set null,
  routine_name text not null,
  routine_wtt  text not null check (char_length(routine_wtt) <= 100000),
  unit         text,
  status       text not null default 'lobby' check (status in ('lobby', 'active', 'finished')),
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz
);

-- A code only has to be unique among rooms people can still join.
create unique index rooms_open_code on public.rooms (code) where status <> 'finished';

-- Keeps status moving forward only and stamps started_at / finished_at.
create function public.room_status_transition()
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
  for each row execute function public.room_status_transition();

-- RPC: creates a room with a fresh code and the caller as host (and first member).
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

  for attempt in 1..10 loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    begin
      insert into public.rooms (code, host_id, routine_name, routine_wtt, unit)
      values (v_code, v_uid, left(p_routine_name, 120), p_routine_wtt, p_unit)
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
  return v_room;
end;
$$;

revoke execute on function public.create_room(text, text, text) from public, anon;
grant execute on function public.create_room(text, text, text) to authenticated;

-- RLS: members read; only the host moves the status. Rows are created by create_room().
alter table public.rooms enable row level security;
revoke all on public.rooms from anon;

create policy "rooms: members read" on public.rooms
  for select to authenticated
  using (public.is_room_member(id));

create policy "rooms: host updates" on public.rooms
  for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

revoke insert, update, delete on public.rooms from authenticated;
grant update (status) on public.rooms to authenticated;

alter publication supabase_realtime add table public.rooms;
