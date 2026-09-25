-- session_comments — short comments under a workout in the feed.

create table public.session_comments (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index session_comments_session on public.session_comments (session_id, created_at);

-- RLS: anyone who can see the workout reads and writes comments (as themselves);
-- authors delete their own, and the workout's owner can delete any on it.
alter table public.session_comments enable row level security;
revoke all on public.session_comments from anon;

create policy "session_comments: read visible" on public.session_comments
  for select to authenticated
  using (public.can_view_session(session_id));

create policy "session_comments: write as self" on public.session_comments
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_session(session_id));

create policy "session_comments: delete own or on own workout" on public.session_comments
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

revoke update on public.session_comments from authenticated;
