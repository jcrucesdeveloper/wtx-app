-- Moderation for user-generated content (App Store guideline 1.2, Google
-- Play UGC policy): blocking an account and reporting an account or a shared
-- workout. The word filter on names and bios is in 01_access_rules and
-- 02_profiles. Reports are reviewed in the Supabase dashboard (README →
-- Moderation).
--
-- user_blocks       "I never want to see or be seen by this account". You see
--                   and lift only your own blocks; the blocked person is never
--                   told. Written only by block_user().
-- content_reports   insert-only from the app; reviewed and resolved in the
--                   dashboard with the service role.

-- ===== user_blocks =====

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index user_blocks_blocked on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon;

create policy "user_blocks: read own" on public.user_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "user_blocks: unblock own" on public.user_blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

revoke insert, update on public.user_blocks from authenticated;

-- RPC: blocks an account and severs the follow graph between you both ways,
-- which is what actually hides each other's shared workouts (the sessions
-- policy is follow-based). Any id is accepted — you may want to block
-- someone whose profile you can no longer see. Re-blocking is free.
create function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_user_id = v_uid then
    raise exception 'cannot_block_self';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'not_found';
  end if;

  if not exists (select 1 from public.user_blocks where blocker_id = v_uid and blocked_id = p_user_id) then
    perform private.enforce_rate_limit(v_uid, 'block', 30, interval '1 hour');
    insert into public.user_blocks (blocker_id, blocked_id) values (v_uid, p_user_id)
    on conflict do nothing;
    perform private.record_rate_limit_event(v_uid, 'block');
  end if;

  delete from public.follows
  where (follower_id = v_uid and followee_id = p_user_id)
     or (follower_id = p_user_id and followee_id = v_uid);
end;
$$;

-- RPC: your blocked list with names (profiles RLS no longer shows a blocked
-- account, so the names come through here).
create function public.get_blocked_users()
returns table (id uuid, display_name text, blocked_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  return query
  select p.id, p.display_name, b.created_at
  from public.user_blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
end;
$$;

revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;
revoke execute on function public.get_blocked_users() from public, anon;
grant execute on function public.get_blocked_users() to authenticated;

-- ===== content_reports =====

create table public.content_reports (
  id               uuid primary key default gen_random_uuid(),
  -- Both people are kept as null when an account is deleted (e.g. a ban), so
  -- the report survives as a record of why.
  reporter_id      uuid default auth.uid() references public.profiles (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  session_id       uuid references public.sessions (id) on delete set null,
  reason           text not null check (reason in ('spam', 'harassment', 'inappropriate', 'other')),
  details          text not null default '' check (char_length(details) <= 500),
  status           text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at       timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create index content_reports_open on public.content_reports (created_at) where status = 'open';
create index content_reports_reporter_created on public.content_reports (reporter_id, created_at);
-- Foreign keys: deleting an account or a session updates its reports.
create index content_reports_reported_user on public.content_reports (reported_user_id);
create index content_reports_session on public.content_reports (session_id) where session_id is not null;

alter table public.content_reports enable row level security;
revoke all on public.content_reports from anon, authenticated;
grant insert (reported_user_id, session_id, reason, details) on public.content_reports to authenticated;

create policy "content_reports: file a report" on public.content_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and reported_user_id is not null
    and status = 'open'
    and private.can_report(reported_user_id, session_id)
  );

-- 20 reports a day per reporter. Reports are inserted straight into the
-- table, so the limit is a trigger rather than a rate_limit_events count.
create function private.content_reports_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.content_reports
    where reporter_id = new.reporter_id and created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'rate_limited' using hint = 'Too many reports. Try again later.';
  end if;
  return new;
end;
$$;

create trigger content_reports_rate_limit
  before insert on public.content_reports
  for each row execute function private.content_reports_rate_limit();

revoke execute on function private.content_reports_rate_limit() from public, anon, authenticated;
