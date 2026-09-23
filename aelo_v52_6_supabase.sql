-- AELO IMÓVEIS V52.6 — Regras de hospedagem por imóvel
-- Execute UMA vez no SQL Editor do Supabase.
-- Seguro para executar mesmo que alguma coluna já exista.

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

-- Recarrega o cache de esquema usado pela Data API/PostgREST.
NOTIFY pgrst, 'reload schema';

SELECT 'V52.6: regras de hospedagem atualizadas com sucesso' AS resultado;
