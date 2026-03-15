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
  "India",
  "Philippines",
  "Pakistan",
  "Nigeria",
  "China",
  "Iran",
  "Brazil",
  "Mexico",
  "Kenya",
  "Bangladesh",
  "Sri Lanka",
  "Egypt",
  "Colombia",
  "Morocco",
  "Vietnam",
  "EU",
  "UK",
  "USA",
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
