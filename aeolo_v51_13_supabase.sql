-- AELO Imóveis V51.13 — correção segura para testes + corretores parceiros
-- Execute UMA VEZ no SQL Editor do Supabase. Não apaga nenhuma reserva.

-- 1) Marca persistente de teste
alter table public.season_reservations
  add column if not exists is_test boolean not null default false;

-- 2) Atualiza/recria a política de UPDATE do proprietário
drop policy if exists "owners can update season reservations" on public.season_reservations;
create policy "owners can update season reservations"
on public.season_reservations for update to authenticated
using (exists (select 1 from public.properties p where p.id=season_reservations.property_id and p.owner_id=auth.uid()))
with check (exists (select 1 from public.properties p where p.id=season_reservations.property_id and p.owner_id=auth.uid()));

-- 3) DELETE permitido SOMENTE para reservas marcadas como teste
drop policy if exists "owners can delete test season reservations" on public.season_reservations;
create policy "owners can delete test season reservations"
on public.season_reservations for delete to authenticated
using (
  is_test = true
  and exists (select 1 from public.properties p where p.id=season_reservations.property_id and p.owner_id=auth.uid())
);

create index if not exists season_reservations_is_test_idx
  on public.season_reservations(is_test);

-- 4) Corretores parceiros (se ainda não tiver sido criado)
create table if not exists public.partner_brokers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null, creci text, whatsapp text, email text,
  active boolean not null default true, created_at timestamptz not null default now()
);
alter table public.partner_brokers enable row level security;
drop policy if exists "owners can view partner brokers" on public.partner_brokers;
create policy "owners can view partner brokers" on public.partner_brokers for select to authenticated using (owner_id = auth.uid());
drop policy if exists "owners can insert partner brokers" on public.partner_brokers;
create policy "owners can insert partner brokers" on public.partner_brokers for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "owners can update partner brokers" on public.partner_brokers;
create policy "owners can update partner brokers" on public.partner_brokers for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owners can delete partner brokers" on public.partner_brokers;
create policy "owners can delete partner brokers" on public.partner_brokers for delete to authenticated using (owner_id = auth.uid());
create index if not exists partner_brokers_owner_name_idx on public.partner_brokers(owner_id, name);

notify pgrst, 'reload schema';
