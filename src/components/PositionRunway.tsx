"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap } from "@/lib/utils";

interface PositionRunwayProps {
  app: Application;
  allApps: Application[];
}

export function PositionRunway({ app, allApps }: PositionRunwayProps) {
  const data = useMemo(() => {
    const stepsMap = buildStepsMap(app.step_events || []);
    if (stepsMap.aor) return null; // Already got AOR

    const streamApps = allApps.filter(a => a.stream === app.stream);

    const waitingApps = streamApps
      .filter(a => !(a.step_events || []).some(e => e.step_id === "aor"))
      .map(a => {
        const s = buildStepsMap(a.step_events || []);
        return { id: a.id, subDate: s.submitted || "" };
      })
      .filter(a => a.subDate)
      .sort((a, b) => a.subDate.localeCompare(b.subDate));

    const totalWaiting = waitingApps.length;
    const myIdx = waitingApps.findIndex(a => a.id === app.id);
    const position = myIdx + 1;

    const totalInStream = streamApps.length;
    const gotAor = streamApps.filter(a => (a.step_events || []).some(e => e.step_id === "aor")).length;

    // Progress through the queue as a percentage
    const pct = totalInStream > 0 ? Math.round((gotAor / totalInStream) * 100) : 0;

    return { position, totalWaiting, gotAor, totalInStream, pct };
  }, [app, allApps]);

  if (!data) return null;

  return (
    <div className="bg-white border border-sand-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">
          Queue Position ({app.stream})
        </span>
        <span className="text-xs font-bold text-brand-600">#{data.position} of {data.totalWaiting}</span>
      </div>

      {/* Progress bar */}
      <div className="relative mb-3">
        <div className="bg-sand-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-1000 relative"
            style={{ width: `${Math.max(data.pct, 3)}%` }}
          />
        </div>
        {/* Position marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-brand-600 border-2 border-white shadow-md flex items-center justify-center transition-all duration-1000"
          style={{ left: `calc(${data.pct}% - 10px)` }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-sand-400">
        <span>{data.gotAor} got AOR</span>
        <span>{data.totalWaiting} waiting</span>
      </div>
    </div>
  );
}
