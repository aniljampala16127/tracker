-- ============================================
-- Seed data from Feb26 Spousal Sponsorship Google Sheet
-- 53 entries — accurate as of Mar 26, 2026
-- Run AFTER 001 + 003 + 004 + 005 migrations
-- ============================================

DO $$
DECLARE
  app_id uuid;
BEGIN

  -- Row 2: A.M - PR - India - PGWP - Outland - Feb 1 - MEI Upfront
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, mei_type, province, current_step)
  VALUES ('A.M', 'PR', 'Outland', 'India', 'Canada — PGWP', 'Upfront', 'Ontario', 'submitted') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-01');

  -- Row 3: RE - PR - Pakistan - Canada WP - Inland - Feb 4 - AOR Mar 26
  INSERT INTO applications (initials, sponsor_status, stream, country_origin, visa_country, province, current_step)
  VALUES ('RE', 'PR', 'Inland', 'Pakistan', 'Canada — Work Permit', 'Ontario', 'aor') RETURNING id INTO app_id;
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'submitted', '2026-02-04');
  INSERT INTO step_events (application_id, step_id, event_date) VALUES (app_id, 'aor', '2026-03-26');

  -- Row 4: DE7 - Citizen - Nigeria - UK - Outland - Feb 4 - AOR Mar 18 - MEI Upfront
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

  -- Row 24: Ar - Kenya - Outland - Feb 12 (sponsor status blank)
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

  RAISE NOTICE 'Seeded 53 applications successfully!';
END $$;
