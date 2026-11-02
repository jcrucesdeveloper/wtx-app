-- Who liked a post: tapping the 💪 count on a shared session lists the
-- people who gave it kudos, with a follow button on each.
--   00 index for paging one session's kudos newest first
--   01 liked_visible_session(): "this account liked a post you can see"
--   02 can_view_profile(): a liker you can see in that list is a profile you
--      can open and follow (still never across a block)
--   03 get_session_likers(): one page of likers, names included
--
-- Why an RPC rather than a select on session_kudos: the kudos rows are
-- already readable on any session the caller can see ("session_kudos: read
-- on a visible session"), but the likers' names aren't — the profiles
-- policies only expose self, roommates, followees and followers. The RPC
-- checks the same can_view_session() rule the kudos policy uses and returns
-- just a name per liker, nothing else from their profile.
--
-- Idempotent: safe to re-run.

-- ===== 00_index.sql =====

-- Keyset paging: (session_id, created_at desc, user_id desc).
create index if not exists session_kudos_session_recent
  on public.session_kudos (session_id, created_at desc, user_id desc);

-- liked_visible_session() looks kudos up by who gave them.
create index if not exists session_kudos_user on public.session_kudos (user_id);

-- ===== 01_liked_visible_session.sql =====

-- True when p_user_id liked a session the caller can see (their own, or a
-- shared one by someone they follow) — i.e. when the caller could find them
-- in some post's likers list.
create or replace function public.liked_visible_session(p_user_id uuid)
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
      and (s.user_id = auth.uid() or (s.shared and public.follows_user(s.user_id)))
  );
end;
$$;

-- Only used inside other security definer functions, never by a policy.
revoke execute on function public.liked_visible_session(uuid) from public, anon, authenticated;

-- ===== 02_can_view_profile.sql =====

-- Same as 20260930000000_moderation.sql, plus: someone who liked a post you
-- can see. That's what lets the likers list open their profile header and
-- follow them (follow_user() and get_profile() both go through this) —
-- their workouts stay follower-only, get_profile() gates those separately.
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
    or public.shares_room_with(p_user_id)
    or public.liked_visible_session(p_user_id);
end;
$$;

revoke execute on function public.can_view_profile(uuid) from public, anon, authenticated;

-- ===== 03_get_session_likers.sql =====

-- One page of a session's likers, newest kudos first. Pass the last row's
-- (liked_at, user_id) as (p_before, p_before_user) for the next page.
-- A session the caller can't see is `not_found`, the same answer as one that
-- doesn't exist. Anyone blocked either way is left out of the list.
create or replace function public.get_session_likers(
  p_session_id  uuid,
  p_before      timestamptz default null,
  p_before_user uuid default null,
  p_limit       integer default 30
)
returns table (
  user_id      uuid,
  display_name text,
  liked_at     timestamptz,
  i_follow     boolean,
  follows_me   boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid   uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 50);
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.can_view_session(p_session_id) then
    raise exception 'not_found';
  end if;

  return query
  select
    k.user_id,
    p.display_name,
    k.created_at,
    public.follows_user(k.user_id),
    public.is_followed_by(k.user_id)
  from public.session_kudos k
  join public.profiles p on p.id = k.user_id
  where k.session_id = p_session_id
    and (k.user_id = v_uid or not public.is_blocked_between(v_uid, k.user_id))
    and (
      p_before is null
      or k.created_at < p_before
      or (k.created_at = p_before and p_before_user is not null and k.user_id < p_before_user)
    )
  order by k.created_at desc, k.user_id desc
  limit v_limit;
end;
$$;

revoke execute on function public.get_session_likers(uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_session_likers(uuid, timestamptz, uuid, integer) to authenticated;
