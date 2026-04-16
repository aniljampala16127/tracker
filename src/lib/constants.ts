import { StepDefinition, StepId, SponsorStatus, Stream } from "./types";

export const STEPS: StepDefinition[] = [
  {
    id: "submitted",
    label: "Submitted",
    shortLabel: "Sub",
    description: "Application sent to IRCC",
    hint: "Date you mailed or submitted online",
    avgWeeksOutland: [0, 0],
    avgWeeksInland: [0, 0],
  },
  {
    id: "aor",
    label: "AOR",
    shortLabel: "AOR",
    description: "Acknowledgment of Receipt",
    hint: "Date on the AOR letter",
    avgWeeksOutland: [4, 8],
    avgWeeksInland: [4, 8],
  },
  {
    id: "bil",
    label: "BIL Received",
    shortLabel: "BIL",
    description: "Biometrics Invitation Letter",
    hint: "Date you received the BIL letter",
    avgWeeksOutland: [0, 2],
    avgWeeksInland: [0, 2],
  },
  {
    id: "biometrics_given",
    label: "Biometrics Given",
    shortLabel: "BioG",
    description: "Biometrics completed at VAC/ASC",
    hint: "Date you gave biometrics at VAC/ASC",
    avgWeeksOutland: [0, 2],
    avgWeeksInland: [0, 2],
  },
  {
    id: "biometrics_done",
    label: "Biometrics Updated",
    shortLabel: "BioU",
    description: "Biometrics updated in IRCC tracker",
    hint: "Date biometrics shows updated in IRCC tracker",
    avgWeeksOutland: [0, 2],
    avgWeeksInland: [0, 2],
  },
  {
    id: "sponsor_eligibility",
    label: "Sponsor Elig.",
    shortLabel: "SE",
    description: "Sponsor eligibility decision",
    hint: "Date approved on IRCC tracker",
    avgWeeksOutland: [4, 12],
    avgWeeksInland: [4, 16],
  },
  {
    id: "medical",
    label: "Medical Request",
    shortLabel: "Med",
    description: "Medical exam requested by IRCC",
    hint: "Date you received medical request",
    avgWeeksOutland: [4, 12],
    avgWeeksInland: [4, 16],
  },
  {
    id: "medicals_attended",
    label: "Medicals Attended",
    shortLabel: "MedA",
    description: "Medical exam completed by applicant",
    hint: "Date you attended the medical exam",
    avgWeeksOutland: [0, 3],
    avgWeeksInland: [0, 3],
  },
  {
    id: "medical_passed",
    label: "Medical Cleared",
    shortLabel: "MdC",
    description: "Medical exam cleared in IRCC tracker",
    hint: "Date medical shows cleared/passed in IRCC tracker",
    avgWeeksOutland: [1, 4],
    avgWeeksInland: [1, 4],
  },
  {
    id: "pa_eligibility",
    label: "PA Elig.",
    shortLabel: "PA",
    description: "Principal applicant eligibility",
    hint: "Date approved on IRCC tracker",
    avgWeeksOutland: [4, 12],
    avgWeeksInland: [8, 20],
  },
  {
    id: "pre_arrival",
    label: "Pre-Arrival",
    shortLabel: "Pre",
    description: "Pre-arrival / COPR readiness",
    hint: "Date pre-arrival letter received",
    avgWeeksOutland: [2, 8],
    avgWeeksInland: [2, 8],
  },
  {
    id: "background_started",
    label: "BG Started",
    shortLabel: "BGS",
    description: "Background check initiated",
    hint: "Date background check started on IRCC tracker",
    avgWeeksOutland: [2, 8],
    avgWeeksInland: [2, 12],
  },
  {
    id: "background",
    label: "BG Complete",
    shortLabel: "BG",
    description: "Background & security check complete",
    hint: "Date marked complete on IRCC tracker",
    avgWeeksOutland: [4, 16],
    avgWeeksInland: [8, 24],
  },
  {
    id: "portal1",
    label: "Portal 1",
    shortLabel: "P1",
    description: "First portal invitation",
    hint: "Date you received Portal 1 invite",
    streams: ["Inland"],
    avgWeeksOutland: [0, 0],
    avgWeeksInland: [1, 4],
  },
  {
    id: "portal2",
    label: "Portal 2",
    shortLabel: "P2",
    description: "Second portal / final docs",
    hint: "Date you received Portal 2 invite",
    streams: ["Inland"],
    avgWeeksOutland: [0, 0],
    avgWeeksInland: [1, 4],
  },
  {
    id: "ppr",
    label: "PPR",
    shortLabel: "PPR",
    description: "Passport Request",
    hint: "Date you received passport request",
    streams: ["Outland"],
    avgWeeksOutland: [1, 8],
    avgWeeksInland: [0, 0],
  },
  {
    id: "passport_received",
    label: "Passport Stamped",
    shortLabel: "Pass",
    description: "Passport returned with visa",
    hint: "Date passport returned to you",
    streams: ["Outland"],
    avgWeeksOutland: [2, 8],
    avgWeeksInland: [0, 0],
  },
  {
    id: "ecopr",
    label: "eCoPR",
    shortLabel: "eCoPR",
    description: "Electronic Confirmation of PR",
    hint: "Date on eCoPR letter",
    avgWeeksOutland: [1, 8],
    avgWeeksInland: [1, 8],
  },
];

export const STEP_ORDER: StepId[] = STEPS.map((s) => s.id);

export const STREAMS: Stream[] = ["Outland", "Inland"];
export const SPONSOR_STATUSES: SponsorStatus[] = ["Citizen", "PR"];

export const COMMON_COUNTRIES = [
  "Afghanistan", "Algeria", "Argentina", "Australia", "Austria",
  "Bangladesh", "Belgium", "Bolivia", "Brazil", "Bulgaria",
  "Cambodia", "Cameroon", "Chile", "China", "Colombia", "Congo",
  "Costa Rica", "Cuba", "Czech Republic",
  "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Eritrea", "Ethiopia", "EU",
  "France",
  "Germany", "Ghana", "Greece", "Guatemala",
  "Haiti", "Honduras", "Hong Kong", "Hungary",
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kuwait",
  "Lebanon", "Libya",
  "Malaysia", "Mexico", "Moldova", "Morocco", "Myanmar",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Nigeria", "North Korea",
  "Oman",
  "Pakistan", "Palestine", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Singapore", "Somalia", "South Africa",
  "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tanzania", "Thailand", "Trinidad and Tobago", "Tunisia", "Turkey",
  "UAE", "Uganda", "UK", "Ukraine", "Uruguay", "USA", "Uzbekistan",
  "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe",
  "Other",
];

export const VISA_COUNTRIES = [
  "",
  "Canada — PGWP",
  "Canada — Work Permit",
  "Canada — Open Work Permit",
  "Canada — Study Permit",
  "Canada — Visitor Visa",
  "USA — H1B",
  "USA — L1 Visa",
  "USA — Work Authorization",
  "UK",
  "Singapore EP",
  "Not in Canada",
  "Other",
];

export const MEI_TYPES = ["", "Upfront", "Request"];

export const APPLICATION_SUBCATEGORIES = [
  "Spousal — Spouse outside Canada",
  "Spousal — Spouse inside Canada",
  "Spousal — Common-law outside Canada",
  "Spousal — Common-law inside Canada",
  "Spousal — Conjugal partner",
  "Parent & Grandparent (PGP)",
  "Dependent Child",
  "Other",
];

export const PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
];

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function getStepIndex(stepId: StepId): number {
  return STEP_ORDER.indexOf(stepId);
}

/** Get steps visible for a given stream (filters out Outland-only or Inland-only steps) */
export function getVisibleSteps(stream?: Stream): StepDefinition[] {
  if (!stream) return STEPS;
  return STEPS.filter(s => !s.streams || s.streams.includes(stream));
}

export function getNextStep(stepId: StepId, stream?: Stream): StepId | null {
  const visible = getVisibleSteps(stream);
  const idx = visible.findIndex(s => s.id === stepId);
  return idx >= 0 && idx < visible.length - 1 ? visible[idx + 1].id : null;
}

export function getPrevStep(stepId: StepId, stream?: Stream): StepId | null {
  const visible = getVisibleSteps(stream);
  const idx = visible.findIndex(s => s.id === stepId);
  return idx > 0 ? visible[idx - 1].id : null;
}
