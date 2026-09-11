-- AELO IMÓVEIS — V29 CRM: acompanhamento e histórico
-- Execute uma única vez no SQL Editor do Supabase.

alter table public.leads
add column if not exists next_follow_up_at timestamptz;

create table if not exists public.lead_interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null default 'contato',
  note text not null,
  created_at timestamptz not null default now()
);

alter table public.lead_interactions enable row level security;

drop policy if exists "authenticated can view lead interactions" on public.lead_interactions;
create policy "authenticated can view lead interactions"
on public.lead_interactions for select
to authenticated
using (true);

drop policy if exists "authenticated can insert lead interactions" on public.lead_interactions;
create policy "authenticated can insert lead interactions"
on public.lead_interactions for insert
to authenticated
with check (true);

drop policy if exists "authenticated can delete lead interactions" on public.lead_interactions;
create policy "authenticated can delete lead interactions"
on public.lead_interactions for delete
to authenticated
using (true);

grant select, insert, delete on table public.lead_interactions to authenticated;
