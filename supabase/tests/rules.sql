-- Rules every migration must keep. Each check lists what breaks it, so a
-- failure says exactly which table or function to fix. Run by run.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
\pset tuples_only on
\pset format unaligned

-- Records each broken rule and keeps going, so one run lists every problem.
create temp table failures (rule text);
create function pg_temp.check(p_name text, p_offenders text[]) returns void language plpgsql as $$
begin
  if coalesce(cardinality(p_offenders), 0) > 0 then
    insert into failures values (p_name);
    raise notice E'FAIL  %
      %', p_name, array_to_string(p_offenders, E'
      ');
  else
    raise notice 'PASS  %', p_name;
  end if;
end $$;

-- Every table the API can reach has row level security.
select pg_temp.check('every public table has row level security', array(
  select c.relname::text from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity
  order by 1));

-- Signed-out users can do exactly one thing: insert analytics.
select pg_temp.check('signed-out users only get INSERT on app_events', array(
  select format('%s: %s', table_name, privilege_type) from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon'
  union
  select format('%s.%s: %s', table_name, column_name, privilege_type) from information_schema.column_privileges
  where table_schema = 'public' and grantee = 'anon'
    and not (table_name = 'app_events' and privilege_type = 'INSERT')
  order by 1));

-- No function anywhere is executable by signed-out users.
select pg_temp.check('no function is executable by signed-out users', array(
  select p.oid::regprocedure::text from pg_proc p
  where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
    and has_function_privilege('anon', p.oid, 'execute')
  order by 1));

-- Every function pins its search_path, so callers can't swap in their own objects.
select pg_temp.check('every function sets search_path', array(
  select p.oid::regprocedure::text from pg_proc p
  where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  order by 1));

-- public holds the API and nothing else. Adding an RPC means adding it here,
-- on purpose; anything internal belongs in `private`.
select pg_temp.check('public functions are exactly the app''s RPCs', array(
  select coalesce(a, '(missing) ' || e) from (
    select p.proname::text as a from pg_proc p where p.pronamespace = 'public'::regnamespace
  ) actual
  full join unnest(array[
    'block_user', 'create_room', 'follow_by_code', 'follow_user', 'get_blocked_users', 'get_profile',
    'join_room', 'my_invite_code', 'rotate_invite_code', 'set_room_routine'
  ]) e on e = a
  where a is null or e is null
  order by 1));

-- Nothing in `private` is visible to the API, and only signed-in users may
-- use it (their policies call into it).
select pg_temp.check('private schema is closed to signed-out users', array(
  select 'anon has USAGE on private' where has_schema_privilege('anon', 'private', 'usage')));

-- Deleting an account cascades through every foreign key: each needs an
-- index that starts with its columns.
select pg_temp.check('every foreign key has an index', array(
  select format('%s (%s)', c.conrelid::regclass, c.conname) from pg_constraint c
  where c.contype = 'f'
    and c.connamespace in ('public'::regnamespace, 'private'::regnamespace)
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid
        and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] @> c.conkey
        and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] <@ c.conkey
    )
  order by 1));

-- Each table has at most one permissive policy per role and action (the
-- Performance Advisor's multiple_permissive_policies).
select pg_temp.check('one permissive policy per table, role and action', array(
  select format('%s.%s %s %s', schemaname, tablename, r, cmd) from (
    select p.schemaname, p.tablename, unnest(p.roles) r, a.cmd
    from pg_policies p
    cross join lateral unnest(case when p.cmd = 'ALL' then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array[p.cmd] end) a(cmd)
    where p.permissive = 'PERMISSIVE' and p.schemaname = 'public'
  ) x
  group by 1
  having count(*) > 1
  order by 1));

do $$ begin
  if exists (select 1 from failures) then
    raise exception '% rule(s) broken', (select count(*) from failures);
  end if;
end $$;
