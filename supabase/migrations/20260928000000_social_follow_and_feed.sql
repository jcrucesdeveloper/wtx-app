-- Social feed: a permanent per-profile invite code, a follow graph (grown by
-- invite code and by training together in a room), sessions that can be
-- shared to followers, and kudos on those shared sessions.

-- ===== 00_invite_codes.sql =====

-- A permanent, unique per-user code — the follow equivalent of a room code,
-- but never expires. Following happens by link/QR/code, not open search.
create function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- no 0 O 1 I L
  v_code     text;
begin
  for attempt in 1..10 loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where invite_code = v_code);
  end loop;
  return v_code;
end;
$$;

alter table public.profiles add column invite_code text;

-- Backfill row by row (not a single set-based UPDATE) so each call to
-- generate_invite_code() sees the codes already assigned earlier in the loop
-- — a set-based UPDATE would evaluate every row against the same
-- pre-statement snapshot and could hand out the same code twice.
do $$
declare
  r record;
begin
  for r in select id from public.profiles where invite_code is null loop
    update public.profiles set invite_code = public.generate_invite_code() where id = r.id;
  end loop;
end;
$$;

alter table public.profiles alter column invite_code set not null;
alter table public.profiles add constraint profiles_invite_code_key unique (invite_code);

-- New signups get a code the same way rooms get a code.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, invite_code)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Athlete'
      ),
      24
    ),
    public.generate_invite_code()
  );
  return new;
end;
$$;

-- ===== 01_follows.sql =====

-- follows — an asymmetric "I follow you" edge. Never written directly by a
-- client: only follow_by_code() below, and the room auto-follow trigger.
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee on public.follows (followee_id);

create function public.follows_user(p_user_id uuid)
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

-- RLS: see edges you're a party to (so both your following and follower
-- lists work); unfollow your own edge, or remove someone following you.
alter table public.follows enable row level security;
revoke all on public.follows from anon;

create policy "follows: read own edges" on public.follows
  for select to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

create policy "follows: remove an edge you're part of" on public.follows
  for delete to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

revoke insert, update on public.follows from authenticated;

-- People you follow become readable like roommates already are (additive to
-- the existing "profiles: read self and roommates" policy — permissive
-- policies for the same command are OR'd together).
create policy "profiles: read followees" on public.profiles
  for select to authenticated
  using (public.follows_user(id));

-- RPC: follows a profile by its permanent invite code (mirrors join_room's
-- one-tap, no-preview shape).
create function public.follow_by_code(p_code text)
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

  if v_profile.id is null then
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

revoke execute on function public.follow_by_code(text) from public, anon;
grant execute on function public.follow_by_code(text) to authenticated;

-- Training together counts as introducing yourselves: once a room fully
-- finishes, every pair of its members mutually follows each other.
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
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

-- ===== 02_shared_sessions.sql =====

-- A session becomes a feed post when its owner opts in at finish time.
-- feed_snapshot is a denormalized copy of that finish's celebratory recap
-- (personal records, comparison to last time, streak, milestone) — a feed
-- viewer has no access to the poster's private session history to
-- recompute any of that themselves, so it's computed once, client-side, and
-- stored alongside the flag.
alter table public.sessions add column shared boolean not null default false;
alter table public.sessions add column feed_snapshot jsonb;

create index sessions_shared_feed on public.sessions (user_id, created_at desc)
  where shared and deleted_at is null;

-- Additive to the existing "sessions: own rows" policy.
create policy "sessions: followers read shared" on public.sessions
  for select to authenticated
  using (shared and deleted_at is null and public.follows_user(user_id));

-- ===== 03_session_kudos.sql =====

-- Shared helper: the same "can this viewer see this session" rule the
-- sessions policy above enforces, factored out so session_kudos enforces it
-- identically rather than re-deriving it.
create function public.can_view_session(p_session_id uuid)
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
      and (user_id = auth.uid() or (shared and public.follows_user(user_id)))
  );
end;
$$;

create table public.session_kudos (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index session_kudos_session on public.session_kudos (session_id);

alter table public.session_kudos enable row level security;
revoke all on public.session_kudos from anon;

create policy "session_kudos: read on a visible session" on public.session_kudos
  for select to authenticated
  using (public.can_view_session(session_id));

create policy "session_kudos: give on a visible session" on public.session_kudos
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_session(session_id));

create policy "session_kudos: take back your own" on public.session_kudos
  for delete to authenticated
  using (user_id = (select auth.uid()));
