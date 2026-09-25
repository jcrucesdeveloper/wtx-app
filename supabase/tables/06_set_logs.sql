-- set_logs — live, completed sets inside a room.

create table public.set_logs (
  id            uuid primary key,                      -- SessionSetDraft.id, so re-sends are idempotent
  room_id       uuid not null,
  user_id       uuid not null,
  exercise_name text not null,
  set_type      text not null check (set_type in ('number', 'W', 'D')),
  weight        numeric(7, 2) not null default 0,
  reps          integer not null default 0 check (reps >= 0),  -- seconds for timed exercises
  completed_at  timestamptz not null default now(),
  foreign key (room_id, user_id) references public.room_members (room_id, user_id) on delete cascade
);

create index set_logs_room on public.set_logs (room_id);

-- RLS: members read everything in the room; you write only your own sets, only while active.
alter table public.set_logs enable row level security;
revoke all on public.set_logs from anon;

create policy "set_logs: members read" on public.set_logs
  for select to authenticated
  using (public.is_room_member(room_id));

create policy "set_logs: insert own while active" on public.set_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_room_active(room_id));

create policy "set_logs: update own while active" on public.set_logs
  for update to authenticated
  using (user_id = (select auth.uid()) and public.is_room_active(room_id))
  with check (user_id = (select auth.uid()) and public.is_room_active(room_id));

create policy "set_logs: delete own while active" on public.set_logs
  for delete to authenticated
  using (user_id = (select auth.uid()) and public.is_room_active(room_id));

alter publication supabase_realtime add table public.set_logs;
