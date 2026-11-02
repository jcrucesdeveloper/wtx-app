-- Minimal stand-in for what Supabase's Realtime service creates on a hosted
-- project (realtime.messages and realtime.topic()), only if it's missing.
create schema if not exists realtime;
grant usage on schema realtime to postgres, anon, authenticated, service_role;

do $$
begin
  if to_regclass('realtime.messages') is null then
    create table realtime.messages (
      topic       text not null,
      extension   text not null,
      payload     jsonb,
      event       text,
      private     boolean default false,
      updated_at  timestamp without time zone not null default now(),
      inserted_at timestamp without time zone not null default now(),
      id          uuid not null default gen_random_uuid(),
      primary key (id, inserted_at)
    );
    alter table realtime.messages enable row level security;
    grant select, insert, update on realtime.messages to anon, authenticated;
    alter table realtime.messages owner to postgres;
  end if;
  if to_regprocedure('realtime.topic()') is null then
    create function realtime.topic() returns text
    language sql stable as $f$ select nullif(current_setting('realtime.topic', true), '')::text $f$;
    grant execute on function realtime.topic() to anon, authenticated;
  end if;
end;
$$;
