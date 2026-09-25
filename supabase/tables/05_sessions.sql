-- sessions — synced copy of the local session log (StoredSession).

create table public.sessions (
  id         uuid primary key,                         -- StoredSession.id, generated on the device
  user_id    uuid not null references public.profiles (id) on delete cascade,
  routine_id uuid,                                     -- no FK: a session may sync before its routine
  room_id    uuid references public.rooms (id) on delete set null,
  raw_text   text not null check (char_length(raw_text) <= 200000),
  created_at timestamptz not null default now(),       -- StoredSession.addedAt
  updated_at timestamptz not null default now(),
  deleted_at timestamptz                               -- tombstone so other devices see the delete
);

create index sessions_user_updated on public.sessions (user_id, updated_at);

create trigger sessions_updated_at
  before insert or update on public.sessions
  for each row execute function public.set_updated_at();

-- RLS: strictly your own rows.
alter table public.sessions enable row level security;
revoke all on public.sessions from anon;

create policy "sessions: own rows" on public.sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
