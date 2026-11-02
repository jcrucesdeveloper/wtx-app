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
  for each row execute function private.set_updated_at();

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
  for each row execute function private.set_updated_at();

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
-- Foreign key: deleting a room clears its sessions' room_id.
create index sessions_room on public.sessions (room_id) where room_id is not null;

create trigger sessions_updated_at
  before insert or update on public.sessions
  for each row execute function private.set_updated_at();

alter table public.sessions enable row level security;
revoke all on public.sessions from anon;

create policy "sessions: own rows" on public.sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "sessions: followers read shared" on public.sessions
  for select to authenticated
  using (shared and deleted_at is null and private.follows_user(user_id));

-- ===== Storage budget =====

-- Each account may keep up to 50 MB of synced data across these three
-- tables (a heavy user logs well under 10 MB in a decade). Without a cap, one
-- script with one account could fill the database: rows are up to 100–200 KB
-- each and any number of them can be upserted. A write that would go over
-- fails with `storage_quota_exceeded`; deleting rows frees the space again.
--
-- account_usage keeps a running total per account, so the check costs one
-- row update instead of summing every row the account has.
create table private.account_usage (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  bytes   bigint not null default 0
);

alter table private.account_usage enable row level security;
revoke all on private.account_usage from public, anon, authenticated;

-- A row's size is its JSON text, the same measure for all three tables.
-- user_id can't change (the "own rows" policies pin it to the caller).
create function private.track_account_usage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit constant bigint := 50 * 1024 * 1024;
  v_old   bigint := 0;
  v_new   bigint := 0;
  v_total bigint;
begin
  if tg_op <> 'INSERT' then
    v_old := octet_length(to_jsonb(old)::text);
  end if;
  if tg_op <> 'DELETE' then
    v_new := octet_length(to_jsonb(new)::text);
  end if;

  if tg_op = 'DELETE' then
    update private.account_usage set bytes = greatest(bytes - v_old, 0) where user_id = old.user_id;
    return null;
  end if;

  if tg_op = 'INSERT' then
    insert into private.account_usage as u (user_id, bytes) values (new.user_id, v_new)
    on conflict (user_id) do update set bytes = u.bytes + v_new
    returning u.bytes into v_total;
  else
    -- Only an update, never an insert: when the account is being deleted, a
    -- cascade can update its rows after its usage row (and profile) are gone.
    update private.account_usage set bytes = greatest(bytes + v_new - v_old, 0)
    where user_id = new.user_id
    returning bytes into v_total;
  end if;

  if v_new > v_old and v_total > v_limit then
    raise exception 'storage_quota_exceeded' using hint = 'This account has reached its storage limit.';
  end if;
  return null;
end;
$$;

revoke execute on function private.track_account_usage() from public, anon, authenticated;

create trigger routine_sections_account_usage
  after insert or update or delete on public.routine_sections
  for each row execute function private.track_account_usage();

create trigger routines_account_usage
  after insert or update or delete on public.routines
  for each row execute function private.track_account_usage();

create trigger sessions_account_usage
  after insert or update or delete on public.sessions
  for each row execute function private.track_account_usage();
