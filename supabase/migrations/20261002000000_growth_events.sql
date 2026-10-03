-- Widens app_events for growth: asking for a store rating, tapping the
-- "get the app" banner on the web and sharing a workout card — plus a coarse
-- acquisition source (e.g. 'tiktok', 'share-routine') on every event.

alter table public.app_events drop constraint app_events_event_check;

alter table public.app_events add constraint app_events_event_check check (event in (
  'app_opened', 'account_created', 'routine_created', 'session_finished',
  'room_created', 'room_joined', 'session_shared', 'kudos_given', 'user_followed',
  'review_requested', 'install_banner_tapped', 'workout_card_shared'
));

-- A short label only, never free text: the app sends it from a link's `src`
-- parameter, so the format is enforced here too.
alter table public.app_events add column source text;
alter table public.app_events
  add constraint app_events_source_format check (source is null or source ~ '^[a-z0-9_-]{1,32}$');

grant insert (source) on public.app_events to anon, authenticated;

create index app_events_source_created on public.app_events (source, created_at) where source is not null;
