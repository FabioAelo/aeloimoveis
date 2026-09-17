-- AELO Imóveis V51.11 — Corretores parceiros
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
-- Depois de executar, exponha public.partner_brokers na Data API.
