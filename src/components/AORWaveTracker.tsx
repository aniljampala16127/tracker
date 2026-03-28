"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

export function AORWaveTracker({ apps }: { apps: Application[] }) {
  const wave = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Get all AOR entries with their actual event_date
    const aorEntries: { initials: string; aorDate: string; subDate: string; stream: string; days: number }[] = [];
    apps.forEach((a) => {
      const ev = (a.step_events || []).find(e => e.step_id === "aor");
      if (!ev) return;
      const s = buildStepsMap(a.step_events || []);
      const days = s.submitted && s.aor ? daysBetween(s.submitted, s.aor) : 0;
      aorEntries.push({
        initials: a.initials, aorDate: ev.event_date, subDate: s.submitted || "",
        stream: a.stream, days,
      });
    });

    if (aorEntries.length === 0) return null;

    // Sort by AOR date (most recent first)
    aorEntries.sort((a, b) => b.aorDate.localeCompare(a.aorDate));

    // This week's AORs (last 7 days by event_date)
    const weekCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const weekAors = aorEntries.filter(e => e.aorDate >= weekCutoff);

    // Days since last AOR (by event_date)
    const latestAorDate = aorEntries[0].aorDate;
    const daysSinceLast = daysBetween(latestAorDate, todayStr);

    // Waiting count
    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;

    // Total with AOR
    const totalAor = aorEntries.length;

    return {
      daysSinceLast,
      weekCount: weekAors.length,
      totalAor,
      waiting,
      latestAorDate,
      tickerAors: weekAors.length > 0 ? weekAors : aorEntries.slice(0, 5),
      hasWeekAors: weekAors.length > 0,
    };
  }, [apps]);

  // No JS ticker needed — using pure CSS animation now

  if (!wave) return null;

  const isActive = wave.hasWeekAors;

  return (
    <div className={`rounded-xl p-4 mb-4 border transition-all ${
      isActive
        ? "bg-gradient-to-r from-brand-50 to-brand-100 border-brand-200"
        : "bg-white border-sand-200"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? "bg-brand-500 animate-pulse" : "bg-sand-400"}`} />
          <span className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">AOR Wave Tracker</span>
        </div>
        <span className="text-[10px] text-sand-400">{wave.totalAor} total AORs</span>
      </div>

      <div className="flex items-end gap-4 mb-3">
        <div className="flex-1">
          {isActive ? (
            <div className="text-2xl font-bold text-brand-600">
              {wave.weekCount} AOR{wave.weekCount > 1 ? "s" : ""} this week
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-bold tabular-nums ${wave.daysSinceLast > 5 ? "text-warn-dark" : "text-sand-800"}`}>
                  {wave.daysSinceLast}
                </span>
                <span className="text-sm text-sand-500">
                  day{wave.daysSinceLast !== 1 ? "s" : ""} since last AOR
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-brand-600">{wave.weekCount}</div>
            <div className="text-[9px] text-sand-400 uppercase">This week</div>
          </div>
          <div>
            <div className="text-lg font-bold text-warn-dark">{wave.waiting}</div>
            <div className="text-[9px] text-sand-400 uppercase">Waiting</div>
          </div>
        </div>
      </div>

      {/* AOR ticker */}
      {wave.tickerAors.length > 0 && (
        <div>
          <div className="text-[9px] text-sand-400 mb-1.5">
            {wave.hasWeekAors ? "Received this week" : `Latest AORs — ${fmtDate(wave.latestAorDate)}`}
          </div>
          <div className="overflow-hidden">
            <div className="flex gap-3 w-max ticker-marquee">
              {[...wave.tickerAors, ...wave.tickerAors].map((a, i) => (
              <div key={i} className="flex-shrink-0 w-[55vw] max-w-[220px] flex items-center gap-3 bg-white/80 rounded-xl px-3 py-2.5 border border-sand-100">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                  a.stream === "Outland" ? "bg-brand-500" : "bg-warn"
                }`}>
                  {a.initials.slice(0, 2)}
                </div>
                <div className="text-[11px] leading-snug flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sand-900">{a.initials}</span>
                    <span className={`px-1.5 py-px rounded text-[8px] font-semibold ${
                      a.stream === "Outland" ? "bg-brand-100 text-brand-600" : "bg-warn-light text-warn-dark"
                    }`}>{a.stream}</span>
                  </div>
                  <div className="text-sand-400 mt-0.5">Sub {fmtDate(a.subDate)}</div>
                </div>
                <span className="text-xs font-bold text-brand-600">{a.days}d</span>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
