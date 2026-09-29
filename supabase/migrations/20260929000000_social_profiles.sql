-- Social profiles: a short bio, reading the profiles of people who follow
-- you, and two RPCs — one summary of a profile (counts the follows RLS hides
-- from a client) and following someone by id ("Follow back").

-- ===== 00_bio.sql =====

alter table public.profiles
  add column bio text not null default '' check (char_length(bio) <= 150);

grant update (bio) on public.profiles to authenticated;

-- ===== 01_read_followers.sql =====

-- Mirrors follows_user(): does p_user_id follow the caller?
create function public.is_followed_by(p_user_id uuid)
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

-- Your followers list needs their names. Additive to the self/roommates and
-- followees policies (permissive policies are OR'd together).
create policy "profiles: read followers" on public.profiles
  for select to authenticated
  using (public.is_followed_by(id));

-- ===== 02_can_view_profile.sql =====

-- The same "can this caller see this profile" rule the profiles policies
-- enforce, in one place for the RPCs below.
create function public.can_view_profile(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return p_user_id = auth.uid()
    or public.follows_user(p_user_id)
    or public.is_followed_by(p_user_id)
    or public.shares_room_with(p_user_id);
end;
$$;

-- ===== 03_get_profile.sql =====

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
  if not public.can_view_profile(p_user_id) then
    raise exception 'not_found';
  end if;

  v_can_see := p_user_id = v_uid or public.follows_user(p_user_id);

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
    public.follows_user(p.id),
    public.is_followed_by(p.id),
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

-- ===== 04_follow_user.sql =====

-- Follows by id — for "Follow back" on a follower or a roommate. Limited to
-- profiles the caller can already see, so it can't be used to follow an
-- arbitrary account by guessing its id (follow_by_code stays the way to
-- reach someone new).
create function public.follow_user(p_user_id uuid)
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

revoke execute on function public.follow_user(uuid) from public, anon;
grant execute on function public.follow_user(uuid) to authenticated;
