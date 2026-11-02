-- profiles — one per account, created by a trigger on sign-up.
--
-- Who can read a profile: yourself, people you follow, people who follow
-- you and people you've shared a room with — never across a block. Only the
-- owner can change it, and only display_name and bio.
--
-- invite_code is the account's permanent "follow me" code (link / QR). Only
-- its owner can read it, through my_invite_code(), and can replace it with
-- rotate_invite_code().

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 24),
  bio          text not null default '' check (char_length(bio) <= 150),
  invite_code  text not null unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before insert or update on public.profiles
  for each row execute function private.set_updated_at();

-- ===== Invite codes =====

-- 8 characters without the look-alikes 0 O 1 I L.
create function private.generate_invite_code()
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

-- RPC: the caller's own invite code.
create function public.my_invite_code()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  return (select invite_code from public.profiles where id = auth.uid());
end;
$$;

-- RPC: gives the caller a fresh code; old links and QR codes stop working.
-- People already following stay followed (remove them from your followers
-- first to keep them from coming back).
create function public.rotate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform private.enforce_rate_limit(v_uid, 'invite_rotate', 10, interval '1 day');

  for attempt in 1..10 loop
    v_code := private.generate_invite_code();
    begin
      update public.profiles set invite_code = v_code where id = v_uid;
      exit;
    exception when unique_violation then
      v_code := null;  -- taken between the check and the update: try another
    end;
  end loop;

  if v_code is null then
    raise exception 'invite_code_exhausted';
  end if;

  perform private.record_rate_limit_event(v_uid, 'invite_rotate');
  return v_code;
end;
$$;

revoke execute on function private.generate_invite_code() from public, anon, authenticated;
revoke execute on function public.my_invite_code() from public, anon;
grant execute on function public.my_invite_code() to authenticated;
revoke execute on function public.rotate_invite_code() from public, anon;
grant execute on function public.rotate_invite_code() to authenticated;

-- ===== Sign-up =====

-- Creates the profile from the `display_name` sent with sign-up.
create function private.handle_new_user()
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
    private.generate_invite_code()
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

revoke execute on function private.handle_new_user() from public, anon, authenticated;

-- ===== Word filter =====

-- Names and bios are what other people see of an account. A new account's
-- name comes from sign-up metadata or the email address, and refusing it
-- would fail the whole sign-up with an opaque error, so an insert falls back
-- to a neutral name instead; an edit is refused outright (the app checks
-- first, so this only catches a bypassed client).
create function private.profiles_content_filter()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if private.contains_blocked_terms(new.display_name) then
      new.display_name := 'Athlete';
    end if;
    if private.contains_blocked_terms(new.bio) then
      new.bio := '';
    end if;
  -- Only the fields being changed, so an older name that predates this
  -- filter doesn't lock someone out of editing their bio.
  elsif (new.display_name is distinct from old.display_name and private.contains_blocked_terms(new.display_name))
     or (new.bio is distinct from old.bio and private.contains_blocked_terms(new.bio)) then
    raise exception 'objectionable_content' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_content_filter
  before insert or update of display_name, bio on public.profiles
  for each row execute function private.profiles_content_filter();

revoke execute on function private.profiles_content_filter() from public, anon, authenticated;

-- ===== Row level security =====

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;

-- One read policy (several permissive ones would each run on every row)...
create policy "profiles: read self, roommates, followees and followers" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or private.shares_room_with(id)
    or private.follows_user(id)
    or private.is_followed_by(id)
  );

-- ...and a restrictive one, AND'd with it: a blocked person stays hidden
-- even through a room you once shared.
create policy "profiles: hidden across a block" on public.profiles
  as restrictive
  for select to authenticated
  using (id = (select auth.uid()) or not private.is_blocked_with(id));

create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Column-level grants: invite_code is never readable directly, and a column
-- added later stays unreadable by the app until it's added here.
revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name, bio) on public.profiles to authenticated;
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, bio, created_at, updated_at) on public.profiles to authenticated;
