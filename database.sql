-- AELO IMÓVEIS — V8
-- Execute este script no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('venda','aluguel','investimento')),
  badge text not null default 'VENDA',
  title text not null,
  location text not null,
  price numeric(14,2) not null default 0,
  price_label text,
  bedrooms integer default 0,
  suites integer default 0,
  parking integer default 0,
  area_m2 numeric(10,2),
  image_url text,
  description text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Galeria de até 10 fotos por imóvel. A primeira também fica em image_url para compatibilidade.
alter table public.properties
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

alter table public.properties enable row level security;

drop policy if exists "public can view published properties" on public.properties;
create policy "public can view published properties"
on public.properties for select
to anon, authenticated
using (is_published = true);

drop policy if exists "owners can view own properties" on public.properties;
create policy "owners can view own properties"
on public.properties for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "owners can insert properties" on public.properties;
create policy "owners can insert properties"
on public.properties for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "owners can update properties" on public.properties;
create policy "owners can update properties"
on public.properties for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "owners can delete properties" on public.properties;
create policy "owners can delete properties"
on public.properties for delete
to authenticated
using (auth.uid() = owner_id);

-- Bucket para fotos dos imóveis.
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

drop policy if exists "public can view property images" on storage.objects;
create policy "public can view property images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'property-images');

drop policy if exists "authenticated can upload property images" on storage.objects;
create policy "authenticated can upload property images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'property-images');

drop policy if exists "authenticated can update property images" on storage.objects;
create policy "authenticated can update property images"
on storage.objects for update
to authenticated
using (bucket_id = 'property-images')
with check (bucket_id = 'property-images');

drop policy if exists "authenticated can delete property images" on storage.objects;
create policy "authenticated can delete property images"
on storage.objects for delete
to authenticated
using (bucket_id = 'property-images');


-- AELO IMÓVEIS — V25
-- Execute este script uma única vez no SQL Editor do Supabase.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  whatsapp text not null,
  interest text not null default 'Atendimento geral',
  region text,
  budget text,
  message text,
  source text not null default 'site-chatbot'
);

alter table public.leads enable row level security;

drop policy if exists "public can create chatbot leads" on public.leads;
create policy "public can create chatbot leads"
on public.leads for insert
to anon, authenticated
with check (source = 'site-chatbot');

drop policy if exists "authenticated can view leads" on public.leads;
create policy "authenticated can view leads"
on public.leads for select
to authenticated
using (true);


-- V42 — status comercial do imóvel
alter table public.properties add column if not exists commercial_status text not null default 'disponivel';
alter table public.properties add column if not exists sold_by text;
alter table public.properties add column if not exists sold_at timestamptz;
alter table public.properties drop constraint if exists properties_commercial_status_check;
alter table public.properties add constraint properties_commercial_status_check check (commercial_status in ('disponivel','negociacao','vendido','indisponivel'));
alter table public.properties drop constraint if exists properties_sold_by_check;
alter table public.properties add constraint properties_sold_by_check check (sold_by is null or sold_by in ('aelo','terceiro'));
