-- The order a group workout follows, owned by the host.
--
-- exercise_order is a permutation of the room routine's exercise slots (their
-- positions in routine_wtt); null means the routine as written. order_version
-- only goes up, so a client that sees an older version than it holds ignores
-- it. Both ride on the rooms row, which members already read and receive over
-- Realtime, so late joiners and reconnecting clients get the latest order.
--
-- The server can't parse routine_wtt, so it only bounds the array; clients
-- normalize it against the routine they hold.

alter table public.rooms add column exercise_order smallint[];
alter table public.rooms add column order_version integer not null default 0;

alter table public.rooms
  add constraint rooms_exercise_order_length check (cardinality(exercise_order) <= 200);

-- RPC: the host sets the room's order (bumping its version). Only the host,
-- and only while the room is still open.
create function public.set_room_exercise_order(p_room_id uuid, p_order smallint[])
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

  update public.rooms
  set exercise_order = p_order,
      order_version = order_version + 1
  where id = p_room_id and host_id = v_uid and status <> 'finished'
  returning * into v_room;

  if v_room.id is null then
    raise exception 'room_not_found';
  end if;
  return v_room;
end;
$$;

revoke execute on function public.set_room_exercise_order(uuid, smallint[]) from public, anon;
grant execute on function public.set_room_exercise_order(uuid, smallint[]) to authenticated;
