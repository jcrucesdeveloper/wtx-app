-- app_events — minimal product analytics in the same project as sync and
-- rooms, instead of a new vendor. Event names only: no properties, no device
-- or install id.
--
-- Who can write: anyone, including signed-out users (so purely local users
-- are counted too), and only with their own user id or none.
-- Who can read: nobody through the API — only the dashboard / service role.

create table public.app_events (
  id          bigint generated always as identity primary key,
  event       text not null,
  user_id     uuid references public.profiles (id) on delete set null,
  platform    text,                  -- e.g. 'android'
  app_version text,                  -- e.g. '1.4.2'
  -- A coarse acquisition label from a link's `src` parameter (e.g. 'tiktok',
  -- 'share-routine'). A short label only, never free text.
  source      text,
  created_at  timestamptz not null default now(),
  constraint app_events_event_check check (event in (
    'app_opened', 'account_created', 'routine_created', 'session_finished',
    'room_created', 'room_joined', 'session_shared', 'kudos_given', 'user_followed',
    'review_requested', 'install_banner_tapped', 'workout_card_shared',
    'share_sheet_opened', 'workout_card_saved',
    'workout_card_shared_instagram', 'workout_card_shared_whatsapp'
  )),
  constraint app_events_platform_length check (char_length(platform) <= 32),
  constraint app_events_app_version_length check (char_length(app_version) <= 32),
  constraint app_events_source_format check (source is null or source ~ '^[a-z0-9_-]{1,32}$')
);

create index app_events_event_created on public.app_events (event, created_at);
create index app_events_user_created on public.app_events (user_id, created_at) where user_id is not null;
create index app_events_anon_created on public.app_events (created_at) where user_id is null;
create index app_events_source_created on public.app_events (source, created_at) where source is not null;

alter table public.app_events enable row level security;
revoke all on public.app_events from anon, authenticated;
-- Only the columns the app sends; created_at is always the server's.
grant insert (event, user_id, platform, app_version, source) on public.app_events to anon, authenticated;

create policy "app_events: insert" on public.app_events
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- Analytics must never break the app, so over-limit events are dropped
-- silently (a BEFORE trigger returning null skips the row; the insert still
-- succeeds) rather than rejected:
--   an account:           100 events / hour
--   everyone anonymous:   300 events / minute, shared — the anon key is
--                         public, so there is no caller to key on; this only
--                         bounds how fast a script can grow the table.
create function public.app_events_throttle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    if (
      select count(*) from public.app_events
      where user_id = new.user_id and created_at > now() - interval '1 hour'
    ) >= 100 then
      return null;
    end if;
  elsif (
    select count(*) from public.app_events
    where user_id is null and created_at > now() - interval '1 minute'
  ) >= 300 then
    return null;
  end if;
  new.created_at := now();
  return new;
end;
$$;

create trigger app_events_throttle
  before insert on public.app_events
  for each row execute function public.app_events_throttle();

revoke execute on function public.app_events_throttle() from public, anon, authenticated;
