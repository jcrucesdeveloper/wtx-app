-- Shared helpers used by the table files that follow.
--
-- The room helpers are plpgsql on purpose: unlike `language sql`, their bodies
-- aren't resolved until they run, so tables created earlier (profiles, rooms)
-- can use them in policies before `room_members` exists.

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

create function public.shares_room_with(p_user_id uuid)
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
