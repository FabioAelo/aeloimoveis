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
