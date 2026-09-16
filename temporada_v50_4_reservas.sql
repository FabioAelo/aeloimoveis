-- AELO V50.4 — Central de Reservas
create table if not exists public.season_reservations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  guest_name text not null,
  guest_whatsapp text not null,
  checkin date not null,
  checkout date not null,
  guests integer check (guests is null or guests > 0),
  estimated_total text,
  note text,
  status text not null default 'solicitada' check (status in ('solicitada','em_analise','confirmada','aguardando_pagamento','reservada','concluida','cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (checkout > checkin)
);
alter table public.season_reservations enable row level security;
drop policy if exists "public can create season reservation" on public.season_reservations;
create policy "public can create season reservation" on public.season_reservations for insert to anon, authenticated
with check (exists (select 1 from public.properties p where p.id=season_reservations.property_id and p.type='temporada' and p.is_published=true));
drop policy if exists "owners can view season reservations" on public.season_reservations;
create policy "owners can view season reservations" on public.season_reservations for select to authenticated
using (exists (select 1 from public.properties p where p.id=season_reservations.property_id and p.owner_id=auth.uid()));
drop policy if exists "owners can update season reservations" on public.season_reservations;
create policy "owners can update season reservations" on public.season_reservations for update to authenticated
using (exists (select 1 from public.properties p where p.id=season_reservations.property_id and p.owner_id=auth.uid()))
with check (exists (select 1 from public.properties p where p.id=season_reservations.property_id and p.owner_id=auth.uid()));
drop policy if exists "owners can delete season reservations" on public.season_reservations;
create policy "owners can delete season reservations" on public.season_reservations for delete to authenticated
using (exists (select 1 from public.properties p where p.id=season_reservations.property_id and p.owner_id=auth.uid()));
create index if not exists season_reservations_property_dates_idx on public.season_reservations(property_id,checkin,checkout);
create index if not exists season_reservations_status_idx on public.season_reservations(status,created_at desc);
notify pgrst, 'reload schema';
