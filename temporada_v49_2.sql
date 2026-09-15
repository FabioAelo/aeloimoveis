-- AELO Imóveis — V49.2 — suporte a aluguel por temporada
-- Execute no Supabase SQL Editor antes de cadastrar imóveis de temporada.

alter table public.properties
  add column if not exists nightly_price numeric(14,2),
  add column if not exists weekend_price numeric(14,2),
  add column if not exists high_season_price numeric(14,2),
  add column if not exists cleaning_fee numeric(14,2),
  add column if not exists min_nights integer default 1,
  add column if not exists max_guests integer,
  add column if not exists checkin_time text,
  add column if not exists checkout_time text,
  add column if not exists property_category text;

-- A versão original permitia apenas venda, aluguel e investimento.
alter table public.properties drop constraint if exists properties_type_check;
alter table public.properties
  add constraint properties_type_check
  check (type in ('venda','aluguel','temporada','investimento'));

update public.properties
set min_nights = 1
where min_nights is null;

-- Garante que o navegador possa consultar os campos novos normalmente via a tabela já existente.
-- Não altera RLS nem permissões existentes.
