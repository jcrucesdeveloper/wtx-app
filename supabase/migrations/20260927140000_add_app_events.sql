-- app_events — minimal product analytics, reusing the same project as sync
-- and rooms instead of a new vendor. Answers "does anyone use Sessions? Rooms?
-- Do people ever create an account?" without collecting anything identifying.
--
-- Written, never read, by the client: insert-only, no select policy at all —
-- rows are only ever read from the dashboard (or with the service key), never
-- exposed back to other users through the API.

create table public.app_events (
  id          bigint generated always as identity primary key,
  event       text not null check (event in (
                'app_opened', 'account_created', 'routine_created',
                'session_finished', 'room_created', 'room_joined'
              )),
  user_id     uuid references public.profiles (id) on delete set null,
  platform    text,
  app_version text,
  created_at  timestamptz not null default now()
);

create index app_events_event_created on public.app_events (event, created_at);

-- RLS: anyone (including anon, so purely local users are counted too) can
-- insert their own event; nobody can read, update, or delete through the API.
alter table public.app_events enable row level security;
revoke all on public.app_events from anon, authenticated;
grant insert on public.app_events to anon, authenticated;

create policy "app_events: insert" on public.app_events
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
