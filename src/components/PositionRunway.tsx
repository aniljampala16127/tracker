"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

interface PositionRunwayProps {
  app: Application;
  allApps: Application[];
}

export function PositionRunway({ app, allApps }: PositionRunwayProps) {
  const data = useMemo(() => {
    const stepsMap = buildStepsMap(app.step_events || []);
    const hasAor = !!stepsMap.aor;
    const streamApps = allApps.filter(a => a.stream === app.stream);

    if (hasAor) {
      // Already got AOR — show progress through remaining steps
      return null;
    }

    // Queue: people waiting for AOR in same stream, sorted by submission date
    const waitingApps = streamApps
      .filter(a => !(a.step_events || []).some(e => e.step_id === "aor"))
      .map(a => {
        const s = buildStepsMap(a.step_events || []);
        return { id: a.id, initials: a.initials, subDate: s.submitted || "" };
      })
      .filter(a => a.subDate)
      .sort((a, b) => a.subDate.localeCompare(b.subDate));

    const totalWaiting = waitingApps.length;
    const myIdx = waitingApps.findIndex(a => a.id === app.id);
    const position = myIdx + 1;

    // How many got AOR this week (moved ahead of me)
    const now = Date.now();
    const recentAors = streamApps.filter(a => {
      const ev = (a.step_events || []).find(e => e.step_id === "aor");
      if (!ev) return false;
      return now - new Date(ev.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length;

    // Percentage through queue
    const totalInStream = streamApps.length;
    const gotAor = streamApps.filter(a => (a.step_events || []).some(e => e.step_id === "aor")).length;
    const pct = totalInStream > 0 ? Math.round(((gotAor) / totalInStream) * 100) : 0;

    // People ahead (submitted before me, still waiting)
    const ahead = myIdx;
    // People behind
    const behind = totalWaiting - position;

    return { position, totalWaiting, ahead, behind, recentAors, pct, gotAor, totalInStream };
  }, [app, allApps]);

  if (!data) return null;

  // Build runway dots
  const dots = [];
  const total = data.totalInStream;
  const dotCount = Math.min(total, 30); // Cap visual dots
  const myDotIdx = Math.round((data.gotAor / total) * dotCount);

  for (let i = 0; i < dotCount; i++) {
    const isMe = i === myDotIdx;
    const isAhead = i < myDotIdx;
    dots.push({ isMe, isAhead });
  }

  return (
    <div className="bg-white border border-sand-200 rounded-xl p-4 mb-4">
      <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-3">
        Your Queue Position ({app.stream})
      </div>

      {/* Runway */}
      <div className="relative mb-3">
        <div className="flex items-center gap-[3px]">
          {dots.map((d, i) => (
            <div key={i} className="flex-1 flex justify-center">
              {d.isMe ? (
                <div className="relative">
                  <div className="w-4 h-4 rounded-full bg-brand-500 shadow-lg shadow-brand-500/40 animate-bounce" 
                    style={{ animationDuration: "2s" }} />
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-brand-600 whitespace-nowrap">
                    YOU
                  </div>
                </div>
              ) : (
                <div className={`h-2 rounded-full transition-all duration-1000 ${
                  d.isAhead ? "w-2 bg-brand-400" : "w-2 bg-sand-200"
                }`} />
              )}
            </div>
          ))}
        </div>
        {/* Labels */}
        <div className="flex justify-between mt-2 text-[8px] text-sand-400">
          <span>AOR received ({data.gotAor})</span>
          <span>Waiting ({data.totalWaiting})</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-sand-50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-sand-900">#{data.position}</div>
          <div className="text-[9px] text-sand-400">in queue</div>
        </div>
        <div className="bg-sand-50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-brand-600">{data.ahead}</div>
          <div className="text-[9px] text-sand-400">ahead of you</div>
        </div>
        <div className="bg-sand-50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-sand-600">{data.behind}</div>
          <div className="text-[9px] text-sand-400">behind you</div>
        </div>
      </div>

      {data.recentAors > 0 && (
        <div className="mt-3 bg-brand-50 rounded-lg px-3 py-2 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <path d="M18 15L12 9L6 15" />
            </svg>
          </div>
          <span className="text-xs text-brand-700 font-medium">
            {data.recentAors} people moved ahead of you this week
          </span>
        </div>
      )}
    </div>
  );
}
