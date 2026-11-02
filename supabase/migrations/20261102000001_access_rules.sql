-- Access rules: the small functions every row level security policy and RPC
-- uses to answer "may the caller see this?". Read this file first; the table
-- files that follow only combine these.
--
-- They're `security definer` so a policy can call them without recursing
-- through the RLS of the table they look at, and plpgsql on purpose: unlike
-- `language sql`, a plpgsql body isn't resolved until it runs, so these can
-- name tables that later files create.
--
-- Every one is relative to the caller (auth.uid()), except the few marked
-- "internal", which take any ids and so are callable only from other
-- security definer functions.
--
-- The `private` schema: everything that isn't meant to be called by the app
-- lives here — these rules, trigger functions and other internals. Supabase's
-- API only exposes `public`, so nothing in `private` can be called as an RPC
-- (an exposed is_blocked_with() would tell anyone who has blocked them).
-- `public` holds only the tables and the RPCs the app calls.
-- Policies run as the caller, so signed-in users get USAGE on the schema
-- and EXECUTE on just the functions their policies use.

create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ===== Safe defaults for everything created later =====

-- Out of the box, Postgres lets everyone execute every new function, and
-- Supabase gives signed-out users (anon) full access to every new table in
-- public. These change the defaults for everything migrations create from
-- here on (they run as `postgres`): a new table or function is closed to
-- signed-out users until a migration grants it on purpose, and a new
-- function in `private` is closed to everyone. A forgotten grant then shows
-- up as an error in the app instead of an open door.
-- Signed-in users keep Supabase's defaults, so a new table still needs row
-- level security — supabase/tests checks that every table has it.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;

-- ===== Rooms =====

-- Is the caller a member of this room?
create function private.is_room_member(p_room_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid()
  );
end;
$$;

-- Is this room in progress (sets can only be logged while it is)?
create function private.is_room_active(p_room_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.rooms
    where id = p_room_id and status = 'active'
  );
end;
$$;

-- Has the caller ever been in a room with this person?
create function private.shares_room_with(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.room_members me
    join public.room_members them on them.room_id = me.room_id
    where me.user_id = auth.uid() and them.user_id = p_user_id
  );
end;
$$;

-- ===== Follows =====

-- Does the caller follow this person?
create function private.follows_user(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.follows
    where follower_id = auth.uid() and followee_id = p_user_id
  );
end;
$$;

-- Does this person follow the caller?
create function private.is_followed_by(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.follows
    where follower_id = p_user_id and followee_id = auth.uid()
  );
end;
$$;

-- ===== Blocks =====

-- Internal. Either direction counts: a block hides both people from each other.
create function private.is_blocked_between(p_a uuid, p_b uuid)
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

-- The caller-relative form, for policies.
create function private.is_blocked_with(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return private.is_blocked_between(auth.uid(), p_user_id);
end;
$$;

-- ===== Profiles and sessions =====

-- Internal. Did this person like a session the caller can see (their own,
-- or a shared one by someone they follow)? Then the caller can find them in
-- that post's likers list (get_session_likers).
create function private.liked_visible_session(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.session_kudos k
    join public.sessions s on s.id = k.session_id
    where k.user_id = p_user_id
      and s.deleted_at is null
      and (s.user_id = auth.uid() or (s.shared and private.follows_user(s.user_id)))
  );
end;
$$;

-- Internal (used by RPCs, never by a policy). Whose profile header the caller
-- may open and follow: yourself, anyone you follow or who follows you, anyone
-- you've shared a room with, and anyone who liked a post you can see — never
-- across a block. Their workouts stay follower-only (get_profile gates those).
-- The profiles policies cover the same people minus the likers.
create function private.can_view_profile(p_user_id uuid)
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
  if private.is_blocked_between(auth.uid(), p_user_id) then
    return false;
  end if;
  return private.follows_user(p_user_id)
    or private.is_followed_by(p_user_id)
    or private.shares_room_with(p_user_id)
    or private.liked_visible_session(p_user_id);
end;
$$;

-- Who may see a session: its owner, or a follower once it's shared. The
-- same rule as the sessions policies, so session_kudos enforces it identically.
create function private.can_view_session(p_session_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.sessions
    where id = p_session_id
      and deleted_at is null
      and (user_id = auth.uid() or (shared and private.follows_user(user_id)))
  );
end;
$$;

-- You can report someone you can see — or someone you've blocked, since
-- blocking first and reporting second is a natural order. A reported
-- session has to be theirs and visible to you (or theirs, once blocked).
create function private.can_report(p_user_id uuid, p_session_id uuid)
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
  if not (v_blocked_by_me or private.can_view_profile(p_user_id)) then
    return false;
  end if;
  if p_session_id is null then
    return true;
  end if;
  return exists (
    select 1 from public.sessions
    where id = p_session_id and user_id = p_user_id and shared
  ) and (v_blocked_by_me or private.can_view_session(p_session_id));
end;
$$;

-- ===== Word filter =====

-- A deliberately short list of hate slurs and explicit sexual terms (English
-- and Spanish), matched as whole words after light normalization. It's a
-- floor, not a moderation system — reports cover the rest. Mirrored in
-- src/lib/contentFilter.ts; keep the two lists and normalizations in sync.
create function private.contains_blocked_terms(p_text text)
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

-- ===== Shared trigger =====

-- Server-owned `updated_at`, so a device with a wrong clock can't break the
-- "changed since" sync cursor.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ===== Who can call these =====

-- Postgres grants EXECUTE on every new function to everyone: take it all
-- back, then give signed-in users only what their policies call (and the
-- word filter, which the profiles trigger runs as the caller).
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_room_member(uuid) to authenticated;
grant execute on function private.is_room_active(uuid) to authenticated;
grant execute on function private.shares_room_with(uuid) to authenticated;
grant execute on function private.follows_user(uuid) to authenticated;
grant execute on function private.is_followed_by(uuid) to authenticated;
grant execute on function private.is_blocked_with(uuid) to authenticated;
grant execute on function private.can_view_session(uuid) to authenticated;
grant execute on function private.can_report(uuid, uuid) to authenticated;
grant execute on function private.contains_blocked_terms(text) to authenticated;
