-- AELO Imóveis V54.6 — Distribuição de leads por corretor

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_id
  ON public.leads(assigned_user_id);

CREATE OR REPLACE FUNCTION public.aelo_can_see_lead(lead_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT up.view_leads
      AND (p.role <> 'corretor' OR lead_owner = auth.uid())
    FROM public.user_permissions up
    JOIN public.user_profiles p ON p.user_id = up.user_id
    WHERE up.user_id = auth.uid()
      AND p.is_active = true
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.aelo_can_edit_lead(lead_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT up.edit_leads
      AND (p.role <> 'corretor' OR lead_owner = auth.uid())
    FROM public.user_permissions up
    JOIN public.user_profiles p ON p.user_id = up.user_id
    WHERE up.user_id = auth.uid()
      AND p.is_active = true
  ), false);
$$;

DROP POLICY IF EXISTS "aelo_restrict_leads_select" ON public.leads;
CREATE POLICY "aelo_restrict_leads_select"
ON public.leads AS RESTRICTIVE FOR SELECT TO public
USING (
  auth.role() <> 'anon'
  AND public.aelo_can_see_lead(assigned_user_id)
);

DROP POLICY IF EXISTS "aelo_restrict_leads_insert" ON public.leads;
CREATE POLICY "aelo_restrict_leads_insert"
ON public.leads AS RESTRICTIVE FOR INSERT TO public
WITH CHECK (
  auth.role() = 'anon'
  OR public.aelo_has_permission('edit_leads')
);

DROP POLICY IF EXISTS "aelo_restrict_leads_update" ON public.leads;
CREATE POLICY "aelo_restrict_leads_update"
ON public.leads AS RESTRICTIVE FOR UPDATE TO public
USING (public.aelo_can_edit_lead(assigned_user_id))
WITH CHECK (public.aelo_can_edit_lead(assigned_user_id));

DROP POLICY IF EXISTS "aelo_restrict_leads_delete" ON public.leads;
CREATE POLICY "aelo_restrict_leads_delete"
ON public.leads AS RESTRICTIVE FOR DELETE TO public
USING (public.aelo_can_edit_lead(assigned_user_id));

DROP POLICY IF EXISTS "aelo_restrict_lead_interactions_select" ON public.lead_interactions;
CREATE POLICY "aelo_restrict_lead_interactions_select"
ON public.lead_interactions AS RESTRICTIVE FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_interactions.lead_id
      AND public.aelo_can_see_lead(l.assigned_user_id)
  )
);

DROP POLICY IF EXISTS "aelo_restrict_lead_interactions_insert" ON public.lead_interactions;
CREATE POLICY "aelo_restrict_lead_interactions_insert"
ON public.lead_interactions AS RESTRICTIVE FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_interactions.lead_id
      AND public.aelo_can_edit_lead(l.assigned_user_id)
  )
);

DROP POLICY IF EXISTS "aelo_restrict_lead_interactions_update" ON public.lead_interactions;
CREATE POLICY "aelo_restrict_lead_interactions_update"
ON public.lead_interactions AS RESTRICTIVE FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_interactions.lead_id
      AND public.aelo_can_edit_lead(l.assigned_user_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_interactions.lead_id
      AND public.aelo_can_edit_lead(l.assigned_user_id)
  )
);

DROP POLICY IF EXISTS "aelo_restrict_lead_interactions_delete" ON public.lead_interactions;
CREATE POLICY "aelo_restrict_lead_interactions_delete"
ON public.lead_interactions AS RESTRICTIVE FOR DELETE TO public
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_interactions.lead_id
      AND public.aelo_can_edit_lead(l.assigned_user_id)
  )
);

NOTIFY pgrst, 'reload schema';
