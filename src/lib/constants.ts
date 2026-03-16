import { StepDefinition, StepId, SponsorStatus, Stream } from "./types";

export const STEPS: StepDefinition[] = [
  {
    id: "submitted",
    label: "Submitted",
    description: "Application sent to IRCC",
    avgWeeksOutland: [0, 0],
    avgWeeksInland: [0, 0],
  },
  {
    id: "aor",
    label: "AOR",
    description: "Acknowledgment of Receipt",
    avgWeeksOutland: [4, 8],
    avgWeeksInland: [4, 8],
  },
  {
    id: "eligibility",
    label: "Eligibility",
    description: "Sponsor eligibility review",
    avgWeeksOutland: [8, 16],
    avgWeeksInland: [8, 20],
  },
  {
    id: "background",
    label: "Background",
    description: "Security & background check",
    avgWeeksOutland: [8, 16],
    avgWeeksInland: [12, 24],
  },
  {
    id: "medical",
    label: "Medical",
    description: "Medical exam request / IME",
    avgWeeksOutland: [4, 8],
    avgWeeksInland: [4, 12],
  },
  {
    id: "biometrics",
    label: "Biometrics",
    description: "Biometrics collection",
    avgWeeksOutland: [4, 8],
    avgWeeksInland: [4, 8],
  },
  {
    id: "decision",
    label: "Decision",
    description: "Final decision / COPR issued",
    avgWeeksOutland: [4, 12],
    avgWeeksInland: [8, 16],
  },
  {
    id: "landing",
    label: "Landing",
    description: "PR confirmation after landing",
    avgWeeksOutland: [4, 16],
    avgWeeksInland: [4, 16],
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
  "Ecuador", "Egypt", "El Salvador", "Ethiopia", "EU",
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
  "Same as PA Country",
  "Canada (PGWP)",
  "Canada (Work Permit)",
  "Canada (Study Permit)",
  "Canada (Visitor)",
  "USA",
  "USA (H1B)",
  "UK",
  "Australia",
  "Singapore",
  "UAE",
  "Saudi Arabia",
  "Germany",
  "France",
  "Japan",
  "South Korea",
  "Other",
];

export const APPLICATION_SUBCATEGORIES = [
  "Spouse outside Canada",
  "Spouse inside Canada",
  "Common-law partner outside Canada",
  "Common-law partner inside Canada",
  "Conjugal partner",
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
