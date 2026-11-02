-- Per-account rate limits for the RPCs that create things or look up codes.
--
-- Limits (per account):
--   room_create        20 / hour    rooms created
--   room_join          30 / hour    rooms newly joined
--   room_code_miss     10 / 10 min  join_room with a code matching no open room
--   invite_code_miss   10 / 10 min  follow_by_code with a code matching no one
--   follow             60 / hour    new follow edges (by code or by id)
--   block              30 / hour    new blocks
--   invite_rotate      10 / day     rotate_invite_code()
--   content_reports    20 / day     counted from content_reports itself (07_moderation)
--   app_events         a separate throttle (08_app_events)
--
-- A failed code lookup has to be *recorded* to be throttled, and a raised
-- exception rolls back everything the RPC wrote — so a miss doesn't raise:
-- join_room / follow_by_code record it and return an empty (all-null) row,
-- which the client reads as "not found". Every other error raises.
-- The client only needs to know the error code `rate_limited`.

-- rate_limit_events — one row per counted action. Written and read only by
-- the functions below (which run as the table owner), never through the API.
create table public.rate_limit_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  action     text not null check (char_length(action) <= 32),
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup on public.rate_limit_events (user_id, action, created_at);
create index rate_limit_events_created on public.rate_limit_events (created_at);

alter table public.rate_limit_events enable row level security;
revoke all on public.rate_limit_events from anon, authenticated;

-- Raises `rate_limited` once p_user_id has p_max `p_action` events inside the
-- sliding window. A count, then the caller's own write: two racing calls can
-- overshoot by one, which is fine for a throttle.
create function private.enforce_rate_limit(p_user_id uuid, p_action text, p_max integer, p_window interval)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if (
    select count(*) from public.rate_limit_events
    where user_id = p_user_id and action = p_action and created_at > now() - p_window
  ) >= p_max then
    raise exception 'rate_limited' using hint = 'Too many attempts. Try again later.';
  end if;
end;
$$;

create function private.record_rate_limit_event(p_user_id uuid, p_action text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.rate_limit_events (user_id, action) values (p_user_id, p_action);
end;
$$;

-- Only ever called from other (security definer) functions.
revoke execute on function private.enforce_rate_limit(uuid, text, integer, interval) from public, anon, authenticated;
revoke execute on function private.record_rate_limit_event(uuid, text) from public, anon, authenticated;

-- The longest window is a day; keep two. pg_cron is off by default on a new
-- Supabase project, and cron.schedule() fails without it.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.schedule(
  'purge_rate_limit_events',
  '17 * * * *',
  $$ delete from public.rate_limit_events where created_at < now() - interval '2 days' $$
);
