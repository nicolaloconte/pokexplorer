-- Pokéxplorer Pokédex Hybrid 1.0 — proposta di migrazione (STAGING FIRST)
-- PostgreSQL / Supabase. Rivedere prima di eseguire, e usare migration history del progetto.
-- Le due tabelle mantengono progressi permanenti senza dipendere da pokexplorer_saves.
-- Non contiene secret keys.

begin;

create table if not exists public.pokexplorer_dex_species (
  user_id uuid not null references auth.users(id) on delete cascade,
  species_id smallint not null check (species_id between 1 and 151),
  first_seen_at timestamptz not null default now(),
  first_caught_at timestamptz,
  first_seen_context text,
  first_caught_context text,
  imported_from_legacy boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, species_id)
);

create table if not exists public.pokexplorer_dex_variants (
  user_id uuid not null references auth.users(id) on delete cascade,
  species_id smallint not null check (species_id between 1 and 151),
  sex text not null check (sex in ('male', 'female', 'genderless')),
  shiny boolean not null,
  first_seen_at timestamptz not null default now(),
  first_caught_at timestamptz,
  first_seen_context text,
  first_caught_context text,
  updated_at timestamptz not null default now(),
  primary key (user_id, species_id, sex, shiny)
);

-- Row ownership. Note: TO authenticated da solo non basta; owner necessario.
alter table public.pokexplorer_dex_species enable row level security;
alter table public.pokexplorer_dex_variants enable row level security;

-- In migration su schema esistente valutare nomi policy per evitare collisioni.
create policy dex_species_select_owner on public.pokexplorer_dex_species
  for select to authenticated using ((select auth.uid()) = user_id);
create policy dex_species_insert_owner on public.pokexplorer_dex_species
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy dex_species_update_owner on public.pokexplorer_dex_species
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy dex_variants_select_owner on public.pokexplorer_dex_variants
  for select to authenticated using ((select auth.uid()) = user_id);
create policy dex_variants_insert_owner on public.pokexplorer_dex_variants
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy dex_variants_update_owner on public.pokexplorer_dex_variants
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Il client usa il publishable key, ma gli UPDATE sono consentiti dall'owner:
-- le garanzie monotone sono assicurate usando la RPC sotto.
-- Non è una prevenzione completa del cheating: il giocatore controlla il browser.
revoke all on public.pokexplorer_dex_species from anon;
revoke all on public.pokexplorer_dex_variants from anon;
grant select, insert, update on public.pokexplorer_dex_species to authenticated;
grant select, insert, update on public.pokexplorer_dex_variants to authenticated;

-- Per mantenere i progressi monotoni anche se un client chiama direttamente UPDATE,
-- inseriamo un trigger che impedisce di rendere più recenti o nullare prime scoperte.
-- Non impedisce a un client malevolo di falsificare catture (vedi documentazione).
create or replace function public.pokexplorer_dex_monotone_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Do not allow any client to reassign the identity of an existing row.
  if new.user_id is distinct from old.user_id
     or new.species_id is distinct from old.species_id then
    raise exception 'Pokédex identity fields are immutable';
  end if;
  if tg_table_name = 'pokexplorer_dex_variants' then
    if new.sex is distinct from old.sex or new.shiny is distinct from old.shiny then
      raise exception 'Pokédex variant identity fields are immutable';
    end if;
  end if;
  new.first_seen_at := least(old.first_seen_at, new.first_seen_at);
  if old.first_caught_at is not null then
    if new.first_caught_at is null then
      new.first_caught_at := old.first_caught_at;
    else
      new.first_caught_at := least(old.first_caught_at, new.first_caught_at);
    end if;
  end if;
  if new.first_seen_at = old.first_seen_at then
    new.first_seen_context := coalesce(old.first_seen_context, new.first_seen_context);
  end if;
  if old.first_caught_at is not null and new.first_caught_at = old.first_caught_at then
    new.first_caught_context := coalesce(old.first_caught_context, new.first_caught_context);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger dex_species_monotone_update
  before update on public.pokexplorer_dex_species
  for each row execute function public.pokexplorer_dex_monotone_update();
create trigger dex_variant_monotone_update
  before update on public.pokexplorer_dex_variants
  for each row execute function public.pokexplorer_dex_monotone_update();

-- Una singola RPC registra atomica e idempotentemente una variante e la specie.
-- SECURITY INVOKER + RLS; nessun parametro user_id inviato dal browser.
create or replace function public.pokexplorer_record_dex_event(
  p_species_id integer,
  p_sex text,
  p_shiny boolean,
  p_event text,
  p_context text default null,
  p_occurred_at timestamptz default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_time timestamptz := coalesce(p_occurred_at, now());
  v_context text := nullif(left(btrim(coalesce(p_context, '')), 120), '');
  v_caught_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_species_id is null or p_species_id < 1 or p_species_id > 151 then
    raise exception 'Invalid Kanto species';
  end if;
  if p_sex is null or p_sex not in ('male', 'female', 'genderless') then
    raise exception 'Invalid Pokémon sex';
  end if;
  if p_shiny is null then
    raise exception 'Missing shiny flag';
  end if;
  if p_event is null or p_event not in ('seen', 'caught') then
    raise exception 'Invalid dex event';
  end if;
  -- Il tempo client è solo informativo: non permettere date future o assurde.
  v_time := least(v_time, now());
  if v_time < timestamptz '2020-01-01 00:00:00+00' then
    v_time := now();
  end if;
  v_caught_at := case when p_event = 'caught' then v_time else null end;

  insert into public.pokexplorer_dex_species as ds
    (user_id, species_id, first_seen_at, first_caught_at,
     first_seen_context, first_caught_context, imported_from_legacy)
  values
    (v_user_id, p_species_id, v_time, v_caught_at, v_context,
     case when v_caught_at is not null then v_context else null end, false)
  on conflict (user_id, species_id) do update set
    first_seen_at = least(ds.first_seen_at, excluded.first_seen_at),
    first_caught_at = case
      when ds.first_caught_at is null then excluded.first_caught_at
      when excluded.first_caught_at is null then ds.first_caught_at
      else least(ds.first_caught_at, excluded.first_caught_at) end,
    first_seen_context = case
      when excluded.first_seen_at < ds.first_seen_at then excluded.first_seen_context
      else coalesce(ds.first_seen_context, excluded.first_seen_context) end,
    first_caught_context = case
      when ds.first_caught_at is null then excluded.first_caught_context
      when excluded.first_caught_at is not null
        and excluded.first_caught_at is not null
        and excluded.first_caught_at < ds.first_caught_at
      then excluded.first_caught_context
      else coalesce(ds.first_caught_context, excluded.first_caught_context) end,
    updated_at = now();

  insert into public.pokexplorer_dex_variants as dv
    (user_id, species_id, sex, shiny, first_seen_at, first_caught_at,
     first_seen_context, first_caught_context)
  values
    (v_user_id, p_species_id, p_sex, p_shiny, v_time, v_caught_at, v_context,
     case when v_caught_at is not null then v_context else null end)
  on conflict (user_id, species_id, sex, shiny) do update set
    first_seen_at = least(dv.first_seen_at, excluded.first_seen_at),
    first_caught_at = case
      when dv.first_caught_at is null then excluded.first_caught_at
      when excluded.first_caught_at is null then dv.first_caught_at
      else least(dv.first_caught_at, excluded.first_caught_at) end,
    first_seen_context = case
      when excluded.first_seen_at < dv.first_seen_at then excluded.first_seen_context
      else coalesce(dv.first_seen_context, excluded.first_seen_context) end,
    first_caught_context = case
      when dv.first_caught_at is null then excluded.first_caught_context
      when excluded.first_caught_at is not null
        and excluded.first_caught_at is not null
        and excluded.first_caught_at < dv.first_caught_at
      then excluded.first_caught_context
      else coalesce(dv.first_caught_context, excluded.first_caught_context) end,
    updated_at = now();
end;
$$;

-- Migrazione conservativa: solo livello specie, NON inventa sesso/shiny.
-- Questo RPC è idempotente ma client-authoritative: non usarlo per leaderboard.
create or replace function public.pokexplorer_import_legacy_species(
  p_species_id integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_species_id is null or p_species_id < 1 or p_species_id > 151 then
    raise exception 'Invalid Kanto species';
  end if;
  insert into public.pokexplorer_dex_species as ds
    (user_id, species_id, first_seen_at, first_caught_at,
     first_seen_context, first_caught_context, imported_from_legacy)
  values
    (v_user_id, p_species_id, now(), now(),
     'legacy-import', 'legacy-import', true)
  on conflict (user_id, species_id) do update set
    first_caught_at = coalesce(ds.first_caught_at, excluded.first_caught_at),
    first_caught_context = coalesce(ds.first_caught_context, excluded.first_caught_context),
    imported_from_legacy = ds.imported_from_legacy or excluded.imported_from_legacy,
    updated_at = now();
end;
$$;

revoke all on function public.pokexplorer_record_dex_event(integer,text,boolean,text,text,timestamptz) from public, anon;
revoke all on function public.pokexplorer_import_legacy_species(integer) from public, anon;
grant execute on function public.pokexplorer_record_dex_event(integer,text,boolean,text,text,timestamptz) to authenticated;
grant execute on function public.pokexplorer_import_legacy_species(integer) to authenticated;

-- Trigger function va usata solo da triggers; riduciamo esposizione diretta.
revoke all on function public.pokexplorer_dex_monotone_update() from public, anon, authenticated;

commit;
