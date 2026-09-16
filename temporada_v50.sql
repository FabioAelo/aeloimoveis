-- AELO V50.0 — disponibilidade e períodos de tarifa para temporada

create table if not exists public.season_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'bloqueado' check (status in ('bloqueado','reservado')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create table if not exists public.season_rate_periods (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  nightly_rate numeric(14,2) not null check (nightly_rate >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.season_blocks enable row level security;
alter table public.season_rate_periods enable row level security;

drop policy if exists "public can view season blocks" on public.season_blocks;
create policy "public can view season blocks" on public.season_blocks for select to anon, authenticated using (true);

drop policy if exists "owners can manage season blocks" on public.season_blocks;
create policy "owners can manage season blocks" on public.season_blocks for all to authenticated
using (exists (select 1 from public.properties p where p.id = season_blocks.property_id and p.owner_id = auth.uid()))
with check (exists (select 1 from public.properties p where p.id = season_blocks.property_id and p.owner_id = auth.uid()));

drop policy if exists "public can view season rates" on public.season_rate_periods;
create policy "public can view season rates" on public.season_rate_periods for select to anon, authenticated using (true);

drop policy if exists "owners can manage season rates" on public.season_rate_periods;
create policy "owners can manage season rates" on public.season_rate_periods for all to authenticated
using (exists (select 1 from public.properties p where p.id = season_rate_periods.property_id and p.owner_id = auth.uid()))
with check (exists (select 1 from public.properties p where p.id = season_rate_periods.property_id and p.owner_id = auth.uid()));

create index if not exists season_blocks_property_dates_idx on public.season_blocks(property_id,start_date,end_date);
create index if not exists season_rate_property_dates_idx on public.season_rate_periods(property_id,start_date,end_date);

notify pgrst, 'reload schema';
