"use client";

import { useEffect, useMemo, useState } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DISMISS_KEY = "sponsortrack-celebrations-dismissed";
// How long after the eCoPR event_date to keep showing the celebration.
const SHOW_DAYS = 7;

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(set)));
  } catch { /* ignore quota */ }
}

interface CelebrationWallProps {
  apps: Application[];
}

export function CelebrationWall({ apps }: CelebrationWallProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const celebrations = useMemo(() => {
    const now = Date.now();
    const cutoffMs = SHOW_DAYS * 24 * 60 * 60 * 1000;
    const recentPRs: { appId: string; initials: string; country: string; stream: string; ecoprDate: string; totalDays: number }[] = [];

    apps.forEach(a => {
      const ecoprEvent = (a.step_events || []).find(e => e.step_id === "ecopr");
      if (!ecoprEvent) return;

      // Show for SHOW_DAYS after the actual eCoPR event_date. Using
      // event_date (not created_at) so backdated entries don't park at
      // the top of the dashboard forever, and so the banner ages out
      // even if the contributor logs the step weeks late.
      const eventTs = new Date(ecoprEvent.event_date + "T00:00:00").getTime();
      if (now - eventTs > cutoffMs) return;

      const s = buildStepsMap(a.step_events || []);
      const totalDays = s.submitted && s.ecopr ? daysBetween(s.submitted, s.ecopr) : 0;

      recentPRs.push({
        appId: a.id,
        initials: a.initials,
        country: a.country_origin,
        stream: a.stream,
        ecoprDate: ecoprEvent.event_date,
        totalDays,
      });
    });

    recentPRs.sort((a, b) => b.ecoprDate.localeCompare(a.ecoprDate));
    return recentPRs.filter(pr => !dismissed.has(pr.appId));
  }, [apps, dismissed]);

  const handleDismiss = (appId: string) => {
    const next = new Set(dismissed);
    next.add(appId);
    setDismissed(next);
    saveDismissed(next);
  };

  if (celebrations.length === 0) return null;

  return (
    <div className="mb-4">
      {celebrations.map((pr) => (
        <div
          key={pr.appId}
          className="bg-white border border-warn/30 rounded-2xl p-4 mb-2 relative overflow-hidden shadow-[0_1px_2px_rgba(212,160,60,0.08)]"
          style={{
            backgroundImage:
              "radial-gradient(80% 100% at 0% 50%, rgba(212,160,60,0.10), transparent 70%), radial-gradient(80% 100% at 100% 50%, rgba(45,106,79,0.06), transparent 70%)",
          }}
        >
          <button
            onClick={() => handleDismiss(pr.appId)}
            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-md flex items-center justify-center text-sand-400 hover:text-sand-700 hover:bg-sand-100 transition-colors"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18" /><path d="M6 6L18 18" />
            </svg>
          </button>
          <div className="flex items-center gap-3 pr-7">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warn to-warn-dark flex items-center justify-center text-white font-bold text-sm shadow-md shadow-warn/40 flex-shrink-0">
              {pr.initials.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-warn-dark uppercase tracking-[0.08em]">New PR</span>
                <span className="text-[14px] font-bold text-sand-900">{pr.initials}</span>
                <span className="text-[13px] text-sand-700">became a PR.</span>
              </div>
              <div className="text-[11px] text-sand-500 mt-0.5 truncate nums-tabular">
                {pr.country} · {pr.stream}{pr.totalDays > 0 ? ` · ${pr.totalDays} days total` : ""} · eCoPR {fmtDate(pr.ecoprDate)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
