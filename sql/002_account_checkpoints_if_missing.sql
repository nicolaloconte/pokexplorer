-- Only needed if public.pokexplorer_saves is absent. Recreates the exact
-- checkpoint table used by js/auth-cloud.js without deleting any existing run.
-- Apply with SQL Editor after checking the actual database; additive operation.
begin;
create table if not exists public.pokexplorer_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 1 check (revision >= 1),
  run jsonb not null check (jsonb_typeof(run) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.pokexplorer_saves enable row level security;
revoke all on public.pokexplorer_saves from anon;
grant select,insert,update on public.pokexplorer_saves to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pokexplorer_saves' and policyname='pokexplorer_saves_select_owner') then
    create policy pokexplorer_saves_select_owner on public.pokexplorer_saves for select to authenticated using ((select auth.uid())=user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pokexplorer_saves' and policyname='pokexplorer_saves_insert_owner') then
    create policy pokexplorer_saves_insert_owner on public.pokexplorer_saves for insert to authenticated with check ((select auth.uid())=user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pokexplorer_saves' and policyname='pokexplorer_saves_update_owner') then
    create policy pokexplorer_saves_update_owner on public.pokexplorer_saves for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
  end if;
end $$;
commit;
