-- AELO Imóveis V54.4
ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS create_properties boolean NOT NULL DEFAULT false;

UPDATE public.user_permissions up
SET create_properties = true
FROM public.user_profiles p
WHERE p.user_id = up.user_id AND p.role = 'admin';

CREATE OR REPLACE FUNCTION public.aelo_has_permission(permission_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE permission_name
      WHEN 'view_properties' THEN up.view_properties
      WHEN 'create_properties' THEN up.create_properties
      WHEN 'edit_properties' THEN up.edit_properties
      WHEN 'publish_properties' THEN up.publish_properties
      WHEN 'view_leads' THEN up.view_leads
      WHEN 'edit_leads' THEN up.edit_leads
      WHEN 'view_reservations' THEN up.view_reservations
      WHEN 'edit_reservations' THEN up.edit_reservations
      WHEN 'view_sales' THEN up.view_sales
      WHEN 'edit_sales' THEN up.edit_sales
      WHEN 'view_analytics' THEN up.view_analytics
      WHEN 'manage_users' THEN up.manage_users
      ELSE false END
    FROM public.user_permissions up
    JOIN public.user_profiles p ON p.user_id = up.user_id
    WHERE up.user_id = auth.uid() AND p.is_active = true
  ), false);
$$;

DROP POLICY IF EXISTS "aelo_restrict_properties_select" ON public.properties;
CREATE POLICY "aelo_restrict_properties_select" ON public.properties AS RESTRICTIVE FOR SELECT TO public
USING (auth.role() = 'anon' OR public.aelo_has_permission('view_properties'));

DROP POLICY IF EXISTS "aelo_restrict_properties_insert" ON public.properties;
CREATE POLICY "aelo_restrict_properties_insert" ON public.properties AS RESTRICTIVE FOR INSERT TO public
WITH CHECK (public.aelo_has_permission('create_properties'));

DROP POLICY IF EXISTS "aelo_restrict_properties_update" ON public.properties;
CREATE POLICY "aelo_restrict_properties_update" ON public.properties AS RESTRICTIVE FOR UPDATE TO public
USING (public.aelo_has_permission('edit_properties'))
WITH CHECK (public.aelo_has_permission('edit_properties'));

DROP POLICY IF EXISTS "aelo_restrict_properties_delete" ON public.properties;
CREATE POLICY "aelo_restrict_properties_delete" ON public.properties AS RESTRICTIVE FOR DELETE TO public
USING (public.aelo_has_permission('edit_properties'));

DROP POLICY IF EXISTS "aelo_restrict_leads_select" ON public.leads;
CREATE POLICY "aelo_restrict_leads_select" ON public.leads AS RESTRICTIVE FOR SELECT TO public
USING (auth.role() <> 'anon' AND public.aelo_has_permission('view_leads'));

DROP POLICY IF EXISTS "aelo_restrict_leads_insert" ON public.leads;
CREATE POLICY "aelo_restrict_leads_insert" ON public.leads AS RESTRICTIVE FOR INSERT TO public
WITH CHECK (auth.role() = 'anon' OR public.aelo_has_permission('edit_leads'));

DROP POLICY IF EXISTS "aelo_restrict_leads_update" ON public.leads;
CREATE POLICY "aelo_restrict_leads_update" ON public.leads AS RESTRICTIVE FOR UPDATE TO public
USING (public.aelo_has_permission('edit_leads')) WITH CHECK (public.aelo_has_permission('edit_leads'));

DROP POLICY IF EXISTS "aelo_restrict_leads_delete" ON public.leads;
CREATE POLICY "aelo_restrict_leads_delete" ON public.leads AS RESTRICTIVE FOR DELETE TO public
USING (public.aelo_has_permission('edit_leads'));

DROP POLICY IF EXISTS "aelo_restrict_reservations_select" ON public.season_reservations;
CREATE POLICY "aelo_restrict_reservations_select" ON public.season_reservations AS RESTRICTIVE FOR SELECT TO public
USING (auth.role() = 'anon' OR public.aelo_has_permission('view_reservations'));

DROP POLICY IF EXISTS "aelo_restrict_reservations_insert" ON public.season_reservations;
CREATE POLICY "aelo_restrict_reservations_insert" ON public.season_reservations AS RESTRICTIVE FOR INSERT TO public
WITH CHECK (auth.role() = 'anon' OR public.aelo_has_permission('edit_reservations'));

DROP POLICY IF EXISTS "aelo_restrict_reservations_update" ON public.season_reservations;
CREATE POLICY "aelo_restrict_reservations_update" ON public.season_reservations AS RESTRICTIVE FOR UPDATE TO public
USING (public.aelo_has_permission('edit_reservations')) WITH CHECK (public.aelo_has_permission('edit_reservations'));

DROP POLICY IF EXISTS "aelo_restrict_reservations_delete" ON public.season_reservations;
CREATE POLICY "aelo_restrict_reservations_delete" ON public.season_reservations AS RESTRICTIVE FOR DELETE TO public
USING (public.aelo_has_permission('edit_reservations'));

DROP POLICY IF EXISTS "aelo_restrict_sales_select" ON public.sale_processes;
CREATE POLICY "aelo_restrict_sales_select" ON public.sale_processes AS RESTRICTIVE FOR SELECT TO public
USING (public.aelo_has_permission('view_sales'));

DROP POLICY IF EXISTS "aelo_restrict_sales_insert" ON public.sale_processes;
CREATE POLICY "aelo_restrict_sales_insert" ON public.sale_processes AS RESTRICTIVE FOR INSERT TO public
WITH CHECK (public.aelo_has_permission('edit_sales'));

DROP POLICY IF EXISTS "aelo_restrict_sales_update" ON public.sale_processes;
CREATE POLICY "aelo_restrict_sales_update" ON public.sale_processes AS RESTRICTIVE FOR UPDATE TO public
USING (public.aelo_has_permission('edit_sales')) WITH CHECK (public.aelo_has_permission('edit_sales'));

DROP POLICY IF EXISTS "aelo_restrict_sales_delete" ON public.sale_processes;
CREATE POLICY "aelo_restrict_sales_delete" ON public.sale_processes AS RESTRICTIVE FOR DELETE TO public
USING (public.aelo_has_permission('edit_sales'));

NOTIFY pgrst, 'reload schema';
