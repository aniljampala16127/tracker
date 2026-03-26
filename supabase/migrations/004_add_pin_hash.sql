-- ============================================
-- Add PIN hash for entry-level edit protection
-- Run this in Supabase SQL Editor
-- ============================================

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS pin_hash text;

CREATE INDEX IF NOT EXISTS idx_applications_pin ON public.applications(id) WHERE pin_hash IS NOT NULL;

COMMENT ON COLUMN public.applications.pin_hash IS 'SHA-256 hash of the 4-digit PIN set by the entry creator';

-- API endpoint for claiming unclaimed entries
CREATE OR REPLACE FUNCTION public.claim_application(app_id uuid, new_pin_hash text)
RETURNS boolean AS $$
DECLARE
  current_hash text;
BEGIN
  SELECT pin_hash INTO current_hash FROM public.applications WHERE id = app_id;
  IF current_hash IS NOT NULL THEN
    RETURN false; -- already claimed
  END IF;
  UPDATE public.applications SET pin_hash = new_pin_hash WHERE id = app_id AND pin_hash IS NULL;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
