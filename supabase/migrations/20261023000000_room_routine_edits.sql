-- The host's live edits to a group workout's routine, and where the host is.
--
-- added_exercises lists the exercises the host added mid-workout, by name;
-- each takes the next slot after the written routine's (the first one added
-- is slot cardinality-of-routine), so exercise_order and removed_slots can
-- refer to them like any routine slot. swapped_slots maps a slot (as text)
-- to the movement the host swapped into it. focus_slot is the slot the host
-- is on right now; members' screens follow it.
--
-- All three ride on the rooms row next to exercise_order and under the same
-- order_version, so members get them live over Realtime and late joiners and
-- reconnecting clients read them with the room. Clients that don't know
-- these columns keep working: exercise_order and removed_slots mean what
-- they meant, and slots they can't resolve are ignored.
--
-- Writes: authenticated users can only update rooms.status directly (column
-- grant), so these columns are written only through set_room_routine below,
-- which checks the caller is the room's host.

alter table public.rooms add column added_exercises text[] not null default '{}';
alter table public.rooms add column swapped_slots jsonb not null default '{}';
alter table public.rooms add column focus_slot smallint;

alter table public.rooms
  add constraint rooms_added_exercises_length check (cardinality(added_exercises) <= 100);
alter table public.rooms
  add constraint rooms_swapped_slots_shape
  check (jsonb_typeof(swapped_slots) = 'object' and octet_length(swapped_slots::text) <= 32768);
alter table public.rooms
  add constraint rooms_focus_slot_range check (focus_slot is null or (focus_slot >= 0 and focus_slot < 400));

-- RPC: the host sets the room's whole plan — order, removed slots, added
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

revoke execute on function public.set_room_routine(uuid, smallint[], smallint[], text[], jsonb, smallint) from public, anon;
grant execute on function public.set_room_routine(uuid, smallint[], smallint[], text[], jsonb, smallint) to authenticated;
