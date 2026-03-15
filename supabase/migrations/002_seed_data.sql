-- ============================================
-- Seed data from Feb26 Spousal Sponsorship Google Sheet
-- Run this in Supabase SQL Editor AFTER the schema migration
-- ============================================

-- Helper: insert app + submitted step in one go
DO $$
DECLARE
  app_id uuid;
BEGIN

  -- 1. EI - Nigeria - Feb 1
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('EI', 'PR', 'Outland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-01');

  -- 2. AM - India - Mar 2
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step, notes)
  VALUES ('AM', 'PR', 'Outland', 'India', 'Ontario', 'submitted', 'Canada PGWP') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-02');

  -- 3. RE - Pakistan - Feb 4 (Inland)
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step, notes)
  VALUES ('RE', 'PR', 'Inland', 'Pakistan', 'Ontario', 'submitted', 'Canada Work Permit') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');

  -- 4. DE7 - Nigeria - Feb 4
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step, notes)
  VALUES ('DE7', 'Citizen', 'Outland', 'Nigeria', 'Ontario', 'submitted', 'UK visa country') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');

  -- 5. RA - India - Feb 4
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('RA', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');

  -- 6. TT - India - Feb 5
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('TT', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-05');

  -- 7. EM - Kenya - Feb 5
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('EM', 'Citizen', 'Outland', 'Kenya', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-05');

  -- 8. GEU - Nigeria - Feb 6
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('GEU', 'PR', 'Outland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-06');

  -- 9. Goku - India - Feb 6
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('GOKU', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-06');

  -- 10. KK - India - Mar 6
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('KK', 'Citizen', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-06');

  -- 11. NP - Pakistan - Feb 7
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NP', 'Citizen', 'Outland', 'Pakistan', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-07');

  -- 12. AA - Pakistan - Feb 8
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('AA', 'PR', 'Outland', 'Pakistan', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-08');

  -- 13. NE - Chile - Feb 8 (Inland)
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NE', 'Citizen', 'Inland', 'Chile', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-08');

  -- 14. FO - Pakistan - Mar 9
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('FO', 'Citizen', 'Outland', 'Pakistan', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-09');

  -- 15. JC - Philippines - Feb 10
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('JC', 'Citizen', 'Outland', 'Philippines', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-10');

  -- 16. Nikkolai - Philippines - Feb 10
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NIKK', 'PR', 'Outland', 'Philippines', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-10');

  -- 17. SJ - Germany - Mar 10
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step, notes)
  VALUES ('SJ', 'Citizen', 'Outland', 'Germany', 'Ontario', 'submitted', 'Canada Work Permit') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-10');

  -- 18. NC - UK - Feb 11
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NC', 'PR', 'Outland', 'UK', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-11');

  -- 19. NS - India - Feb 12
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NS', 'Citizen', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-12');

  -- 20. BES - Philippines - Feb 12
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('BES', 'PR', 'Outland', 'Philippines', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-12');

  -- 21. EIP - Bangladesh - Feb 13
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step, notes)
  VALUES ('EIP', 'Citizen', 'Outland', 'Bangladesh', 'Ontario', 'submitted', 'UK visa country') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-13');

  -- 22. VS - India - Feb 14
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('VS', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-14');

  -- 23. TB - Nigeria - Feb 15 (Inland)
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('TB', 'Citizen', 'Inland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-15');

  -- 24. JS - Brazil - Feb 17
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('JS', 'PR', 'Outland', 'Brazil', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-17');

  -- 25. OO - Nigeria - Feb 17
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('OO', 'Citizen', 'Outland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-17');

  -- 26. HP - India - Feb 18
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('HP', 'Citizen', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-18');

  -- 27. Angel - India - Feb 19
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('ANGL', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-19');

  -- 28. MT - India - Feb 20 (Inland)
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('MT', 'Citizen', 'Inland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-20');

  -- 29. TK - India - Feb 21
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step, notes)
  VALUES ('TK', 'PR', 'Outland', 'India', 'Ontario', 'submitted', 'USA on H1B') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-21');

  -- 30. YA - India - Feb 23
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('YA', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-23');

  -- 31. NUPS - India - Feb 23
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('NUPS', 'PR', 'Outland', 'India', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-23');

  -- 32. OT - Nigeria - Feb 27
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('OT', 'PR', 'Outland', 'Nigeria', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-27');

  -- 33. RM - Philippines - Feb 27
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('RM', 'Citizen', 'Outland', 'Philippines', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-27');

  -- 34. NIKS - India - Feb 28
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step, notes)
  VALUES ('NIKS', 'PR', 'Outland', 'India', 'Ontario', 'submitted', 'Singapore EP') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-28');

  -- 35. PM - EU - Mar 1
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('PM', 'PR', 'Outland', 'EU', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-01');

  -- 36. MM - Kenya - Mar 1
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, province, current_step)
  VALUES ('MM', 'Citizen', 'Outland', 'Kenya', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-03-01');

  RAISE NOTICE 'Seeded 36 applications successfully!';
END $$;
