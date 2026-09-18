-- AELO Imóveis V51.12 — marcação segura de reservas de TESTE
-- Execute no SQL Editor do Supabase. Não apaga nenhuma reserva.
alter table public.season_reservations
  add column if not exists is_test boolean not null default false;

-- Mantém atualização apenas para o proprietário do imóvel.
drop policy if exists "owners can update season reservations" on public.season_reservations;
create policy "owners can update season reservations"
on public.season_reservations for update to authenticated
using (exists (select 1 from public.properties p where p.id=season_reservations.property_id and p.owner_id=auth.uid()))
with check (exists (select 1 from public.properties p where p.id=season_reservations.property_id and p.owner_id=auth.uid()));

-- Exclusão segura: somente registros explicitamente marcados como teste e pertencentes ao proprietário.
drop policy if exists "owners can delete test season reservations" on public.season_reservations;
create policy "owners can delete test season reservations"
on public.season_reservations for delete to authenticated
using (
  is_test = true
  and exists (select 1 from public.properties p where p.id=season_reservations.property_id and p.owner_id=auth.uid())
);

create index if not exists season_reservations_is_test_idx on public.season_reservations(is_test);
notify pgrst, 'reload schema';
