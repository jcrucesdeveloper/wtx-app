-- Shared helpers used by the table files that follow.
--
-- The room and social helpers are plpgsql on purpose: unlike `language sql`, their bodies
-- aren't resolved until they run, so tables created earlier (profiles, rooms)
-- can use them in policies before `room_members` / `follows` exist.

-- Server-owned `updated_at`, so a device with a wrong clock can't break the
-- "changed since" sync cursor.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- security definer so policies can call these without recursing through RLS.
create function public.is_room_member(p_room_id uuid)
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

create function public.is_room_active(p_room_id uuid)
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

-- Social: whose workouts the caller may see — their own, plus anyone they
-- follow who shares workouts. Used by the sessions / kudos / comments policies.
create function public.can_view_workouts(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return p_user_id = auth.uid() or exists (
    select 1
    from public.follows f
    join public.profiles p on p.id = f.followee_id
    where f.follower_id = auth.uid() and f.followee_id = p_user_id and p.share_workouts
  );
end;
$$;

create function public.can_view_session(p_session_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner
  from public.sessions
  where id = p_session_id and deleted_at is null;
  return v_owner is not null and public.can_view_workouts(v_owner);
end;
$$;
