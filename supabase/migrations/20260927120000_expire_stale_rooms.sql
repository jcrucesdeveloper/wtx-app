-- Auto-expires rooms nobody ever finished or closed. Without this, an
-- abandoned lobby/active room sits open forever and keeps its 6-char code
-- reserved (rooms_open_code only excludes finished rooms).

create extension if not exists pg_cron;

-- Speeds up the periodic sweep below the same way rooms_open_code does.
create index rooms_open_created_at on public.rooms (created_at) where status <> 'finished';

-- Reuses the existing status machine: setting status = 'finished' is a valid
-- transition from both 'lobby' and 'active' (see room_status_transition()),
-- which stamps finished_at and lets existing Realtime/RLS behavior take over.
select cron.schedule(
  'expire_stale_rooms',
  '*/15 * * * *',
  $$
    update public.rooms
    set status = 'finished'
    where status <> 'finished'
      and created_at < now() - interval '7 hours'
  $$
);
