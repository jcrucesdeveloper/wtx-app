-- follows — one-way, public follows (like Strava / Hevy): following someone
-- puts their shared workouts in your feed. No requests to approve; people who
-- want privacy turn off `profiles.share_workouts` instead.

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee on public.follows (followee_id);

-- RLS: the follow graph is public to accounts; you only add or drop your own follows.
alter table public.follows enable row level security;
revoke all on public.follows from anon;

create policy "follows: read all" on public.follows
  for select to authenticated
  using (true);

create policy "follows: follow as self" on public.follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()));

create policy "follows: unfollow as self" on public.follows
  for delete to authenticated
  using (follower_id = (select auth.uid()));

revoke update on public.follows from authenticated;
