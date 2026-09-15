-- V49 — Aluguel por temporada AELO
alter table public.properties drop constraint if exists properties_type_check;
alter table public.properties add constraint properties_type_check check (type in ('venda','aluguel','temporada','investimento'));
alter table public.properties add column if not exists property_category text;
alter table public.properties add column if not exists nightly_price numeric(14,2);
alter table public.properties add column if not exists weekend_price numeric(14,2);
alter table public.properties add column if not exists high_season_price numeric(14,2);
alter table public.properties add column if not exists cleaning_fee numeric(14,2);
alter table public.properties add column if not exists min_nights integer;
alter table public.properties add column if not exists max_guests integer;
alter table public.properties add column if not exists checkin_time text;
alter table public.properties add column if not exists checkout_time text;
update public.properties set nightly_price = price where type = 'temporada' and nightly_price is null;
