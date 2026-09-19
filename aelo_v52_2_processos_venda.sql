-- AELO IMÓVEIS V52.2 - PROCESSOS DE VENDA
create table if not exists public.sale_processes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  buyer_name text,
  buyer_whatsapp text,
  buyer_email text,
  responsible_name text,
  partner_broker_id uuid references public.partner_brokers(id) on delete set null,
  status text not null default 'em_andamento' check (status in ('em_andamento','pausado','concluido','cancelado')),
  current_stage text not null default 'captacao',
  asking_price numeric(14,2),
  offer_price numeric(14,2),
  financing boolean not null default false,
  exchange_property boolean not null default false,
  notes text,
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists idx_sale_processes_property on public.sale_processes(property_id);
create index if not exists idx_sale_processes_status on public.sale_processes(status);
create index if not exists idx_sale_processes_updated on public.sale_processes(updated_at desc);

create or replace function public.set_sale_process_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sale_processes_updated_at on public.sale_processes;
create trigger trg_sale_processes_updated_at
before update on public.sale_processes
for each row execute function public.set_sale_process_updated_at();

alter table public.sale_processes enable row level security;

drop policy if exists "authenticated can view sale processes" on public.sale_processes;
drop policy if exists "authenticated can insert sale processes" on public.sale_processes;
drop policy if exists "authenticated can update sale processes" on public.sale_processes;
drop policy if exists "authenticated can delete sale processes" on public.sale_processes;

create policy "authenticated can view sale processes"
on public.sale_processes for select to authenticated using (true);

create policy "authenticated can insert sale processes"
on public.sale_processes for insert to authenticated with check (true);

create policy "authenticated can update sale processes"
on public.sale_processes for update to authenticated using (true) with check (true);

create policy "authenticated can delete sale processes"
on public.sale_processes for delete to authenticated using (true);

grant select, insert, update, delete on public.sale_processes to authenticated;

select 'sale_processes criada/atualizada com sucesso' as resultado;
