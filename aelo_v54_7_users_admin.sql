-- AELO IMÓVEIS V54.7 — suporte à Central de Usuários
-- Execute no Supabase SQL Editor antes de usar a Central de Usuários.
-- A criação/alteração/exclusão de contas Auth é feita pela Edge Function,
-- nunca pelo navegador com service_role.

create or replace function public.aelo_can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles p
    join public.user_permissions up on up.user_id = p.user_id
    where p.user_id = auth.uid()
      and p.is_active = true
      and (p.role = 'admin' or up.manage_users = true)
  );
$$;

grant execute on function public.aelo_can_manage_users() to authenticated;

-- Mantém o sincronizador legado disponível para a base V54.6.
create or replace function public.aelo_sync_auth_profiles()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  n integer := 0;
  u record;
begin
  if not public.aelo_can_manage_users() then
    raise exception 'Sem permissão para sincronizar usuários';
  end if;

  for u in select id, email from auth.users loop
    insert into public.user_profiles(user_id, full_name, email, role, is_active)
    values (u.id, coalesce(nullif(u.email,''), 'Usuário'), u.email, 'consulta', true)
    on conflict (user_id) do update set email=excluded.email, updated_at=now();

    insert into public.user_permissions(user_id)
    values (u.id)
    on conflict (user_id) do nothing;
    n := n + 1;
  end loop;
  return n;
end;
$$;

grant execute on function public.aelo_sync_auth_profiles() to authenticated;

-- Recarrega o cache de schema do PostgREST.
notify pgrst, 'reload schema';
