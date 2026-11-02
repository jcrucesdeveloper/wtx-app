-- Social: the follow graph, profile summaries and kudos on shared sessions.
--
-- follows         an asymmetric "I follow you" edge. Created only by
--                 follow_by_code(), follow_user() and the room auto-follow
--                 (04_rooms: finish_room_when_done). You see the edges you're
--                 part of, and can remove any of them (unfollow, or remove a
--                 follower).
-- session_kudos   a kudos on a session you can see; you can take back your own.
--
-- Following someone lets you read their profile and the sessions they share.
-- There is no open search: you reach someone new only by their invite code.

-- ===== follows =====

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee on public.follows (followee_id);

alter table public.follows enable row level security;
revoke all on public.follows from anon;

create policy "follows: read own edges" on public.follows
  for select to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

create policy "follows: remove an edge you're part of" on public.follows
  for delete to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

revoke insert, update on public.follows from authenticated;

-- ===== Follow RPCs =====

-- What the follow RPCs hand back about the person just followed: never the
-- invite code.
create type public.profile_card as (
  id           uuid,
  display_name text,
  bio          text
);

-- Follows a profile by its invite code. A blocked pair looks exactly like an
-- unknown code, and a miss returns an all-null row (see 03_rate_limits).
create function public.follow_by_code(p_code text)
returns public.profile_card
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profile_card;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform private.enforce_rate_limit(v_uid, 'invite_code_miss', 10, interval '10 minutes');

  select p.id, p.display_name, p.bio into v_profile
  from public.profiles p
  where p.invite_code = upper(regexp_replace(p_code, '\s', '', 'g'));

  if v_profile.id is null or private.is_blocked_between(v_uid, v_profile.id) then
    perform private.record_rate_limit_event(v_uid, 'invite_code_miss');
    return null;
  end if;

  if v_profile.id = v_uid then
    raise exception 'cannot_follow_self';
  end if;

  if not exists (select 1 from public.follows where follower_id = v_uid and followee_id = v_profile.id) then
    perform private.enforce_rate_limit(v_uid, 'follow', 60, interval '1 hour');
    insert into public.follows (follower_id, followee_id) values (v_uid, v_profile.id)
    on conflict do nothing;
    perform private.record_rate_limit_event(v_uid, 'follow');
  end if;

  return v_profile;
end;
$$;

-- Follows by id — for "Follow back" on a follower or a roommate. Limited to
-- profiles the caller can already see, so it can't follow an arbitrary
-- account by guessing its id; across a block it's the same `not_found`.
create function public.follow_user(p_user_id uuid)
returns public.profile_card
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profile_card;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_user_id = v_uid then
    raise exception 'cannot_follow_self';
  end if;
  if not private.can_view_profile(p_user_id) then
    raise exception 'not_found';
  end if;

  select p.id, p.display_name, p.bio into v_profile from public.profiles p where p.id = p_user_id;

  if not exists (select 1 from public.follows where follower_id = v_uid and followee_id = p_user_id) then
    perform private.enforce_rate_limit(v_uid, 'follow', 60, interval '1 hour');
    insert into public.follows (follower_id, followee_id) values (v_uid, p_user_id)
    on conflict do nothing;
    perform private.record_rate_limit_event(v_uid, 'follow');
  end if;

  return v_profile;
end;
$$;

revoke execute on function public.follow_by_code(text) from public, anon;
grant execute on function public.follow_by_code(text) to authenticated;
revoke execute on function public.follow_user(uuid) from public, anon;
grant execute on function public.follow_user(uuid) to authenticated;

-- ===== get_profile =====

-- A profile's header in one round trip. Counts are computed here because the
-- follows RLS only exposes edges the caller is part of. workout_times (for
-- the activity calendar and streak) is only filled when the caller may read the workouts themselves (self or a
-- follower), matching the "sessions: followers read shared" policy.
create function public.get_profile(p_user_id uuid)
returns table (
  id               uuid,
  display_name     text,
  bio              text,
  created_at       timestamptz,
  workout_count    integer,
  follower_count   integer,
  following_count  integer,
  i_follow         boolean,
  follows_me       boolean,
  trained_together integer,
  workout_times    timestamptz[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid       uuid := auth.uid();
  v_can_see   boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not private.can_view_profile(p_user_id) then
    raise exception 'not_found';
  end if;

  v_can_see := p_user_id = v_uid or private.follows_user(p_user_id);

  return query
  select
    p.id,
    p.display_name,
    p.bio,
    p.created_at,
    (select count(*)::int from public.sessions s
      where s.user_id = p.id and s.shared and s.deleted_at is null),
    (select count(*)::int from public.follows f where f.followee_id = p.id),
    (select count(*)::int from public.follows f where f.follower_id = p.id),
    private.follows_user(p.id),
    private.is_followed_by(p.id),
    case when p.id = v_uid then 0 else (
      select count(distinct me.room_id)::int
      from public.room_members me
      join public.room_members them on them.room_id = me.room_id and them.user_id = p.id
      join public.rooms r on r.id = me.room_id and r.status <> 'lobby'
      where me.user_id = v_uid
    ) end,
    case when v_can_see then coalesce((
      select array_agg(s.created_at order by s.created_at desc)
      from public.sessions s
      where s.user_id = p.id and s.shared and s.deleted_at is null
    ), '{}') else '{}' end
  from public.profiles p
  where p.id = p_user_id;
end;
$$;

revoke execute on function public.get_profile(uuid) from public, anon;
grant execute on function public.get_profile(uuid) to authenticated;

-- ===== session_kudos =====

create table public.session_kudos (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- One session's likers, newest first, paged by (created_at, user_id).
create index session_kudos_session_recent
  on public.session_kudos (session_id, created_at desc, user_id desc);
-- By who gave them: liked_visible_session() and deleting an account.
create index session_kudos_user on public.session_kudos (user_id);

alter table public.session_kudos enable row level security;
revoke all on public.session_kudos from anon;

create policy "session_kudos: read on a visible session" on public.session_kudos
  for select to authenticated
  using (private.can_view_session(session_id));

create policy "session_kudos: give on a visible session" on public.session_kudos
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_view_session(session_id));

create policy "session_kudos: take back your own" on public.session_kudos
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- RPC: one page of a session's likers, newest kudos first, with a name per
-- liker. The kudos rows are already readable on any session the caller can
-- see, but the likers' names aren't (profiles only shows self, roommates,
-- followees and followers), so this returns just the name. Pass the last
-- row's (liked_at, user_id) as (p_before, p_before_user) for the next page.
-- A session the caller can't see is `not_found`, like one that doesn't
-- exist; anyone blocked either way is left out.
create function public.get_session_likers(
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
  if not private.can_view_session(p_session_id) then
    raise exception 'not_found';
  end if;

  return query
  select
    k.user_id,
    p.display_name,
    k.created_at,
    private.follows_user(k.user_id),
    private.is_followed_by(k.user_id)
  from public.session_kudos k
  join public.profiles p on p.id = k.user_id
  where k.session_id = p_session_id
    and (k.user_id = v_uid or not private.is_blocked_between(v_uid, k.user_id))
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
