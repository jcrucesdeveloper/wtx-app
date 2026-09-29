-- Moderation for user-generated content (App Store guideline 1.2, Google
-- Play UGC policy): blocking another account, reporting an account or a
-- shared workout, and a small word filter on the free text other people see.
-- Reports are reviewed in the Supabase dashboard (see README → Moderation).

-- ===== 00_user_blocks.sql =====

-- user_blocks — "I never want to see or be seen by this account". Written
-- only by block_user() below, so blocking always also removes the follow
-- edges between the two people in the same transaction.
create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index user_blocks_blocked on public.user_blocks (blocked_id);

-- RLS: you see and lift only your own blocks. Nobody can read who blocked
-- them — the blocked person is never told.
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon;

create policy "user_blocks: read own" on public.user_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "user_blocks: unblock own" on public.user_blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

revoke insert, update on public.user_blocks from authenticated;

-- Either direction counts: a block hides both people from each other.
create function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.user_blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
end;
$$;

-- Takes any two ids, so a client must not be able to probe other people's
-- blocks with it: it's only called from other security definer functions.
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- The caller-relative form for RLS policies, which run as the caller.
create function public.is_blocked_with(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return public.is_blocked_between(auth.uid(), p_user_id);
end;
$$;

-- RPC: blocks an account and severs the follow graph between you both ways,
-- which is what actually hides each other's shared workouts (the sessions
-- policy is follow-based). Any id is accepted — you may want to block
-- someone whose profile you can no longer see.
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

  insert into public.user_blocks (blocker_id, blocked_id) values (v_uid, p_user_id)
  on conflict do nothing;

  delete from public.follows
  where (follower_id = v_uid and followee_id = p_user_id)
     or (follower_id = p_user_id and followee_id = v_uid);
end;
$$;

revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

-- Your blocked list needs names, but profiles RLS no longer shows a blocked
-- account (the follow edges are gone), so the names come through here.
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

revoke execute on function public.get_blocked_users() from public, anon;
grant execute on function public.get_blocked_users() to authenticated;

-- ===== 01_blocks_everywhere.sql =====

-- Same rule as 20260929000000_social_profiles.sql, plus: never across a block.
create or replace function public.can_view_profile(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_user_id = auth.uid() then
    return true;
  end if;
  if public.is_blocked_between(auth.uid(), p_user_id) then
    return false;
  end if;
  return public.follows_user(p_user_id)
    or public.is_followed_by(p_user_id)
    or public.shares_room_with(p_user_id);
end;
$$;

-- The follow-based profile policies stop matching once block_user() removes
-- the edges, but "read self and roommates" would still show a blocked
-- person's name through a past room. Restrictive policies are AND'd with the
-- permissive ones, so this hides the row across a block whatever else allows it.
create policy "profiles: hidden across a block" on public.profiles
  as restrictive
  for select to authenticated
  using (id = (select auth.uid()) or not public.is_blocked_with(id));

-- Same as 20260928000000_social_follow_and_feed.sql, but a blocked pair
-- looks exactly like an unknown code — the block itself is never revealed.
create or replace function public.follow_by_code(p_code text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_profile
  from public.profiles
  where invite_code = upper(regexp_replace(p_code, '\s', '', 'g'));

  if v_profile.id is null or public.is_blocked_between(v_uid, v_profile.id) then
    raise exception 'code_not_found';
  end if;

  if v_profile.id = v_uid then
    raise exception 'cannot_follow_self';
  end if;

  insert into public.follows (follower_id, followee_id) values (v_uid, v_profile.id)
  on conflict do nothing;

  return v_profile;
end;
$$;

-- Same as 20260929000000_social_profiles.sql. can_view_profile() is false
-- across a block, so a blocked pair gets the same `not_found`.
create or replace function public.follow_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_user_id = v_uid then
    raise exception 'cannot_follow_self';
  end if;
  if not public.can_view_profile(p_user_id) then
    raise exception 'not_found';
  end if;

  select * into v_profile from public.profiles where id = p_user_id;

  insert into public.follows (follower_id, followee_id) values (v_uid, p_user_id)
  on conflict do nothing;

  return v_profile;
end;
$$;

-- Same as 20260928000000_social_follow_and_feed.sql, but training in the
-- same room no longer auto-follows a pair where either has blocked the other.
create or replace function public.finish_room_when_done()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.finished_at is not null and not exists (
    select 1 from public.room_members
    where room_id = new.room_id and finished_at is null
  ) then
    update public.rooms set status = 'finished'
    where id = new.room_id and status = 'active';

    if found then
      insert into public.follows (follower_id, followee_id)
      select a.user_id, b.user_id
      from public.room_members a
      join public.room_members b on b.room_id = a.room_id and b.user_id <> a.user_id
      where a.room_id = new.room_id
        and not public.is_blocked_between(a.user_id, b.user_id)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

-- ===== 02_content_reports.sql =====

-- content_reports — an account (and optionally one shared workout of theirs)
-- flagged by someone. Insert-only from the app; reviewed and resolved in the
-- dashboard with the service role, which bypasses RLS.
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

-- You can report someone you can see — or someone you've blocked, since
-- blocking first and reporting second is a natural order. A reported
-- session has to be theirs and visible to you (or theirs, once blocked).
create function public.can_report(p_user_id uuid, p_session_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_blocked_by_me boolean := exists (
    select 1 from public.user_blocks
    where blocker_id = auth.uid() and blocked_id = p_user_id
  );
begin
  if not (v_blocked_by_me or public.can_view_profile(p_user_id)) then
    return false;
  end if;
  if p_session_id is null then
    return true;
  end if;
  return exists (
    select 1 from public.sessions
    where id = p_session_id and user_id = p_user_id and shared
  ) and (v_blocked_by_me or public.can_view_session(p_session_id));
end;
$$;

alter table public.content_reports enable row level security;
revoke all on public.content_reports from anon, authenticated;
grant insert (reported_user_id, session_id, reason, details) on public.content_reports to authenticated;

create policy "content_reports: file a report" on public.content_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and reported_user_id is not null
    and status = 'open'
    and public.can_report(reported_user_id, session_id)
  );

-- ===== 03_content_filter.sql =====

-- A deliberately short list of hate slurs and explicit sexual terms (English
-- and Spanish), matched as whole words after light normalization. It's a
-- floor, not a moderation system — reports cover the rest. Mirrored in
-- src/lib/contentFilter.ts; keep the two lists and normalizations in sync.
create function public.contains_blocked_terms(p_text text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_terms constant text[] := array[
    -- English
    'nigger', 'nigga', 'faggot', 'kike', 'chink', 'spic', 'tranny', 'retard',
    'cunt', 'whore', 'slut', 'porn', 'blowjob', 'jizz',
    -- Spanish
    'maricon', 'marica', 'sudaca', 'travelo', 'puta', 'puto', 'culiao', 'culiado',
    'conchetumare', 'conchatumadre', 'porno'
  ];
  v_text text;
  v_word text;
begin
  if p_text is null or p_text = '' then
    return false;
  end if;

  -- Lowercase, fold accents, undo common leetspeak, then everything that
  -- isn't a letter becomes a single space.
  v_text := lower(p_text);
  v_text := translate(v_text, 'áàâäãåéèêëíìîïóòôöõúùûüñç', 'aaaaaaeeeeiiiiooooouuuunc');
  v_text := translate(v_text, '013457@$', 'oieastas');
  v_text := regexp_replace(v_text, '[^a-z]+', ' ', 'g');
  -- Re-join words spelled out letter by letter ("p u t a").
  v_text := regexp_replace(v_text, '\m([a-z]) (?=[a-z]\M)', '\1', 'g');

  foreach v_word in array regexp_split_to_array(trim(v_text), ' ') loop
    if v_word = any (v_terms)
      or (v_word like '%s' and left(v_word, -1) = any (v_terms))
      or (v_word like '%es' and left(v_word, -2) = any (v_terms)) then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

-- Names and bios are what other people see of an account. A new account's
-- name comes from sign-up metadata or the email address, and refusing it
-- would fail the whole sign-up with an opaque error, so an insert falls back
-- to a neutral name instead; an edit is refused outright (the app checks
-- first, so this only catches a bypassed client).
create function public.profiles_content_filter()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if public.contains_blocked_terms(new.display_name) then
      new.display_name := 'Athlete';
    end if;
    if public.contains_blocked_terms(new.bio) then
      new.bio := '';
    end if;
  -- Only the fields being changed, so an older name that predates this
  -- filter doesn't lock someone out of editing their bio.
  elsif (new.display_name is distinct from old.display_name and public.contains_blocked_terms(new.display_name))
     or (new.bio is distinct from old.bio and public.contains_blocked_terms(new.bio)) then
    raise exception 'objectionable_content' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_content_filter
  before insert or update of display_name, bio on public.profiles
  for each row execute function public.profiles_content_filter();
