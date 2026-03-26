-- ============================================
-- SponsorTrack — FULL SETUP (run this ONCE in a fresh Supabase project)
-- Paste this entire file into SQL Editor → click Run
-- ============================================

-- ==========================================
-- 1. TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initials        text NOT NULL,
  sponsor_status  text NOT NULL CHECK (sponsor_status IN ('Citizen', 'PR')),
  stream          text NOT NULL CHECK (stream IN ('Outland', 'Inland')),
  country_origin  text NOT NULL,
  visa_country    text,
  subcategory     text,
  mei_type        text,
  province        text DEFAULT 'Ontario',
  current_step    text NOT NULL DEFAULT 'submitted',
  is_complete     boolean DEFAULT false,
  notes           text,
  pin_hash        text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.step_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  step_id         text NOT NULL CHECK (step_id IN (
    'submitted', 'aor', 'bil', 'sponsor_eligibility',
    'medical', 'pa_eligibility', 'background',
    'pre_arrival', 'portal1', 'portal2', 'ecopr'
  )),
  event_date      date NOT NULL,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(application_id, step_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name    text NOT NULL DEFAULT 'Anonymous',
  body            text NOT NULL CHECK (char_length(body) <= 2000),
  application_id  uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

-- ==========================================
-- 2. ROW LEVEL SECURITY (open access)
-- ==========================================

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open read applications" ON public.applications FOR SELECT USING (true);
CREATE POLICY "Open insert applications" ON public.applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update applications" ON public.applications FOR UPDATE USING (true);
CREATE POLICY "Open delete applications" ON public.applications FOR DELETE USING (true);

CREATE POLICY "Open read step_events" ON public.step_events FOR SELECT USING (true);
CREATE POLICY "Open insert step_events" ON public.step_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update step_events" ON public.step_events FOR UPDATE USING (true);
CREATE POLICY "Open delete step_events" ON public.step_events FOR DELETE USING (true);

CREATE POLICY "Open read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Open insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Open delete messages" ON public.messages FOR DELETE USING (true);

-- ==========================================
-- 3. INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_applications_stream ON public.applications(stream);
CREATE INDEX IF NOT EXISTS idx_applications_country ON public.applications(country_origin);
CREATE INDEX IF NOT EXISTS idx_applications_step ON public.applications(current_step);
CREATE INDEX IF NOT EXISTS idx_applications_created ON public.applications(created_at);
CREATE INDEX IF NOT EXISTS idx_applications_pin ON public.applications(id) WHERE pin_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_step_events_app ON public.step_events(application_id);
CREATE INDEX IF NOT EXISTS idx_step_events_step ON public.step_events(step_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_app ON public.messages(application_id);

-- ==========================================
-- 4. MATERIALIZED VIEW
-- ==========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.community_averages AS
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
    a.stream, a.country_origin, se_curr.step_id,
    se_curr.event_date - se_prev.event_date AS days_taken
  FROM step_pairs sp
  JOIN public.step_events se_curr ON se_curr.step_id = sp.curr_step
  JOIN public.step_events se_prev ON se_prev.step_id = sp.prev_step
    AND se_curr.application_id = se_prev.application_id
  JOIN public.applications a ON a.id = se_curr.application_id
  WHERE se_curr.event_date - se_prev.event_date >= 0
)
SELECT stream, country_origin, step_id,
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

-- ==========================================
-- 5. FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.refresh_community_averages()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.community_averages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- Atomic claim function (for unclaimed entries)
CREATE OR REPLACE FUNCTION public.claim_application(app_id uuid, new_pin_hash text)
RETURNS boolean AS $$
DECLARE
  current_hash text;
BEGIN
  SELECT pin_hash INTO current_hash FROM public.applications WHERE id = app_id;
  IF current_hash IS NOT NULL THEN
    RETURN false;
  END IF;
  UPDATE public.applications SET pin_hash = new_pin_hash WHERE id = app_id AND pin_hash IS NULL;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. REALTIME
-- ==========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ==========================================
-- 7. SEED DATA (53 entries from Google Sheet)
-- ==========================================

DO $$
DECLARE
  app_id uuid;
BEGIN

  -- Row 2: A.M - PR - India - PGWP - Outland - Feb 1
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, mei_type, province, current_step)
  VALUES ('A.M', 'PR', 'Outland', 'India', 'Canada — PGWP', 'Upfront', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-01');

  -- Row 3: RE - PR - Pakistan - Canada WP - Inland - Feb 4 - AOR Mar 26
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('RE', 'PR', 'Inland', 'Pakistan', 'Canada — Work Permit', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-26');

  -- Row 4: DE7 - Citizen - Nigeria - UK - Outland - Feb 4 - AOR Mar 18
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, mei_type, province, current_step)
  VALUES ('DE7', 'Citizen', 'Outland', 'Nigeria', 'UK', 'Upfront', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-18');

  -- Row 5: RA - PR - India - Outland - Feb 4
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('RA', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');

  -- Row 6: TT - PR - India - Outland - Feb 4 - AOR Mar 18 - BIL Mar 18
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('TT', 'PR', 'Outland', 'India', 'Ontario', 'bil') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-18');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'bil', '2026-03-18');

  -- Row 7: EM - Citizen - Kenya - Outland - Feb 5 - AOR Mar 19
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('EM', 'Citizen', 'Outland', 'Kenya', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-05');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-19');

  -- Row 8: Grover - PR - India - Outland - Feb 5 - AOR Mar 19
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('Grover', 'PR', 'Outland', 'India', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-05');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-19');

  -- Row 9: GEU - PR - Nigeria - Outland - Feb 5 - AOR Mar 20
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('GEU', 'PR', 'Outland', 'Nigeria', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-05');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-20');

  -- Row 10: NP - Citizen - Pakistan - Outland - Feb 6 - AOR Mar 24
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NP', 'Citizen', 'Outland', 'Pakistan', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-06');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-24');

  -- Row 11: Angel - PR - India - Outland - Feb 6 - AOR Mar 25
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('Angel', 'PR', 'Outland', 'India', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-06');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-25');

  -- Row 12: CJ - Citizen - Chile - Outland - Feb 6 - AOR Mar 19 - BIL Mar 26 - SE Mar 26
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('CJ', 'Citizen', 'Outland', 'Chile', 'Ontario', 'sponsor_eligibility') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-06');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-19');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'bil', '2026-03-26');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'sponsor_eligibility', '2026-03-26');

  -- Row 13: AA - PR - Pakistan - Outland - Feb 7 - AOR Mar 20
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('AA', 'PR', 'Outland', 'Pakistan', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-07');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-20');

  -- Row 14: NE - Citizen - Chile - Inland - Feb 8
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NE', 'Citizen', 'Inland', 'Chile', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-08');

  -- Row 15: AT - PR - Morocco - Outland - Feb 8 - AOR Mar 24
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('AT', 'PR', 'Outland', 'Morocco', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-08');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-24');

  -- Row 16: JC - Citizen - Philippines - Outland - Feb 10 - AOR Mar 26
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('JC', 'Citizen', 'Outland', 'Philippines', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-10');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-26');

  -- Row 17: Nikkolai - PR - Philippines - Outland - Feb 10
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('Nikkolai', 'PR', 'Outland', 'Philippines', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-10');

  -- Row 18: PP - PR - India - Canada WP - Inland - Feb 10
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('PP', 'PR', 'Inland', 'India', 'Canada — Work Permit', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-10');

  -- Row 19: NC - PR - UK - Outland - Feb 10
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NC', 'PR', 'Outland', 'UK', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-10');

  -- Row 20: NS - Citizen - India - Outland - Feb 11 - AOR Mar 25
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NS', 'Citizen', 'Outland', 'India', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-11');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-25');

  -- Row 21: BES - PR - Philippines - Outland - Feb 11 - AOR Mar 21
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('BES', 'PR', 'Outland', 'Philippines', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-11');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-21');

  -- Row 22: SJ - PR - India - USA L1 - Outland - Feb 11
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('SJ', 'PR', 'Outland', 'India', 'USA — L1 Visa', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-11');

  -- Row 23: VRK - PR - India - Singapore EP - Outland - Feb 11 - AOR Mar 26
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('VRK', 'PR', 'Outland', 'India', 'Singapore EP', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-11');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-26');

  -- Row 24: Ar - Kenya - Outland - Feb 12
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('Ar', 'PR', 'Outland', 'Kenya', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-12');

  -- Row 25: EIP - Citizen - Bangladesh - UK - Outland - Feb 13
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('EIP', 'Citizen', 'Outland', 'Bangladesh', 'UK', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-13');

  -- Row 26: RK - Citizen - Pakistan - Outland - Feb 13
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('RK', 'Citizen', 'Outland', 'Pakistan', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-13');

  -- Row 27: VS - PR - India - Outland - Feb 13
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('VS', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-13');

  -- Row 28: TB - Citizen - Nigeria - Inland - Feb 13
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('TB', 'Citizen', 'Inland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-13');

  -- Row 29: OO - Citizen - Nigeria - Outland - Feb 14
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('OO', 'Citizen', 'Outland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-14');

  -- Row 30: JS - PR - Brazil - Outland - Feb 17
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('JS', 'PR', 'Outland', 'Brazil', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-17');

  -- Row 31: MT - Citizen - India - Inland - Feb 17
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('MT', 'Citizen', 'Inland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-17');

  -- Row 32: TK - PR - India - USA H1B - Outland - Feb 17
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('TK', 'PR', 'Outland', 'India', 'USA — H1B', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-17');

  -- Row 33: NM - Citizen - Eritrea - Saudi Arabia - Outland - Feb 17
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('NM', 'Citizen', 'Outland', 'Eritrea', 'Other', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-17');

  -- Row 34: HP - Citizen - India - Outland - Feb 18
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('HP', 'Citizen', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-18');

  -- Row 35: YA - PR - India - Outland - Feb 18
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('YA', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-18');

  -- Row 36: Nups - PR - India - Outland - Feb 19
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('Nups', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-19');

  -- Row 37: MM - Citizen - Kenya - Outland - Feb 20
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('MM', 'Citizen', 'Outland', 'Kenya', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-20');

  -- Row 38: OT - PR - Nigeria - Outland - Feb 21
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('OT', 'PR', 'Outland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-21');

  -- Row 39: RM - Citizen - Philippines - Outland - Feb 23 - MEI Upfront
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, mei_type, province, current_step)
  VALUES ('RM', 'Citizen', 'Outland', 'Philippines', 'Upfront', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-23');

  -- Row 40: Niks - PR - India - Singapore EP - Outland - Feb 23
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('Niks', 'PR', 'Outland', 'India', 'Singapore EP', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-23');

  -- Row 41: VJ - Citizen - China - Canada WP - Inland - Feb 23
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('VJ', 'Citizen', 'Inland', 'China', 'Canada — Work Permit', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-23');

  -- Row 42: KK - Citizen - India - Outland - Feb 25
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('KK', 'Citizen', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-25');

  -- Row 43: Th - Citizen - Brazil - Inland - Feb 27
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('Th', 'Citizen', 'Inland', 'Brazil', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-27');

  -- Row 44: TR - Citizen - India - Outland - Feb 27
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('TR', 'Citizen', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-27');

  -- Row 45: SJ - Citizen - Germany - Canada WP - Outland - Mar 2
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('SJ', 'Citizen', 'Outland', 'Germany', 'Canada — Work Permit', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-02');

  -- Row 46: GK - PR - USA - Work auth - Outland - Mar 6
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('GK', 'PR', 'Outland', 'USA', 'USA — Work Authorization', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-06');

  -- Row 47: SA - PR - India - Outland - Mar 6
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('SA', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-06');

  -- Row 48: FO - Citizen - Pakistan - Outland - Mar 9
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('FO', 'Citizen', 'Outland', 'Pakistan', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-09');

  -- Row 49: PM - PR - EU - Outland - Mar 9
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('PM', 'PR', 'Outland', 'EU', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-09');

  -- Row 50: NI - PR - Nigeria - Outland - Mar 13
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NI', 'PR', 'Outland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-13');

  -- Row 51: JP - PR - India - Canada WP - Inland - Mar 13
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('JP', 'PR', 'Inland', 'India', 'Canada — Work Permit', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-13');

  -- Row 52: RTS - Citizen - USA - Outland - Mar 16
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('RTS', 'Citizen', 'Outland', 'USA', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-16');

  -- Row 53: Goku - PR - India - Outland - Mar 20
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('Goku', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-20');

  -- Row 54: EI - PR - Nigeria - Outland - Mar 21
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('EI', 'PR', 'Outland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-21');

  RAISE NOTICE 'Seeded 53 applications!';
END $$;
