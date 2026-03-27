"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDateNice(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

interface InsightsPanelProps {
  app: Application;
  allApps: Application[];
}

export function InsightsPanel({ app, allApps }: InsightsPanelProps) {
  const stepsMap = buildStepsMap(app.step_events || []);
  const submittedDate = stepsMap.submitted;

  const insights = useMemo(() => {
    if (!submittedDate) return null;

    const streamApps = allApps.filter(a => a.stream === app.stream);
    const subDate = new Date(submittedDate + "T00:00:00");

    // --- AOR averages for this stream ---
    const aorDays: number[] = [];
    streamApps.forEach((a) => {
      const s = buildStepsMap(a.step_events || []);
      if (s.submitted && s.aor) aorDays.push(daysBetween(s.submitted, s.aor));
    });
    const avgAorDays = aorDays.length ? Math.round(aorDays.reduce((a, b) => a + b, 0) / aorDays.length) : null;

    // --- Where do I stand? ---
    let standingLabel = "";
    let standingColor = "";
    const myAor = stepsMap.aor;
    if (myAor && submittedDate) {
      const myDays = daysBetween(submittedDate, myAor);
      if (avgAorDays) {
        const diff = myDays - avgAorDays;
        if (diff < -3) { standingLabel = `${Math.abs(diff)} days faster than average`; standingColor = "text-brand-600"; }
        else if (diff > 3) { standingLabel = `${diff} days slower than average`; standingColor = "text-error"; }
        else { standingLabel = "Right on track with average"; standingColor = "text-sand-600"; }
      }
    } else if (submittedDate && avgAorDays) {
      const daysSoFar = daysBetween(submittedDate, new Date().toISOString().split("T")[0]);
      if (daysSoFar > avgAorDays + 7) { standingLabel = `${daysSoFar - avgAorDays} days past avg AOR wait`; standingColor = "text-warn-dark"; }
      else if (daysSoFar > avgAorDays - 7) { standingLabel = "AOR could come any day now"; standingColor = "text-brand-600"; }
      else { standingLabel = `~${avgAorDays - daysSoFar} days until expected AOR`; standingColor = "text-brand-600"; }
    }

    // --- Position in queue ---
    const appsWithAor = streamApps.filter(a => a.step_events?.some(e => e.step_id === "aor"));
    const appsWithoutAor = streamApps.filter(a => !a.step_events?.some(e => e.step_id === "aor"));
    const myHasAor = !!myAor;
    let position = 0;
    let totalInQueue = 0;
    if (myHasAor) {
      // Position among those who got AOR (by AOR date)
      const sorted = appsWithAor
        .map(a => ({ id: a.id, aorDate: a.step_events?.find(e => e.step_id === "aor")?.event_date || "" }))
        .sort((a, b) => a.aorDate.localeCompare(b.aorDate));
      position = sorted.findIndex(s => s.id === app.id) + 1;
      totalInQueue = sorted.length;
    } else {
      // Position among those waiting (by submission date, earlier = higher priority)
      const sorted = appsWithoutAor
        .map(a => {
          const s = buildStepsMap(a.step_events || []);
          return { id: a.id, subDate: s.submitted || "" };
        })
        .sort((a, b) => a.subDate.localeCompare(b.subDate));
      position = sorted.findIndex(s => s.id === app.id) + 1;
      totalInQueue = sorted.length;
    }

    // --- AOR Prediction ---
    let aorPrediction: string | null = null;
    if (!myAor && avgAorDays && submittedDate) {
      aorPrediction = addDays(submittedDate, avgAorDays);
      // If prediction is in the past, adjust
      const today = new Date().toISOString().split("T")[0];
      if (aorPrediction < today) aorPrediction = null; // Already past, can't predict
    }

    // --- Same week cohort ---
    const subWeekStart = new Date(subDate);
    subWeekStart.setDate(subWeekStart.getDate() - subWeekStart.getDay());
    const subWeekEnd = new Date(subWeekStart);
    subWeekEnd.setDate(subWeekEnd.getDate() + 6);

    const sameWeek = allApps.filter(a => {
      if (a.id === app.id) return false;
      const s = buildStepsMap(a.step_events || []);
      if (!s.submitted) return false;
      const d = new Date(s.submitted + "T00:00:00");
      return d >= subWeekStart && d <= subWeekEnd;
    });

    const sameWeekWithAor = sameWeek.filter(a => a.step_events?.some(e => e.step_id === "aor"));

    return {
      standingLabel, standingColor,
      avgAorDays,
      position, totalInQueue, myHasAor,
      aorPrediction,
      sameWeekCount: sameWeek.length,
      sameWeekWithAor: sameWeekWithAor.length,
      sameWeekNames: sameWeek.slice(0, 5).map(a => a.initials),
    };
  }, [app, allApps, stepsMap, submittedDate]);

  if (!insights || !submittedDate) return null;

  return (
    <div className="space-y-2 mb-3">
      {/* Where do I stand */}
      {insights.standingLabel && (
        <div className="bg-sand-50 rounded-lg px-3 py-2.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20V14" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Where You Stand</div>
            <div className={`text-sm font-bold ${insights.standingColor}`}>{insights.standingLabel}</div>
            {insights.avgAorDays && (
              <div className="text-[10px] text-sand-400">Community avg: {insights.avgAorDays} days to AOR ({app.stream})</div>
            )}
          </div>
        </div>
      )}

      {/* Position in queue */}
      <div className="bg-sand-50 rounded-lg px-3 py-2.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-warn-light flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9B7420" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">
            {insights.myHasAor ? "AOR Position" : "Queue Position"}
          </div>
          <div className="text-sm font-bold text-sand-900">
            #{insights.position} of {insights.totalInQueue}
            <span className="text-sand-400 font-normal text-xs ml-1">
              {insights.myHasAor ? "who received AOR" : "waiting for AOR"}
            </span>
          </div>
        </div>
      </div>

      {/* AOR Prediction */}
      {insights.aorPrediction && (
        <div className="bg-brand-50 rounded-lg px-3 py-2.5 flex items-center gap-3 border border-brand-200">
          <div className="w-9 h-9 rounded-lg bg-brand-200 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4331" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6V12L16 14" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider">Predicted AOR</div>
            <div className="text-sm font-bold text-brand-600">
              ~{formatDateNice(insights.aorPrediction)}
            </div>
            <div className="text-[10px] text-brand-500">Based on {app.stream} community average of {insights.avgAorDays}d</div>
          </div>
        </div>
      )}

      {/* Same week cohort */}
      {insights.sameWeekCount > 0 && (
        <div className="bg-sand-50 rounded-lg px-3 py-2.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sand-200 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#65635D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21V19C23 17.5 22 16.2 20.6 15.8" /><path d="M16.5 3.1C17.9 3.6 19 5 19 6.5C19 8 17.9 9.4 16.5 9.9" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Your Submission Week</div>
            <div className="text-sm font-bold text-sand-900">
              {insights.sameWeekCount} others submitted the same week
            </div>
            <div className="text-[10px] text-sand-400">
              {insights.sameWeekWithAor > 0
                ? `${insights.sameWeekWithAor} of them have AOR already`
                : "None have AOR yet"
              }
              {insights.sameWeekNames.length > 0 && ` · ${insights.sameWeekNames.join(", ")}${insights.sameWeekCount > 5 ? "..." : ""}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
