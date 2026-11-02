-- Your own synced data: routine_sections, routines and sessions — the cloud
-- copy of the local library and session log, so an account looks the same
-- on every device.
--
-- Who can read and write: only the owner. One exception: followers can read
-- the sessions their owner chose to share (the feed).
--
-- Sync contract, the same for all three: rows are generated on the device
-- (uuid keys), upserted with their `position`, a delete is a `deleted_at`
-- tombstone so other devices see it, and `updated_at` is set by the server
-- (set_updated_at) so it can serve as the "changed since" cursor.

-- ===== routine_sections =====

-- User-made groups of routines on the Train screen ("Push/Pull/Legs").
create table public.routine_sections (
  id         uuid primary key,                          -- RoutineSection.id, generated on the device
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  color      text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  position   integer not null default 0,               -- display order (0 = top)
  created_at timestamptz not null default now(),        -- RoutineSection.addedAt
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,                               -- tombstone so other devices see the delete
  -- Lets routines reference a section together with its owner (below).
  unique (id, user_id)
);

create index routine_sections_user_updated on public.routine_sections (user_id, updated_at);

create trigger routine_sections_updated_at
  before insert or update on public.routine_sections
  for each row execute function public.set_updated_at();

alter table public.routine_sections enable row level security;
revoke all on public.routine_sections from anon;

create policy "routine_sections: own rows" on public.routine_sections
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ===== routines =====

create table public.routines (
  id         uuid primary key,                         -- StoredRoutine.id, generated on the device
  user_id    uuid not null references public.profiles (id) on delete cascade,
  -- The section it's filed under (null = unsorted). The foreign key includes
  -- user_id, so a routine can only be filed under a section of the same
  -- account. Sections are tombstoned, not deleted, so the `set null` only
  -- fires when the account itself goes; it clears just section_id.
  section_id uuid,
  filename   text not null,
  raw_text   text not null check (char_length(raw_text) <= 100000),
  position   integer not null default 0,              -- display order (0 = top)
  created_at timestamptz not null default now(),       -- StoredRoutine.addedAt
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,                              -- tombstone so other devices see the delete
  constraint routines_filename_length check (char_length(filename) <= 255),
  constraint routines_section_fkey
    foreign key (section_id, user_id) references public.routine_sections (id, user_id)
    on delete set null (section_id)
);

create index routines_user_updated on public.routines (user_id, updated_at);
create index routines_section on public.routines (section_id) where section_id is not null;

create trigger routines_updated_at
  before insert or update on public.routines
  for each row execute function public.set_updated_at();

alter table public.routines enable row level security;
revoke all on public.routines from anon;

create policy "routines: own rows" on public.routines
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ===== sessions =====

create table public.sessions (
  id            uuid primary key,                      -- StoredSession.id, generated on the device
  user_id       uuid not null references public.profiles (id) on delete cascade,
  routine_id    uuid,                                  -- no FK: a session may sync before its routine
  room_id       uuid references public.rooms (id) on delete set null,
  raw_text      text not null check (char_length(raw_text) <= 200000),
  -- A session becomes a feed post when its owner opts in at finish time.
  -- feed_snapshot is that finish's recap (personal records, comparison to
  -- last time, streak, milestone), computed once on the device: a follower
  -- can't read the owner's private history to recompute it.
  shared        boolean not null default false,
  feed_snapshot jsonb,
  created_at    timestamptz not null default now(),    -- StoredSession.addedAt
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,                           -- tombstone so other devices see the delete
  -- The text form, not pg_column_size(): the stored size depends on TOAST
  -- compression, so a highly repetitive payload could be far larger than it looks.
  constraint sessions_feed_snapshot_size check (octet_length(feed_snapshot::text) <= 65536)
);

create index sessions_user_updated on public.sessions (user_id, updated_at);
create index sessions_shared_feed on public.sessions (user_id, created_at desc)
  where shared and deleted_at is null;

create trigger sessions_updated_at
  before insert or update on public.sessions
  for each row execute function public.set_updated_at();

alter table public.sessions enable row level security;
revoke all on public.sessions from anon;

create policy "sessions: own rows" on public.sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "sessions: followers read shared" on public.sessions
  for select to authenticated
  using (shared and deleted_at is null and public.follows_user(user_id));
