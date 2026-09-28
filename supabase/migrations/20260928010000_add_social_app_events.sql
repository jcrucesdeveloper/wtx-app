-- Widens app_events for the social feed: sharing a session, giving kudos,
-- and following someone.

alter table public.app_events drop constraint app_events_event_check;

alter table public.app_events add constraint app_events_event_check check (event in (
  'app_opened', 'account_created', 'routine_created', 'session_finished',
  'room_created', 'room_joined', 'session_shared', 'kudos_given', 'user_followed'
));
