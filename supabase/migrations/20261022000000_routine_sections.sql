-- Routine sections: user-made groups of routines on the Train screen
-- ("Push/Pull/Legs", "Deload week"…), synced like the library itself so an
-- account shows the same layout on every device.
--
-- Same shape and sync contract as public.routines: rows are generated on the
-- device (uuid keys), the whole list is upserted with its `position`, and a
-- delete is a `deleted_at` tombstone so other devices see it.

-- routine_sections — synced copy of the local sections (RoutineSection).

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

-- RLS: strictly your own rows.
alter table public.routine_sections enable row level security;
revoke all on public.routine_sections from anon;

create policy "routine_sections: own rows" on public.routine_sections
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- routines.section_id — the section a routine is filed under (null = unsorted).
--
-- The foreign key includes user_id, so a routine can only be filed under a
-- section of the same account. Sections are tombstoned rather than deleted,
-- so the `set null` only fires when the account itself goes; it clears just
-- section_id, never the routine's owner.
--
-- Older app versions upsert routines without this column; PostgREST only
-- updates the columns a request sends, so they leave it untouched.

alter table public.routines add column section_id uuid;

alter table public.routines
  add constraint routines_section_fkey
  foreign key (section_id, user_id) references public.routine_sections (id, user_id)
  on delete set null (section_id);

create index routines_section on public.routines (section_id) where section_id is not null;
