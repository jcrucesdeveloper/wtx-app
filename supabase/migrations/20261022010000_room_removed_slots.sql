-- The exercises the host took out of a group workout, for everyone.
--
-- removed_slots lists routine slots (positions in routine_wtt) the host
-- removed. It rides on the rooms row next to exercise_order and under the
-- same order_version, so members get it live over Realtime and late joiners
-- and reconnecting clients read it with the room. exercise_order stays a full
-- permutation, so clients that don't know this column keep working.
--
-- Writes: authenticated users can only update rooms.status directly (column
-- grant), so this column is written only through set_room_plan below, which
-- checks the caller is the room's host.

alter table public.rooms add column removed_slots smallint[] not null default '{}';

alter table public.rooms
  add constraint rooms_removed_slots_length check (cardinality(removed_slots) <= 200);

-- RPC: the host sets the room's order and removed slots together (bumping the
-- version). Only the host, and only while the room is still open.
create function public.set_room_plan(p_room_id uuid, p_order smallint[], p_removed smallint[])
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

  update public.rooms
  set exercise_order = p_order,
      removed_slots = p_removed,
      order_version = order_version + 1
  where id = p_room_id and host_id = v_uid and status <> 'finished'
  returning * into v_room;

  if v_room.id is null then
    raise exception 'room_not_found';
  end if;
  return v_room;
end;
$$;

revoke execute on function public.set_room_plan(uuid, smallint[], smallint[]) from public, anon;
grant execute on function public.set_room_plan(uuid, smallint[], smallint[]) to authenticated;
