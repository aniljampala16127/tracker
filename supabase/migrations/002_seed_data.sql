-- ============================================
-- Seed data from Feb26 Spousal Sponsorship Google Sheet
-- Updated Mar 26, 2026 — 51 entries total
-- Run in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================

DO $$
DECLARE
  app_id uuid;
BEGIN

  -- ==========================================
  -- JAN 2026 (1 entry)
  -- ==========================================

  -- md - India - Jan 27 - AOR Mar 18
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, subcategory, province, current_step)
  VALUES ('md', 'PR', 'Outland', 'India', 'Spousal — Spouse outside Canada', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-01-27');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-18');

  -- ==========================================
  -- FEB 2026 (40 entries, 35 outland, 5 inland)
  -- ==========================================

  -- EI - Nigeria - Feb 1 - AOR Mar 12
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('EI', 'PR', 'Outland', 'Nigeria', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-01');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-12');

  -- DE7 - Nigeria - Feb 4
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('DE7', 'Citizen', 'Outland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');

  -- RA - India - Feb 4
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('RA', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');

  -- RE - Pakistan - Feb 4 (Inland) - AOR Mar 26
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('RE', 'PR', 'Inland', 'Pakistan', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-26');

  -- RA - India - Feb 4 (second RA entry)
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('RA', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');

  -- EM - Kenya - Feb 5 - AOR Mar 19
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('EM', 'Citizen', 'Outland', 'Kenya', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-05');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-19');

  -- TT - India - Feb 5 - AOR Mar 18
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('TT', 'PR', 'Outland', 'India', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-05');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-18');

  -- GOKU - India - Feb 6
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('GOKU', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-06');

  -- GEU - Nigeria - Feb 6 - AOR Mar 20
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('GEU', 'PR', 'Outland', 'Nigeria', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-06');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-20');

  -- NP - Pakistan - Feb 7
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NP', 'Citizen', 'Outland', 'Pakistan', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-07');

  -- AA - Pakistan - Feb 8
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('AA', 'PR', 'Outland', 'Pakistan', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-08');

  -- NE - Chile - Feb 8 (Inland)
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NE', 'Citizen', 'Inland', 'Chile', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-08');

  -- WA - India - Feb 8
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('WA', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-08');

  -- JC - Philippines - Feb 10
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('JC', 'Citizen', 'Outland', 'Philippines', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-10');

  -- NIKK - Philippines - Feb 10
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NIKK', 'PR', 'Outland', 'Philippines', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-10');

  -- NC - UK - Feb 11
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NC', 'PR', 'Outland', 'UK', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-11');

  -- NS - India - Feb 12
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NS', 'Citizen', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-12');

  -- BES - Philippines - Feb 12
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('BES', 'PR', 'Outland', 'Philippines', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-12');

  -- EIP - Bangladesh - Feb 13
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('EIP', 'Citizen', 'Outland', 'Bangladesh', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-13');

  -- Mansoor khan - India - Feb 13
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, subcategory, province, current_step)
  VALUES ('Mansoor khan', 'PR', 'Outland', 'India', 'Spousal — Spouse outside Canada', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-13');

  -- VS - India - Feb 14
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('VS', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-14');

  -- PM - Hungary - Feb 14
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, subcategory, province, current_step)
  VALUES ('PM', 'PR', 'Outland', 'Hungary', 'Spousal — Spouse outside Canada', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-14');

  -- TB - Nigeria - Feb 15 (Inland)
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('TB', 'Citizen', 'Inland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-15');

  -- ANIL - India - Feb 17
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('ANIL', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-17');

  -- JS - Brazil - Feb 17
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('JS', 'PR', 'Outland', 'Brazil', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-17');

  -- OO - Nigeria - Feb 17
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('OO', 'Citizen', 'Outland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-17');

  -- EE - Peru - Feb 17
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, subcategory, province, current_step)
  VALUES ('EE', 'Citizen', 'Outland', 'Peru', 'Spousal — Spouse inside Canada', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-17');

  -- HP - India - Feb 18
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('HP', 'Citizen', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-18');

  -- ANGL - India - Feb 19
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('ANGL', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-19');

  -- LK - USA - Feb 19
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('LK', 'PR', 'Outland', 'USA', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-19');

  -- MT - India - Feb 20 (Inland)
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('MT', 'Citizen', 'Inland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-20');

  -- TK - India - Feb 21
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('TK', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-21');

  -- Jay - India - Feb 21
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, subcategory, province, current_step)
  VALUES ('Jay', 'PR', 'Outland', 'India', 'Spousal — Spouse inside Canada', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-21');

  -- YA - India - Feb 23
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('YA', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-23');

  -- NUPS - India - Feb 23
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NUPS', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-23');

  -- NM - Saudi Arabia - Feb 23
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, subcategory, province, current_step)
  VALUES ('NM', 'Citizen', 'Outland', 'Saudi Arabia', 'Spousal — Spouse outside Canada', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-23');

  -- LA - Nigeria - Feb 26 (Inland)
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, subcategory, province, current_step)
  VALUES ('LA', 'Citizen', 'Inland', 'Nigeria', 'Spousal — Common-law inside Canada', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-26');

  -- OT - Nigeria - Feb 27
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('OT', 'PR', 'Outland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-27');

  -- RM - Philippines - Feb 27
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('RM', 'Citizen', 'Outland', 'Philippines', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-27');

  -- NIKS - India - Feb 28
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NIKS', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-28');

  -- ==========================================
  -- MAR 2026 (10 entries, 9 outland, 1 inland)
  -- ==========================================

  -- PM - EU - Mar 1
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('PM', 'PR', 'Outland', 'EU', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-01');

  -- MM - Kenya - Mar 1
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('MM', 'Citizen', 'Outland', 'Kenya', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-01');

  -- AM - India - Mar 2
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('AM', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-02');

  -- VJ - China - Mar 2 (Inland)
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, subcategory, province, current_step)
  VALUES ('VJ', 'Citizen', 'Inland', 'China', 'Spousal — Spouse inside Canada', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-02');

  -- KK - India - Mar 6
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('KK', 'Citizen', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-06');

  -- FO - Pakistan - Mar 9
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('FO', 'Citizen', 'Outland', 'Pakistan', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-09');

  -- SJ - Germany - Mar 10
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('SJ', 'Citizen', 'Outland', 'Germany', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-10');

  -- MS - Australia - Mar 10
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, subcategory, province, current_step)
  VALUES ('MS', 'Citizen', 'Outland', 'Australia', 'Spousal — Spouse outside Canada', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-10');

  -- SM - India - Mar 12
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, subcategory, province, current_step)
  VALUES ('SM', 'PR', 'Outland', 'India', 'Spousal — Spouse outside Canada', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-12');

  -- TA - Nigeria - Mar 15
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, subcategory, province, current_step)
  VALUES ('TA', 'PR', 'Outland', 'Nigeria', 'Spousal — Spouse outside Canada', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-15');

  RAISE NOTICE 'Seeded 51 applications successfully (1 Jan + 40 Feb + 10 Mar)!';
END $$;
