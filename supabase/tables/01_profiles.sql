-- profiles — one per account, created by a trigger on sign-up.

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 24),
  share_workouts boolean not null default true,  -- followers see this account's workouts in their feed
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before insert or update on public.profiles
  for each row execute function public.set_updated_at();

-- Creates the profile from the `display_name` sent with sign-up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Athlete'
      ),
      24
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: any account can find and follow any other, so names are readable by
-- everyone logged in; edit only your own name and sharing choice.
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;

create policy "profiles: read all" on public.profiles
  for select to authenticated
  using (true);

create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name, share_workouts) on public.profiles to authenticated;
