-- Social read functions for the feed, profiles and people search.
--
-- All `security invoker` (the default for `language sql`): they only shape and
-- count rows, and the table policies above still decide what the caller sees.

-- Feed page, newest first, paged by the (created_at, id) of the last row seen.
-- No p_user_id / p_session_id: you and everyone you follow. p_user_id: one
-- person's workouts. p_session_id: a single workout.
create function public.social_feed(
  p_user_id    uuid default null,
  p_before     timestamptz default null,
  p_before_id  uuid default null,
  p_limit      integer default 20,
  p_session_id uuid default null
)
returns table (
  session_id    uuid,
  user_id       uuid,
  display_name  text,
  raw_text      text,
  room_id       uuid,
  created_at    timestamptz,
  kudos_count   integer,
  comment_count integer,
  gave_kudos    boolean
)
language sql
stable
set search_path = ''
as $$
  select
    s.id,
    s.user_id,
    p.display_name,
    s.raw_text,
    s.room_id,
    s.created_at,
    (select count(*)::integer from public.session_kudos k where k.session_id = s.id),
    (select count(*)::integer from public.session_comments c where c.session_id = s.id),
    exists (select 1 from public.session_kudos k where k.session_id = s.id and k.user_id = auth.uid())
  from public.sessions s
  join public.profiles p on p.id = s.user_id
  where s.deleted_at is null
    and case
      when p_session_id is not null then s.id = p_session_id
      when p_user_id is not null then s.user_id = p_user_id
      else s.user_id = auth.uid()
        or s.user_id in (select f.followee_id from public.follows f where f.follower_id = auth.uid())
    end
    and (
      p_before is null
      or s.created_at < p_before
      or (s.created_at = p_before and p_before_id is not null and s.id < p_before_id)
    )
  order by s.created_at desc, s.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- One profile with its follow counts and how it relates to the caller.
-- workouts_count only counts what the caller is allowed to see.
create function public.social_profile(p_user_id uuid)
returns table (
  id              uuid,
  display_name    text,
  share_workouts  boolean,
  created_at      timestamptz,
  followers_count integer,
  following_count integer,
  workouts_count  integer,
  is_following    boolean,
  follows_me      boolean
)
language sql
stable
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    p.share_workouts,
    p.created_at,
    (select count(*)::integer from public.follows f where f.followee_id = p.id),
    (select count(*)::integer from public.follows f where f.follower_id = p.id),
    (select count(*)::integer from public.sessions s where s.user_id = p.id and s.deleted_at is null),
    exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id),
    exists (select 1 from public.follows f where f.follower_id = p.id and f.followee_id = auth.uid())
  from public.profiles p
  where p.id = p_user_id;
$$;

-- People whose name contains the query (prefix matches first), not including you.
create function public.search_profiles(p_query text)
returns table (
  id           uuid,
  display_name text,
  is_following boolean,
  follows_me   boolean
)
language sql
stable
set search_path = ''
as $$
  with q as (
    -- Escape LIKE wildcards so "50%" or "a_b" match literally.
    select replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') as term
  )
  select
    p.id,
    p.display_name,
    exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id),
    exists (select 1 from public.follows f where f.follower_id = p.id and f.followee_id = auth.uid())
  from public.profiles p, q
  where p.id <> auth.uid()
    and char_length(q.term) >= 2
    and p.display_name ilike '%' || q.term || '%'
  order by (p.display_name ilike q.term || '%') desc, lower(p.display_name)
  limit 25;
$$;

-- People you might want to follow and why: you trained together, they follow
-- you, a friend follows them, or — so a new account never sees an empty list —
-- they're new here. Anyone you already follow is left out.
create function public.suggested_profiles(p_limit integer default 12)
returns table (
  id           uuid,
  display_name text,
  reason       text,
  follows_me   boolean
)
language sql
stable
set search_path = ''
as $$
  with candidates as (
    select them.user_id as id, 0 as rank
    from public.room_members me
    join public.room_members them on them.room_id = me.room_id
    where me.user_id = auth.uid()
    union all
    select f.follower_id, 1
    from public.follows f
    where f.followee_id = auth.uid()
    union all
    select f2.followee_id, 2
    from public.follows f1
    join public.follows f2 on f2.follower_id = f1.followee_id
    where f1.follower_id = auth.uid()
    union all
    select newest.id, 3
    from (select id from public.profiles order by created_at desc limit 20) newest
  ),
  ranked as (
    select c.id, min(c.rank) as rank, count(*) as weight
    from candidates c
    where c.id <> auth.uid()
      and not exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = c.id)
    group by c.id
  )
  select
    p.id,
    p.display_name,
    case r.rank
      when 0 then 'trained_together'
      when 1 then 'follows_you'
      when 2 then 'friend_of_friend'
      else 'new'
    end,
    exists (select 1 from public.follows f where f.follower_id = p.id and f.followee_id = auth.uid())
  from ranked r
  join public.profiles p on p.id = r.id
  order by r.rank, r.weight desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 30);
$$;

-- Someone's followers or the people they follow, newest first.
create function public.follow_list(p_user_id uuid, p_kind text)
returns table (
  id           uuid,
  display_name text,
  is_following boolean,
  follows_me   boolean
)
language sql
stable
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id),
    exists (select 1 from public.follows f where f.follower_id = p.id and f.followee_id = auth.uid())
  from public.follows link
  join public.profiles p
    on p.id = case when p_kind = 'followers' then link.follower_id else link.followee_id end
  where case when p_kind = 'followers' then link.followee_id else link.follower_id end = p_user_id
  order by link.created_at desc
  limit 200;
$$;

-- A workout's comments, oldest first, with each author's name.
create function public.post_comments(p_session_id uuid)
returns table (
  id           uuid,
  user_id      uuid,
  display_name text,
  body         text,
  created_at   timestamptz
)
language sql
stable
set search_path = ''
as $$
  select c.id, c.user_id, p.display_name, c.body, c.created_at
  from public.session_comments c
  join public.profiles p on p.id = c.user_id
  where c.session_id = p_session_id
  order by c.created_at
  limit 500;
$$;

-- Who gave a workout kudos, newest first.
create function public.post_kudos(p_session_id uuid)
returns table (
  user_id      uuid,
  display_name text
)
language sql
stable
set search_path = ''
as $$
  select k.user_id, p.display_name
  from public.session_kudos k
  join public.profiles p on p.id = k.user_id
  where k.session_id = p_session_id
  order by k.created_at desc
  limit 500;
$$;

revoke execute on function public.social_feed(uuid, timestamptz, uuid, integer, uuid) from public, anon;
revoke execute on function public.social_profile(uuid) from public, anon;
revoke execute on function public.search_profiles(text) from public, anon;
revoke execute on function public.suggested_profiles(integer) from public, anon;
revoke execute on function public.follow_list(uuid, text) from public, anon;
revoke execute on function public.post_comments(uuid) from public, anon;
revoke execute on function public.post_kudos(uuid) from public, anon;

grant execute on function public.social_feed(uuid, timestamptz, uuid, integer, uuid) to authenticated;
grant execute on function public.social_profile(uuid) to authenticated;
grant execute on function public.search_profiles(text) to authenticated;
grant execute on function public.suggested_profiles(integer) to authenticated;
grant execute on function public.follow_list(uuid, text) to authenticated;
grant execute on function public.post_comments(uuid) to authenticated;
grant execute on function public.post_kudos(uuid) to authenticated;
