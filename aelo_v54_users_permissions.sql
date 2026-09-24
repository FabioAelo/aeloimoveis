-- AELO Imóveis V54 — Usuários, perfis, permissões e auditoria
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'consulta' check (role in ('admin','gerente','corretor','atendimento','financeiro','consulta')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  view_properties boolean not null default true,
  edit_properties boolean not null default false,
  publish_properties boolean not null default false,
  view_leads boolean not null default true,
  edit_leads boolean not null default false,
  view_reservations boolean not null default true,
  edit_reservations boolean not null default false,
  view_sales boolean not null default true,
  edit_sales boolean not null default false,
  view_analytics boolean not null default false,
  manage_users boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  module text,
  record_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_audit_log_user_created on public.audit_log(user_id, created_at desc);

alter table public.user_profiles enable row level security;
alter table public.user_permissions enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.aelo_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_profiles p where p.user_id=auth.uid() and p.role='admin' and p.is_active=true); $$;

create or replace function public.aelo_can_manage_users()
returns boolean language sql stable security definer set search_path = public
as $$ select public.aelo_is_admin() or exists(select 1 from public.user_profiles p where p.user_id=auth.uid() and p.role='gerente' and p.is_active=true); $$;

-- Usuário ativo pode consultar o próprio perfil/permissões; administrador/gerente pode administrar.
drop policy if exists "profiles self read" on public.user_profiles;
drop policy if exists "profiles managers all" on public.user_profiles;
create policy "profiles self read" on public.user_profiles for select to authenticated using (user_id=auth.uid() or public.aelo_can_manage_users());
create policy "profiles managers all" on public.user_profiles for all to authenticated using (public.aelo_can_manage_users()) with check (public.aelo_can_manage_users());

drop policy if exists "permissions self read" on public.user_permissions;
drop policy if exists "permissions managers all" on public.user_permissions;
create policy "permissions self read" on public.user_permissions for select to authenticated using (user_id=auth.uid() or public.aelo_can_manage_users());
create policy "permissions managers all" on public.user_permissions for all to authenticated using (public.aelo_can_manage_users()) with check (public.aelo_can_manage_users());

drop policy if exists "audit own insert" on public.audit_log;
drop policy if exists "audit managers read" on public.audit_log;
create policy "audit own insert" on public.audit_log for insert to authenticated with check (user_id=auth.uid());
create policy "audit managers read" on public.audit_log for select to authenticated using (public.aelo_can_manage_users());

-- Expor no Data API caso ainda não esteja exposta.
notify pgrst, 'reload schema';

-- PRIMEIRO ADMINISTRADOR (substitua o e-mail abaixo pelo seu e-mail do Supabase Auth e execute uma vez):
-- insert into public.user_profiles(user_id, full_name, email, role, is_active)
-- select id, coalesce(raw_user_meta_data->>'full_name', email), email, 'admin', true
-- from auth.users where email='SEU_EMAIL_AQUI'
-- on conflict (user_id) do update set role='admin', is_active=true;
-- insert into public.user_permissions(user_id, manage_users, view_analytics)
-- select id, true, true from auth.users where email='SEU_EMAIL_AQUI'
-- on conflict (user_id) do update set manage_users=true, view_analytics=true;
