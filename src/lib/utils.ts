import { MONTHS, STEPS, getStepIndex } from "./constants";
import { Application, StepEvent, StepId } from "./types";

// ============================================
// Date helpers
// ============================================

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function daysBetween(d1: string, d2: string): number {
  const date1 = new Date(d1 + "T00:00:00");
  const date2 = new Date(d2 + "T00:00:00");
  return Math.round(
    Math.abs(date2.getTime() - date1.getTime()) / (24 * 60 * 60 * 1000)
  );
}

export function weeksBetween(d1: string, d2: string): number {
  return Math.round(daysBetween(d1, d2) / 7);
}

export function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTHS[parseInt(m) - 1]} ${y}`;
}

export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ============================================
// Application helpers
// ============================================

export function progressPercent(currentStep: StepId): number {
  const idx = getStepIndex(currentStep);
  return Math.round(((idx + 1) / STEPS.length) * 100);
}

export function getStepDate(
  stepEvents: StepEvent[],
  stepId: StepId
): string | null {
  const event = stepEvents.find((e) => e.step_id === stepId);
  return event?.event_date ?? null;
}

export function buildStepsMap(
  stepEvents: StepEvent[]
): Record<StepId, string | null> {
  const map: Record<string, string | null> = {};
  STEPS.forEach((s) => {
    map[s.id] = getStepDate(stepEvents, s.id);
  });
  return map as Record<StepId, string | null>;
}

export function estimateCompletion(
  submittedDate: string,
  stream: "Outland" | "Inland"
): { earliest: string; latest: string } {
  const sub = new Date(submittedDate + "T00:00:00");
  const minWeeks = stream === "Outland" ? 20 : 48;
  const maxWeeks = stream === "Outland" ? 52 : 120;
  const earliest = new Date(
    sub.getTime() + minWeeks * 7 * 24 * 60 * 60 * 1000
  );
  const latest = new Date(
    sub.getTime() + maxWeeks * 7 * 24 * 60 * 60 * 1000
  );
  return {
    earliest: toISODate(earliest),
    latest: toISODate(latest),
  };
}

// ============================================
// Grouping helpers
// ============================================

export function groupByMonth(
  apps: Application[]
): Record<string, Application[]> {
  const groups: Record<string, Application[]> = {};
  apps.forEach((app) => {
    const sub = app.step_events?.find((e) => e.step_id === "submitted");
    if (!sub) return;
    const key = getMonthKey(sub.event_date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(app);
  });
  return groups;
}

// ============================================
// Community stats
// ============================================

export function computeStepAverages(
  apps: Application[]
): Record<StepId, { avgWeeks: number; count: number } | null> {
  const result: Record<string, { avgWeeks: number; count: number } | null> = {};

  STEPS.forEach((step, i) => {
    if (i === 0) {
      result[step.id] = null;
      return;
    }
    const prevStep = STEPS[i - 1];
    const durations: number[] = [];

    apps.forEach((app) => {
      if (!app.step_events) return;
      const prevDate = getStepDate(app.step_events, prevStep.id);
      const currDate = getStepDate(app.step_events, step.id);
      if (prevDate && currDate) {
        durations.push(weeksBetween(prevDate, currDate));
      }
    });

    result[step.id] =
      durations.length > 0
        ? {
            avgWeeks: Math.round(
              durations.reduce((a, b) => a + b, 0) / durations.length
            ),
            count: durations.length,
          }
        : null;
  });

  return result as Record<StepId, { avgWeeks: number; count: number } | null>;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
