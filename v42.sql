-- AELO IMÓVEIS — V42
-- Execute uma única vez no SQL Editor do Supabase.
alter table public.properties add column if not exists commercial_status text not null default 'disponivel';
alter table public.properties add column if not exists sold_by text;
alter table public.properties add column if not exists sold_at timestamptz;
alter table public.properties drop constraint if exists properties_commercial_status_check;
alter table public.properties add constraint properties_commercial_status_check check (commercial_status in ('disponivel','negociacao','vendido','indisponivel'));
alter table public.properties drop constraint if exists properties_sold_by_check;
alter table public.properties add constraint properties_sold_by_check check (sold_by is null or sold_by in ('aelo','terceiro'));
