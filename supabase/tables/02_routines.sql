-- routines — synced copy of the local library (StoredRoutine).

create table public.routines (
  id         uuid primary key,                         -- StoredRoutine.id, generated on the device
  user_id    uuid not null references public.profiles (id) on delete cascade,
  filename   text not null,
  raw_text   text not null check (char_length(raw_text) <= 100000),
  position   integer not null default 0,              -- display order (0 = top)
  created_at timestamptz not null default now(),       -- StoredRoutine.addedAt
  updated_at timestamptz not null default now(),
  deleted_at timestamptz                               -- tombstone so other devices see the delete
);

create index routines_user_updated on public.routines (user_id, updated_at);

create trigger routines_updated_at
  before insert or update on public.routines
  for each row execute function public.set_updated_at();

-- RLS: strictly your own rows.
alter table public.routines enable row level security;
revoke all on public.routines from anon;

create policy "routines: own rows" on public.routines
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
