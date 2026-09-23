-- AELO Imóveis V52.15
-- CEP da localização + contador público de visitantes

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS cep text;

CREATE OR REPLACE FUNCTION public.get_public_visitor_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT visitor_id)::bigint
  FROM public.site_events
  WHERE event_type = 'page_view'
    AND visitor_id IS NOT NULL
    AND visitor_id <> '';
$$;

REVOKE ALL ON FUNCTION public.get_public_visitor_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_visitor_count() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
