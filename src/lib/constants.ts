import { StepDefinition, StepId, SponsorStatus, Stream } from "./types";

export const STEPS: StepDefinition[] = [
  {
    id: "submitted",
    label: "Submitted",
    shortLabel: "Sub",
    description: "Application sent to IRCC",
    avgWeeksOutland: [0, 0],
    avgWeeksInland: [0, 0],
  },
  {
    id: "aor",
    label: "AOR",
    shortLabel: "AOR",
    description: "Acknowledgment of Receipt",
    avgWeeksOutland: [4, 8],
    avgWeeksInland: [4, 8],
  },
  {
    id: "bil",
    label: "BIL",
    shortLabel: "BIL",
    description: "Biometrics Invitation Letter",
    avgWeeksOutland: [0, 2],
    avgWeeksInland: [0, 2],
  },
  {
    id: "sponsor_eligibility",
    label: "Sponsor Elig.",
    shortLabel: "SE",
    description: "Sponsor eligibility decision",
    avgWeeksOutland: [4, 12],
    avgWeeksInland: [4, 16],
  },
  {
    id: "medical",
    label: "Medical",
    shortLabel: "Med",
    description: "Medical exam request / update",
    avgWeeksOutland: [4, 12],
    avgWeeksInland: [4, 16],
  },
  {
    id: "pa_eligibility",
    label: "PA Elig.",
    shortLabel: "PA",
    description: "Principal applicant eligibility",
    avgWeeksOutland: [4, 12],
    avgWeeksInland: [8, 20],
  },
  {
    id: "pre_arrival",
    label: "Pre-Arrival",
    shortLabel: "Pre",
    description: "Pre-arrival / COPR readiness",
    avgWeeksOutland: [2, 8],
    avgWeeksInland: [2, 8],
  },
  {
    id: "background",
    label: "Background",
    shortLabel: "BG",
    description: "Background & security check",
    avgWeeksOutland: [4, 16],
    avgWeeksInland: [8, 24],
  },
  {
    id: "portal1",
    label: "Portal 1",
    shortLabel: "P1",
    description: "First portal invitation",
    avgWeeksOutland: [1, 4],
    avgWeeksInland: [1, 4],
  },
  {
    id: "portal2",
    label: "Portal 2",
    shortLabel: "P2",
    description: "Second portal / final docs",
    avgWeeksOutland: [1, 4],
    avgWeeksInland: [1, 4],
  },
  {
    id: "ecopr",
    label: "eCoPR",
    shortLabel: "eCoPR",
    description: "Electronic Confirmation of PR",
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

export function getNextStep(stepId: StepId): StepId | null {
  const idx = getStepIndex(stepId);
  return idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}

export function getPrevStep(stepId: StepId): StepId | null {
  const idx = getStepIndex(stepId);
  return idx > 0 ? STEP_ORDER[idx - 1] : null;
}
