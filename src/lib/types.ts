// ============================================
// Database types
// ============================================

export interface Application {
  id: string;
  initials: string;
  sponsor_status: SponsorStatus;
  stream: Stream;
  country_origin: string;
  province: string;
  current_step: StepId;
  is_complete: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  step_events?: StepEvent[];
}

export interface StepEvent {
  id: string;
  application_id: string;
  step_id: StepId;
  event_date: string;
  notes: string | null;
  created_at: string;
}

export interface CommunityAverage {
  stream: Stream;
  country_origin: string;
  step_id: StepId;
  sample_size: number;
  avg_days: number;
  median_days: number;
  min_days: number;
  max_days: number;
}

// ============================================
// Enums & Constants
// ============================================

export interface Message {
  id: string;
  display_name: string;
  body: string;
  application_id: string | null;
  created_at: string;
}

export type StepId =
  | "submitted"
  | "aor"
  | "eligibility"
  | "background"
  | "medical"
  | "biometrics"
  | "decision"
  | "landing";

export type SponsorStatus = "Citizen" | "PR";
export type Stream = "Outland" | "Inland";

export interface StepDefinition {
  id: StepId;
  label: string;
  description: string;
  avgWeeksOutland: [number, number];
  avgWeeksInland: [number, number];
}

export interface ApplicationFormData {
  initials: string;
  sponsor_status: SponsorStatus;
  stream: Stream;
  country_origin: string;
  province: string;
  submitted_date: string;
  notes: string;
}
