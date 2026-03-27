-- ============================================
-- Add reactions table for milestone celebrations
-- Run in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.reactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  step_id         text NOT NULL,
  emoji           text NOT NULL DEFAULT '🎉',
  browser_id      text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(application_id, step_id, browser_id)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open read reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Open insert reactions" ON public.reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Open delete reactions" ON public.reactions FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_reactions_app ON public.reactions(application_id);

SELECT 'Reactions table created!' AS status;
