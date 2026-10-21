-- Measures the workout share sheet as a funnel: how often it is opened, and
-- where the card goes from it. Event names only, like every other event: no
-- properties, no device or install id. `workout_card_shared` keeps meaning
-- the card went out through the system share sheet (an app was picked there);
-- the direct destinations get their own names.

alter table public.app_events drop constraint app_events_event_check;

alter table public.app_events add constraint app_events_event_check check (event in (
  'app_opened', 'account_created', 'routine_created', 'session_finished',
  'room_created', 'room_joined', 'session_shared', 'kudos_given', 'user_followed',
  'review_requested', 'install_banner_tapped', 'workout_card_shared',
  'share_sheet_opened', 'workout_card_saved',
  'workout_card_shared_instagram', 'workout_card_shared_whatsapp'
));
