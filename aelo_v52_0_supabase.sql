-- AELO Imóveis V52.0 — dados detalhados de hóspedes da temporada
-- Execute no SQL Editor do Supabase. Seguro para bases já existentes.
ALTER TABLE public.season_reservations
  ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 1 CHECK (adults >= 0),
  ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0 CHECK (children >= 0),
  ADD COLUMN IF NOT EXISTS babies integer NOT NULL DEFAULT 0 CHECK (babies >= 0),
  ADD COLUMN IF NOT EXISTS has_pet boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pet_count integer NOT NULL DEFAULT 0 CHECK (pet_count >= 0),
  ADD COLUMN IF NOT EXISTS pet_size text,
  ADD COLUMN IF NOT EXISTS has_smoker boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS season_reservations_guest_profile_idx
ON public.season_reservations(adults, children, babies, has_pet, has_smoker);

NOTIFY pgrst, 'reload schema';
