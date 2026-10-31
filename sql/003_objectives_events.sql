-- Pokéxplorer Beta 1.6: account-wide, append-only objectives event ledger.
-- Safe additive migration; required for Discord cross-device progress persistence.
-- Run once in Pokexplorer Supabase project. Never publish secret/service-role keys.
create table if not exists public.pokexplorer_objective_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null check(char_length(event_id) between 1 and 180),
  kind text not null check(kind in ('run_start','run_win','catch','floor','badge','cave')),
  run_id text not null check(char_length(run_id) between 1 and 110),
  species_id integer check(species_id is null or species_id between 1 and 1025),
  shiny boolean not null default false,
  value integer check(value is null or value between 0 and 80),
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
  occurred_at timestamptz not null default now(),
  primary key(user_id,event_id)
);
alter table public.pokexplorer_objective_events enable row level security;
revoke all on public.pokexplorer_objective_events from anon;
revoke all on public.pokexplorer_objective_events from authenticated;
grant select,insert on public.pokexplorer_objective_events to authenticated;
create policy pokex_objectives_read_owner on public.pokexplorer_objective_events
  for select to authenticated using ((select auth.uid())=user_id);
create policy pokex_objectives_insert_owner on public.pokexplorer_objective_events
  for insert to authenticated with check ((select auth.uid())=user_id);
-- No update/delete grants or policies: old achievements cannot be retracted by sync.
