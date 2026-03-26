-- ============================================
-- RESET: Drop everything before fresh setup
-- Run this FIRST, then run SETUP_ALL.sql
-- ============================================

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS public.community_averages CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS set_updated_at ON public.applications;

-- Drop functions
DROP FUNCTION IF EXISTS public.refresh_community_averages();
DROP FUNCTION IF EXISTS public.update_updated_at();
DROP FUNCTION IF EXISTS public.claim_application(uuid, text);

-- Drop policies
DROP POLICY IF EXISTS "Open read applications" ON public.applications;
DROP POLICY IF EXISTS "Open insert applications" ON public.applications;
DROP POLICY IF EXISTS "Open update applications" ON public.applications;
DROP POLICY IF EXISTS "Open delete applications" ON public.applications;

DROP POLICY IF EXISTS "Open read step_events" ON public.step_events;
DROP POLICY IF EXISTS "Open insert step_events" ON public.step_events;
DROP POLICY IF EXISTS "Open update step_events" ON public.step_events;
DROP POLICY IF EXISTS "Open delete step_events" ON public.step_events;

DROP POLICY IF EXISTS "Open read messages" ON public.messages;
DROP POLICY IF EXISTS "Open insert messages" ON public.messages;
DROP POLICY IF EXISTS "Open delete messages" ON public.messages;

-- Remove from realtime publication (ignore error if not there)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.step_events CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;

-- Done
SELECT 'Reset complete — now run SETUP_ALL.sql' AS status;
