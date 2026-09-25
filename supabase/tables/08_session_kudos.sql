-- session_kudos — a one-tap "nice work" on a workout in the feed.

create table public.session_kudos (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- RLS: anyone who can see the workout sees its kudos and can give one (as themselves).
alter table public.session_kudos enable row level security;
revoke all on public.session_kudos from anon;

create policy "session_kudos: read visible" on public.session_kudos
  for select to authenticated
  using (public.can_view_session(session_id));

create policy "session_kudos: give as self" on public.session_kudos
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_session(session_id));

create policy "session_kudos: take back own" on public.session_kudos
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke update on public.session_kudos from authenticated;
