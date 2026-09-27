-- set_logs only ever exists inside a room (see its "while active" RLS
-- policies) — rename it to match the room_* naming already used by
-- room_members, so that's clear from the name alone.

alter table public.set_logs rename to room_set_logs;
alter index set_logs_room rename to room_set_logs_room;

alter policy "set_logs: members read" on public.room_set_logs
  rename to "room_set_logs: members read";
alter policy "set_logs: insert own while active" on public.room_set_logs
  rename to "room_set_logs: insert own while active";
alter policy "set_logs: update own while active" on public.room_set_logs
  rename to "room_set_logs: update own while active";
alter policy "set_logs: delete own while active" on public.room_set_logs
  rename to "room_set_logs: delete own while active";
