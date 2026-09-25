-- AELO Imóveis V54.2
-- Perfis, permissões, sincronização de contas existentes e trigger para contas novas.

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text NOT NULL DEFAULT 'consulta'
    CHECK (role IN ('admin','gerente','corretor','atendimento','financeiro','consulta')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  view_properties boolean NOT NULL DEFAULT true,
  edit_properties boolean NOT NULL DEFAULT false,
  publish_properties boolean NOT NULL DEFAULT false,
  view_leads boolean NOT NULL DEFAULT true,
  edit_leads boolean NOT NULL DEFAULT false,
  view_reservations boolean NOT NULL DEFAULT true,
  edit_reservations boolean NOT NULL DEFAULT false,
  view_sales boolean NOT NULL DEFAULT true,
  edit_sales boolean NOT NULL DEFAULT false,
  view_analytics boolean NOT NULL DEFAULT false,
  manage_users boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  module text,
  record_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.aelo_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id=auth.uid() AND role='admin' AND is_active=true);
$$;

CREATE OR REPLACE FUNCTION public.aelo_can_manage_users()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.aelo_is_admin() OR EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id=auth.uid() AND role='gerente' AND is_active=true);
$$;

DROP POLICY IF EXISTS "profiles self read" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles managers all" ON public.user_profiles;
CREATE POLICY "profiles self read" ON public.user_profiles FOR SELECT TO authenticated
USING (user_id=auth.uid() OR public.aelo_can_manage_users());
CREATE POLICY "profiles managers all" ON public.user_profiles FOR ALL TO authenticated
USING (public.aelo_can_manage_users()) WITH CHECK (public.aelo_can_manage_users());

DROP POLICY IF EXISTS "permissions self read" ON public.user_permissions;
DROP POLICY IF EXISTS "permissions managers all" ON public.user_permissions;
CREATE POLICY "permissions self read" ON public.user_permissions FOR SELECT TO authenticated
USING (user_id=auth.uid() OR public.aelo_can_manage_users());
CREATE POLICY "permissions managers all" ON public.user_permissions FOR ALL TO authenticated
USING (public.aelo_can_manage_users()) WITH CHECK (public.aelo_can_manage_users());

DROP POLICY IF EXISTS "audit own insert" ON public.audit_log;
DROP POLICY IF EXISTS "audit managers read" ON public.audit_log;
CREATE POLICY "audit own insert" ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (user_id=auth.uid());
CREATE POLICY "audit managers read" ON public.audit_log FOR SELECT TO authenticated
USING (public.aelo_can_manage_users());

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;

-- Sincroniza contas Auth que já existiam antes da instalação da V54.
CREATE OR REPLACE FUNCTION public.aelo_sync_auth_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.aelo_can_manage_users() THEN
    RAISE EXCEPTION 'Apenas administradores ou gerentes podem sincronizar usuários.';
  END IF;
  INSERT INTO public.user_profiles(user_id,full_name,email,role,is_active)
  SELECT u.id,
         COALESCE(u.raw_user_meta_data->>'full_name', split_part(COALESCE(u.email,''),'@',1)),
         u.email,'consulta',true
  FROM auth.users u
  ON CONFLICT(user_id) DO UPDATE SET email=EXCLUDED.email, updated_at=now();
  INSERT INTO public.user_permissions(user_id)
  SELECT u.id FROM auth.users u
  ON CONFLICT(user_id) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aelo_sync_auth_profiles() TO authenticated;

CREATE OR REPLACE FUNCTION public.aelo_handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.user_profiles(user_id,full_name,email,role,is_active)
  VALUES(NEW.id,COALESCE(NEW.raw_user_meta_data->>'full_name',split_part(COALESCE(NEW.email,''),'@',1)),NEW.email,'consulta',true)
  ON CONFLICT(user_id) DO UPDATE SET email=EXCLUDED.email,updated_at=now();
  INSERT INTO public.user_permissions(user_id) VALUES(NEW.id) ON CONFLICT(user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_aelo ON auth.users;
CREATE TRIGGER on_auth_user_created_aelo AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.aelo_handle_new_auth_user();

NOTIFY pgrst,'reload schema';
