-- V42.1 — Corretor parceiro
alter table public.properties
add column if not exists partner_name text;

alter table public.properties
add column if not exists partner_creci text;

alter table public.properties
drop constraint if exists properties_sold_by_check;

update public.properties
set sold_by = 'parceiro'
where sold_by = 'terceiro';

alter table public.properties
add constraint properties_sold_by_check
check (sold_by is null or sold_by in ('aelo','parceiro'));
