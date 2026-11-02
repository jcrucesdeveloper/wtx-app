-- What the database does for real users: rooms, the private channel,
-- limits, blocking, the word filter, account deletion and signed-out
-- analytics. Runs as supabase_admin and switches to the `authenticated` /
-- `anon` roles the API uses. Each check prints PASS or stops the run.
\set ON_ERROR_STOP 1
\set QUIET 1
\pset tuples_only on
\pset format unaligned
set client_min_messages = notice;

create schema t;
-- Acts as a signed-in user (or anon with null) for the rest of the transaction-less session.
create function t.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then '{"role":"anon"}' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, false);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), false);
  execute case when p_uid is null then 'set role anon' else 'set role authenticated' end;
end $$;
grant usage on schema t to anon, authenticated;
grant execute on function t.as_user(uuid) to anon, authenticated;
create function t.ok(p_name text) returns void language plpgsql as $$ begin raise notice 'PASS  %', p_name; end $$;
grant execute on function t.ok(text) to anon, authenticated;

-- 1. Sign-up (as the Auth service) creates profiles through private.handle_new_user.
set role supabase_auth_admin;
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@example.com', '{"display_name":"Ana"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'ben@example.com', '{"display_name":"Ben"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000003', 'cy@example.com',  '{"display_name":"Cy"}',  'authenticated', 'authenticated');
reset role;
do $$ begin
  assert (select count(*) from public.profiles where invite_code ~ '^[A-Z2-9]{8}$') = 3, 'profiles not created';
  perform t.ok('sign-up creates a profile with an invite code');
end $$;

-- 2. Internals are not reachable: anon has no access to the schema, a
--    signed-in user can't call the internal-only functions, and none of them
--    is in public (the API's schema) any more.
select t.as_user(null);
do $$ begin
  begin perform private.is_blocked_with(gen_random_uuid()); raise exception 'anon reached private';
  exception when insufficient_privilege then perform t.ok('anon cannot use the private schema'); end;
end $$;
reset role;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
do $$ begin
  begin perform private.can_view_profile(gen_random_uuid()); raise exception 'internal function callable';
  exception when insufficient_privilege then perform t.ok('signed-in users cannot call internal functions'); end;
end $$;
reset role;

-- 3. Rooms: Ana creates, Ben joins; they see each other; Cy sees nothing.
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
create temp table r on commit preserve rows as select * from public.create_room('Push A', 'Push day', 'kg');
grant select on r to authenticated;
reset role;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
do $$ declare v public.rooms; begin
  select * into v from public.join_room((select code from r));
  assert v.id = (select id from r), 'join failed';
  assert (select count(*) from public.profiles) = 2, 'roommate profile not visible';
  perform t.ok('join by code; roommates see each other');
end $$;
reset role;
select t.as_user('cccccccc-0000-0000-0000-000000000003');
do $$ begin
  assert (select count(*) from public.rooms) = 0 and (select count(*) from public.profiles) = 1, 'outsider sees the room';
  perform t.ok('a non-member sees neither the room nor its people');
end $$;
reset role;

-- 4. The room's private Realtime channel: members only.
do $$ begin perform set_config('realtime.topic', 'room:' || (select id from r), false); end $$;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
do $$ begin
  insert into realtime.messages (topic, extension, event, payload)
  values (current_setting('realtime.topic'), 'broadcast', 'reaction', '{}');
  assert (select count(*) from realtime.messages) = 1, 'member cannot listen';
  perform t.ok('a member can send to and listen on the room channel');
end $$;
reset role;
select t.as_user('cccccccc-0000-0000-0000-000000000003');
do $$ begin
  assert (select count(*) from realtime.messages) = 0, 'outsider can listen';
  begin
    insert into realtime.messages (topic, extension, event, payload)
    values (current_setting('realtime.topic'), 'broadcast', 'reaction', '{}');
    raise exception 'outsider could send';
  exception when insufficient_privilege then perform t.ok('a non-member can neither listen nor send'); end;
end $$;
reset role;
do $$ begin perform set_config('realtime.topic', 'other:topic', false); end $$;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
do $$ begin
  assert (select count(*) from realtime.messages) = 0, 'other topics readable';
  perform t.ok('other topics stay closed');
end $$;
reset role;

-- 5. The host's plan goes through set_room_routine; a member can't set it.
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
do $$ declare v public.rooms; begin
  select * into v from public.set_room_routine((select id from r), '{1,0}', '{}', '{Dips}', '{"0":"Incline Press"}', 1::smallint);
  assert v.order_version = 1 and v.added_exercises = '{Dips}', 'plan not set';
  perform t.ok('the host sets the room plan');
end $$;
reset role;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
do $$ begin
  begin perform public.set_room_routine((select id from r), '{0,1}', '{}', '{}', '{}', null); raise exception 'member set the plan';
  exception when raise_exception then
    if sqlerrm <> 'room_not_found' then raise; end if;
    perform t.ok('a member cannot set the plan');
  end;
end $$;
reset role;

-- 6. Set logs: 500 per person per room.
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
update public.rooms set status = 'active' where id = (select id from r);
do $$ begin
  insert into public.room_set_logs (id, room_id, user_id, exercise_name, set_type, weight, reps)
  select gen_random_uuid(), (select id from r), auth.uid(), 'Bench', 'number', 60, 5 from generate_series(1, 500);
  begin
    insert into public.room_set_logs (id, room_id, user_id, exercise_name, set_type)
    values (gen_random_uuid(), (select id from r), auth.uid(), 'Bench', 'number');
    raise exception '501st set accepted';
  exception when raise_exception then
    if sqlerrm <> 'room_set_limit' then raise; end if;
    perform t.ok('the 501st set in a room is refused');
  end;
end $$;
reset role;

-- 7. Finishing the room closes it and makes the pair follow each other.
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
update public.room_members set finished_at = now() where user_id = auth.uid();
reset role;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
update public.room_members set finished_at = now() where user_id = auth.uid();
do $$ begin
  assert (select status from public.rooms) = 'finished', 'room not finished';
  assert (select count(*) from public.follows) = 2, 'no mutual follow';
  perform t.ok('room finishes and the pair follow each other');
end $$;
reset role;

-- 8. Word filter on profile edits (runs as the caller through private).
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
update public.profiles set bio = 'Leg day forever' where id = auth.uid();
do $$ begin
  begin update public.profiles set display_name = 'puta' where id = auth.uid(); raise exception 'filter bypassed';
  exception when check_violation then perform t.ok('the word filter refuses a slur, allows a normal bio'); end;
end $$;
reset role;

-- 9. Blocking hides both people and removes the follows.
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select public.block_user('aaaaaaaa-0000-0000-0000-000000000001');
reset role;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from public.profiles) = 1, 'blocked pair still visible';
  assert (select count(*) from public.follows) = 0, 'follows survived the block';
  perform t.ok('a block hides both people and removes follows');
end $$;
reset role;

-- 9b. Host handoff, likers, routine limit and code rate limit — the
--     functions folded in from dev, run once each through their private helpers.
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
create temp table r2 on commit preserve rows as select * from public.create_room('Pull A', 'Pull day', 'kg');
grant select on r2 to authenticated;
reset role;
select t.as_user('cccccccc-0000-0000-0000-000000000003');
do $$ begin perform public.join_room((select code from r2)); end $$;
reset role;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
update public.rooms set status = 'active' where id = (select id from r2);
select public.room_host_beat((select id from r2));
reset role;
select t.as_user('cccccccc-0000-0000-0000-000000000003');
do $$ begin
  begin perform public.claim_room_host((select id from r2)); raise exception 'claimed from a present host';
  exception when raise_exception then
    if sqlerrm <> 'host_present' then raise; end if;
    perform t.ok('a member cannot take over from a host seen just now');
  end;
end $$;
reset role;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.leave_room((select id from r2));
reset role;
do $$ begin
  assert (select host_id from public.rooms where id = (select id from r2)) = 'cccccccc-0000-0000-0000-000000000003', 'host not passed on';
  assert (select status from public.rooms where id = (select id from r2)) = 'active', 'room ended too early';
  perform t.ok('the host leaves: the role passes to the member still working out');
end $$;
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select public.leave_room((select id from r2));
reset role;
do $$ begin
  assert (select status from public.rooms where id = (select id from r2)) = 'finished', 'room not finished';
  perform t.ok('the last member leaves: the room ends');
end $$;

select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.sessions (id, user_id, raw_text, shared) values ('eeeeeeee-0000-0000-0000-000000000005', auth.uid(), 'Pull day', true);
reset role;
select t.as_user('cccccccc-0000-0000-0000-000000000003');
do $$ begin perform public.follow_user('aaaaaaaa-0000-0000-0000-000000000001'); end $$;
insert into public.session_kudos (session_id, user_id) values ('eeeeeeee-0000-0000-0000-000000000005', auth.uid());
reset role;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
do $$ begin
  assert (select array_agg(display_name) from public.get_session_likers('eeeeeeee-0000-0000-0000-000000000005')) = '{Cy}', 'likers wrong';
  perform t.ok('get_session_likers lists who liked a post');
end $$;
reset role;

select t.as_user('cccccccc-0000-0000-0000-000000000003');
do $$ begin
  insert into public.routines (id, user_id, filename, raw_text)
  select gen_random_uuid(), auth.uid(), 'r' || g || '.wtt', 'Squat 5x5' from generate_series(1, 300) g;
  begin
    insert into public.routines (id, user_id, filename, raw_text) values (gen_random_uuid(), auth.uid(), 'one-more.wtt', 'Squat 5x5');
    raise exception '301st routine accepted';
  exception when raise_exception then
    if sqlerrm <> 'routine_limit' then raise; end if;
    perform t.ok('the 301st live routine is refused');
  end;
  delete from public.routines where user_id = auth.uid();
end $$;
do $$ begin
  for i in 1..10 loop
    perform public.join_room('ZZZZZZ');
  end loop;
  begin perform public.join_room('ZZZZZZ'); raise exception 'no limit on wrong codes';
  exception when raise_exception then
    if sqlerrm <> 'rate_limited' then raise; end if;
    perform t.ok('the 11th wrong room code in 10 minutes is refused');
  end;
end $$;
reset role;

-- 10. Storage budget: ~50 MB of synced data per account.
select t.as_user('cccccccc-0000-0000-0000-000000000003');
do $$ declare n int := 0; begin
  begin
    loop
      insert into public.sessions (id, user_id, raw_text) values (gen_random_uuid(), auth.uid(), repeat('x', 190000));
      n := n + 1;
      exit when n > 400;
    end loop;
    raise exception 'no storage limit after % sessions', n;
  exception when raise_exception then
    if sqlerrm <> 'storage_quota_exceeded' then raise; end if;
    assert n between 250 and 300, format('limit hit after %s sessions', n);
    perform t.ok(format('storage limit stops writes at ~50 MB (%s sessions of 190 KB)', n));
  end;
  delete from public.sessions where id in (select id from public.sessions limit 10);
  insert into public.sessions (id, user_id, raw_text) values (gen_random_uuid(), auth.uid(), repeat('x', 190000));
  update public.sessions set shared = true where id in (select id from public.sessions limit 1);
  perform t.ok('deleting frees space; small updates still go through');
end $$;
reset role;

-- 11. Sections and routines sync; deleting an account cascades cleanly
--     (including the routines.section_id set-null and the usage row).
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.routine_sections (id, user_id, name, color) values ('dddddddd-0000-0000-0000-000000000004', auth.uid(), 'Push', '#ff0000');
insert into public.routines (id, user_id, section_id, filename, raw_text)
values (gen_random_uuid(), auth.uid(), 'dddddddd-0000-0000-0000-000000000004', 'push.wtt', 'Bench 3x5');
reset role;
do $$ begin
  assert (select bytes from private.account_usage where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') > 0, 'usage not tracked';
end $$;
set role supabase_auth_admin;
delete from auth.users where id in ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003');
reset role;
do $$ begin
  assert (select count(*) from private.account_usage) = 0, 'usage rows left behind';
  assert (select count(*) from public.routines) + (select count(*) from public.sessions) = 0, 'data left behind';
  perform t.ok('deleting an account removes all of its data');
end $$;

-- 12. Anonymous analytics still work (the throttle trigger lives in private).
select t.as_user(null);
insert into public.app_events (event, platform, app_version, source) values ('app_opened', 'android', '1.0.0', 'tiktok');
reset role;
do $$ begin
  assert (select count(*) from public.app_events) = 1, 'anon event dropped';
  perform t.ok('signed-out analytics insert works');
end $$;

-- 13. Limits apply to the app only: a migration (no signed-in user) can go
--     over, the next app write is refused, and a recount rebuilds totals.
do $$ begin
  insert into public.sessions (id, user_id, raw_text)
  select gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002', repeat('y', 190000)
  from generate_series(1, 300);
  perform t.ok('a migration-style bulk write is never refused by the limit');
end $$;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
do $$ begin
  begin
    insert into public.sessions (id, user_id, raw_text) values (gen_random_uuid(), auth.uid(), 'Bench 3x5');
    raise exception 'app write over the limit accepted';
  exception when raise_exception then
    if sqlerrm <> 'storage_quota_exceeded' then raise; end if;
    perform t.ok('the next app write over the limit is refused');
  end;
end $$;
reset role;
do $$ declare v_before bigint; begin
  update private.account_usage set bytes = 0;
  assert private.recount_account_usage() = 1, 'recount missed accounts';
  assert (select bytes from private.account_usage where user_id = 'bbbbbbbb-0000-0000-0000-000000000002')
    = (select sum(octet_length(to_jsonb(s)::text)) from public.sessions s), 'recount total is wrong';
  perform t.ok('recount_account_usage rebuilds the totals');
end $$;
