-- ============================================
-- Update steps to match actual IRCC process
-- Run AFTER 004_add_pin_hash.sql
-- ============================================

-- Drop old constraint and add new one with all 11 steps
ALTER TABLE public.step_events DROP CONSTRAINT IF EXISTS step_events_step_id_check;
ALTER TABLE public.step_events ADD CONSTRAINT step_events_step_id_check
  CHECK (step_id IN (
    'submitted', 'aor', 'bil', 'sponsor_eligibility',
    'medical', 'pa_eligibility', 'background',
    'pre_arrival', 'portal1', 'portal2', 'ecopr'
  ));

-- Add MEI type column (Upfront or Request)
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS mei_type text;

-- Add visa_country for PA's current visa country
-- (already exists from 003 but ensure it's there)
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS visa_country text;

-- Refresh the community_averages materialized view definition
DROP MATERIALIZED VIEW IF EXISTS public.community_averages;

CREATE MATERIALIZED VIEW public.community_averages AS
WITH step_pairs(curr_step, prev_step) AS (
  VALUES
    ('aor', 'submitted'),
    ('bil', 'aor'),
    ('sponsor_eligibility', 'bil'),
    ('medical', 'sponsor_eligibility'),
    ('pa_eligibility', 'medical'),
    ('background', 'pa_eligibility'),
    ('pre_arrival', 'background'),
    ('portal1', 'pre_arrival'),
    ('portal2', 'portal1'),
    ('ecopr', 'portal2')
),
step_durations AS (
  SELECT
    a.stream,
    a.country_origin,
    se_curr.step_id,
    se_curr.event_date - se_prev.event_date AS days_taken
  FROM step_pairs sp
  JOIN public.step_events se_curr ON se_curr.step_id = sp.curr_step
  JOIN public.step_events se_prev ON se_prev.step_id = sp.prev_step
    AND se_curr.application_id = se_prev.application_id
  JOIN public.applications a ON a.id = se_curr.application_id
  WHERE se_curr.event_date - se_prev.event_date >= 0
)
SELECT
  stream,
  country_origin,
  step_id,
  count(*)::int AS sample_size,
  round(avg(days_taken))::int AS avg_days,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY days_taken))::int AS median_days,
  min(days_taken)::int AS min_days,
  max(days_taken)::int AS max_days
FROM step_durations
GROUP BY stream, country_origin, step_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_averages_unique
  ON public.community_averages (stream, country_origin, step_id);

GRANT SELECT ON public.community_averages TO anon, authenticated;
