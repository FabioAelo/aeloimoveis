-- AELO Imóveis V52.1 — Regras da hospedagem por imóvel
-- Execute uma única vez no SQL Editor do Supabase.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS allow_children boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_babies boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_pets boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_pet_size text,
  ADD COLUMN IF NOT EXISTS allow_smoking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_parties boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS season_rules text;

CREATE INDEX IF NOT EXISTS properties_season_rules_idx
ON public.properties(allow_pets, allow_smoking, allow_parties);

NOTIFY pgrst, 'reload schema';
