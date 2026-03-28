"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

interface AORCountdownProps {
  app: Application;
  allApps: Application[];
}

export function AORCountdown({ app, allApps }: AORCountdownProps) {
  const data = useMemo(() => {
    const stepsMap = buildStepsMap(app.step_events || []);
    if (stepsMap.aor || !stepsMap.submitted) return null;

    const submittedDate = stepsMap.submitted;
    const today = new Date().toISOString().split("T")[0];
    const daysSoFar = daysBetween(submittedDate, today);

    const streamApps = allApps.filter(a => a.stream === app.stream);
    const aorDays: number[] = [];
    streamApps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      if (s.submitted && s.aor) aorDays.push(daysBetween(s.submitted, s.aor));
    });
    const avgAor = aorDays.length ? Math.round(aorDays.reduce((a, b) => a + b, 0) / aorDays.length) : null;
    if (!avgAor) return null;

    const daysLeft = avgAor - daysSoFar;
    const predictedDate = new Date(submittedDate + "T00:00:00");
    predictedDate.setDate(predictedDate.getDate() + avgAor);
    const predictedStr = predictedDate.toISOString().split("T")[0];

    return { daysLeft, daysSoFar, avgAor, predictedDate: predictedStr };
  }, [app, allApps]);

  if (!data) return null;

  const isImminent = data.daysLeft <= 0;
  const isClose = data.daysLeft <= 5;
  const pct = Math.min(Math.round((data.daysSoFar / data.avgAor) * 100), 100);

  return (
    <div className={`rounded-xl p-4 mb-4 border transition-all ${
      isImminent
        ? "bg-gradient-to-r from-brand-100 to-brand-200 border-brand-300"
        : isClose
        ? "bg-gradient-to-r from-brand-50 to-brand-100 border-brand-200"
        : "bg-white border-sand-200"
    }`}>
      <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-2">
        AOR Countdown
      </div>

      {isImminent ? (
        <div className="text-center py-2">
          <div className="text-2xl font-bold text-brand-600 animate-pulse">
            Any moment now!
          </div>
          <div className="text-xs text-brand-500 mt-1">
            Past the {data.avgAor}-day {app.stream} average
          </div>
          <div className="flex justify-center gap-1 mt-2">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-4xl font-bold tabular-nums ${isClose ? "text-brand-600" : "text-sand-900"}`}>
              {data.daysLeft}
            </span>
            <span className="text-sm text-sand-500">days to predicted AOR</span>
          </div>
          <div className="relative mt-3 mb-2">
            <div className="bg-sand-200 rounded-full h-2.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${isClose ? "bg-brand-500" : "bg-brand-400"}`}
                style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-sand-400">
            <span>Day {data.daysSoFar}</span>
            <span>~{fmtDate(data.predictedDate)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
