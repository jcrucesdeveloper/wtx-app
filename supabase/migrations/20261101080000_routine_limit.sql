-- Caps how many routines one account can have, so a script can't fill the
-- table (every routine is a row of up to 100 kB):
--   live routines        300 per account     `routine_limit`
--   new routine rows   1,000 per day          `rate_limited`
--
-- The live cap is the one people can meet; the app warns before it and stops
-- creating at it (ROUTINE_MAX in src/lib/supabase/limits.ts — keep the two in
-- step). The daily budget only bounds churn: deletes are tombstones that stay
-- in the table, so create → delete loops (or inserting rows that are already
-- deleted) would otherwise grow it without the live count ever moving. It is
-- per day, not per minute, because a device that was offline (or signs in for
-- the first time) uploads its whole library in one burst — at most 300 new
-- rows, well inside it.
--
-- The app upserts the whole library on every change. INSERT … ON CONFLICT
-- fires BEFORE INSERT for every row, existing or not, so only ids the table
-- doesn't have yet count; a conflicting row then goes through BEFORE UPDATE,
-- where reviving a tombstone counts against the live cap too.

-- The live-count lookup.
create index if not exists routines_user_live on public.routines (user_id) where deleted_at is null;

create or replace function public.enforce_routine_limit(p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  -- One writer per account at a time (until the transaction ends), so two
  -- parallel batches can't both count 299 and both get in. Rows earlier in
  -- the same statement are visible to the count, so one big batch is exact too.
  perform pg_advisory_xact_lock(hashtext('routine_limit'), hashtext(p_user_id::text));

  if (
    select count(*) from public.routines
    where user_id = p_user_id and deleted_at is null
  ) >= 300 then
    raise exception 'routine_limit' using hint = 'An account can hold up to 300 routines.';
  end if;
end;
$$;

create or replace function public.routines_limit_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Already there: this is an upsert of an existing row (or a clash with
  -- someone else's id, which RLS refuses on the update path).
  if exists (select 1 from public.routines where id = new.id) then
    return new;
  end if;

  if new.deleted_at is null then
    perform public.enforce_routine_limit(new.user_id);
  end if;

  perform public.enforce_rate_limit(new.user_id, 'routine_create', 1000, interval '1 day');
  perform public.record_rate_limit_event(new.user_id, 'routine_create');
  return new;
end;
$$;

create or replace function public.routines_limit_revive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is not null and new.deleted_at is null then
    perform public.enforce_routine_limit(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists routines_limit_insert on public.routines;
create trigger routines_limit_insert
  before insert on public.routines
  for each row execute function public.routines_limit_insert();

drop trigger if exists routines_limit_revive on public.routines;
create trigger routines_limit_revive
  before update of deleted_at on public.routines
  for each row execute function public.routines_limit_revive();

-- Only ever called from the triggers above.
revoke execute on function public.enforce_routine_limit(uuid) from public, anon, authenticated;
revoke execute on function public.routines_limit_insert() from public, anon, authenticated;
revoke execute on function public.routines_limit_revive() from public, anon, authenticated;
