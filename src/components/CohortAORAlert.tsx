"use client";

import { useMemo, useState, useEffect } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";
import { getSavedPinHash } from "@/lib/pin";
import { Confetti } from "@/components/Confetti";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MO[dt.getMonth()]} ${dt.getDate()}`;
}

function getWeekRange(dateStr: string): { start: Date; end: Date } {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

const DISMISSED_KEY = "sponsortrack-cohort-alert-dismissed";

function getDismissedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch { return []; }
}

function dismissId(id: string) {
  const ids = getDismissedIds();
  if (!ids.includes(id)) ids.push(id);
  // Keep only last 50
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-50)));
}

export function CohortAORAlert({ apps }: { apps: Application[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    setDismissed(getDismissedIds());
  }, []);

  const alert = useMemo(() => {
    // Find user's entry
    const myEntry = apps.find(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash);
    if (!myEntry) return null;

    const mySteps = buildStepsMap(myEntry.step_events || []);
    if (!mySteps.submitted) return null;

    // Don't show if user already has AOR
    if (mySteps.aor) return null;

    // Get user's submission week
    const week = getWeekRange(mySteps.submitted);

    // Find cohort members who got AOR recently (last 7 days by event_date)
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const cutoff = localDate(weekAgo);

    const cohortAors: { initials: string; country: string; stream: string; aorDate: string; subDate: string; days: number }[] = [];

    apps.forEach(a => {
      if (a.id === myEntry.id) return; // skip self
      const s = buildStepsMap(a.step_events || []);
      if (!s.submitted || !s.aor) return;

      // Check if in same submission week
      const subDate = new Date(s.submitted + "T00:00:00");
      if (subDate < week.start || subDate > week.end) return;

      // Check if AOR was recent
      if (s.aor >= cutoff) {
        cohortAors.push({
          initials: a.initials,
          country: a.country_origin,
          stream: a.stream,
          aorDate: s.aor,
          subDate: s.submitted,
          days: daysBetween(s.submitted, s.aor),
        });
      }
    });

    if (cohortAors.length === 0) return null;

    // Sort by most recent AOR first
    cohortAors.sort((a, b) => b.aorDate.localeCompare(a.aorDate));

    // Filter out already dismissed
    const newAors = cohortAors.filter(a => !dismissed.includes(`${a.initials}-${a.aorDate}`));
    if (newAors.length === 0) return null;

    return {
      entries: newAors,
      total: cohortAors.length,
      mySubmitted: mySteps.submitted,
    };
  }, [apps, dismissed]);

  // Trigger confetti once when alert first appears
  useEffect(() => {
    if (alert && !hasTriggered) {
      setShowConfetti(true);
      setHasTriggered(true);
    }
  }, [alert, hasTriggered]);

  if (!alert) return null;

  const handleDismiss = () => {
    alert.entries.forEach(a => dismissId(`${a.initials}-${a.aorDate}`));
    setDismissed(getDismissedIds());
  };

  const first = alert.entries[0];
  const moreCount = alert.entries.length - 1;

  return (
    <>
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
      <div className="mb-4 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl p-4 text-white relative overflow-hidden animate-in">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white/50 hover:text-white/80 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎉</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Cohort Update</span>
        </div>

        {/* Main message */}
        <div className="text-sm font-bold mb-1">
          {alert.entries.length === 1 ? (
            <>{first.initials} from your submission week got AOR!</>
          ) : (
            <>{alert.entries.length} people from your week got AOR!</>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1.5 mb-3">
          {alert.entries.slice(0, 3).map((a, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/10 rounded-lg px-2.5 py-1.5">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${
                a.stream === "Outland" ? "bg-white/20" : "bg-yellow-400/20"
              }`}>
                {a.initials.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold">{a.initials}</span>
                <span className="text-[10px] text-white/60 ml-1">{a.country} · {a.stream}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[11px] font-bold">{a.days}d</div>
                <div className="text-[9px] text-white/50">AOR {fmt(a.aorDate)}</div>
              </div>
            </div>
          ))}
          {moreCount > 2 && (
            <div className="text-[10px] text-white/50 text-center">+{moreCount - 2} more</div>
          )}
        </div>

        {/* Encouraging message */}
        <div className="text-[11px] text-white/70">
          You submitted {fmt(alert.mySubmitted)} — AORs are reaching your week! 🤞
        </div>
      </div>
    </>
  );
}
