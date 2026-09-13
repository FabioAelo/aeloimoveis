-- V43 — Analytics anônimo do site AELO
create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  event_type text not null check (event_type in ('page_view','search')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists site_events_created_at_idx on public.site_events(created_at desc);
create index if not exists site_events_visitor_id_idx on public.site_events(visitor_id);
create index if not exists site_events_type_idx on public.site_events(event_type);

alter table public.site_events enable row level security;

drop policy if exists "public can record site events" on public.site_events;
create policy "public can record site events"
on public.site_events for insert
to anon, authenticated
with check (event_type in ('page_view','search') and length(visitor_id) between 10 and 120);

drop policy if exists "authenticated can read site events" on public.site_events;
create policy "authenticated can read site events"
on public.site_events for select
to authenticated
using (true);
