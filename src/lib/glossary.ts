/**
 * IRCC jargon glossary — used by HelpLabel to surface definitions on hover.
 * Add new entries here as new acronyms appear in the UI. Keys are lowercase
 * for case-insensitive lookup; render with whatever case the column uses.
 */
export const IRCC_GLOSSARY: Record<string, string> = {
  aor: "Acknowledgement of Receipt — IRCC confirms they received your application.",
  bil: "Biometric Instruction Letter — IRCC asks you to submit fingerprints and a photo.",
  "bio given": "Biometrics Given — you've completed your biometrics appointment.",
  biometrics: "Fingerprints and a photo, collected at a VAC or service Canada office.",
  mei: "Medical Examination Instructions — IRCC asks the PA to do an immigration medical exam.",
  "sponsor elig": "Sponsor Eligibility Approval — IRCC confirms the sponsor meets income, residency, and good-standing requirements.",
  "medical req": "Medical Examination Requested — formal request for the PA's IME (Immigration Medical Exam).",
  "med attended": "Medicals Attended — the PA has completed their IME.",
  "pa elig": "Principal Applicant Eligibility — IRCC reviews the PA's documents (relationship genuineness, intent, etc.).",
  "pre-arrival": "Pre-Arrival Services Letter — IRCC connects you with settlement services before landing.",
  background: "Background Check / Security Screening — clearance from CSIS/RCMP and security partners.",
  "portal 1": "Portal 1 — first IRCC portal stage: PA uploads passport biopage and confirms address.",
  "portal 2": "Portal 2 — second portal stage: confirmation of permanent residence (CoPR) is issued.",
  ecopr: "Electronic Confirmation of Permanent Residence — official PR confirmation, replaces the paper CoPR.",
  pa: "Principal Applicant — the person being sponsored.",
  pr: "Permanent Resident — status granted at the end of the process.",
  ircc: "Immigration, Refugees and Citizenship Canada.",
  outland: "Outland stream — application processed by a Canadian visa office outside Canada.",
  inland: "Inland stream — application processed inside Canada (PA usually has an open work permit).",
  cohort: "Group of applicants who submitted in the same week — your peer pace check.",
};
