"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MO[dt.getMonth()]} ${dt.getDate()}`;
}

interface AorEntry {
  initials: string;
  aorDate: string;
  subDate: string;
  stream: string;
  days: number;
  country: string;
}

export function AORWaveTracker({ apps }: { apps: Application[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const weekCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const allAors: AorEntry[] = [];
    apps.forEach(a => {
      const ev = (a.step_events || []).find(e => e.step_id === "aor");
      if (!ev) return;
      const s = buildStepsMap(a.step_events || []);
      const days = s.submitted && s.aor ? daysBetween(s.submitted, s.aor) : 0;
      allAors.push({
        initials: a.initials, aorDate: ev.event_date, subDate: s.submitted || "",
        stream: a.stream, days, country: a.country_origin,
      });
    });

    allAors.sort((a, b) => b.aorDate.localeCompare(a.aorDate));

    const todayAors = allAors.filter(e => e.aorDate === todayStr);
    const yesterdayAors = allAors.filter(e => e.aorDate === yesterday);
    const weekAors = allAors.filter(e => e.aorDate >= weekCutoff);
    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;
    const latestAorDate = allAors.length > 0 ? allAors[0].aorDate : "";
    const daysSinceLast = latestAorDate ? daysBetween(latestAorDate, todayStr) : 0;

    return { todayAors, yesterdayAors, weekAors, waiting, totalAor: allAors.length, daysSinceLast, latestAorDate };
  }, [apps]);

  if (data.totalAor === 0) return null;

  const hasWeekActivity = data.weekAors.length > 0;

  const cards = [
    { label: "Today", entries: data.todayAors, color: "brand" as const },
    { label: "Yesterday", entries: data.yesterdayAors, color: "brand" as const },
    { label: "This Week", entries: data.weekAors, color: "brand" as const },
  ];

  return (
    <div className={`rounded-xl p-4 mb-4 border transition-all ${
      hasWeekActivity
        ? "bg-gradient-to-r from-brand-50 to-brand-100 border-brand-200"
        : "bg-white border-sand-200"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasWeekActivity ? "bg-brand-500 animate-pulse" : "bg-sand-400"}`} />
          <span className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">AOR Wave Tracker</span>
        </div>
        <span className="text-[10px] text-sand-400">{data.totalAor} total AORs</span>
      </div>

      {/* Stats row */}
      <div className="flex items-end gap-4 mb-3">
        <div className="flex-1">
          {hasWeekActivity ? (
            <div className="text-2xl font-bold text-brand-600">
              {data.weekAors.length} AOR{data.weekAors.length > 1 ? "s" : ""} this week
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-bold tabular-nums ${data.daysSinceLast > 5 ? "text-warn-dark" : "text-sand-800"}`}>
                {data.daysSinceLast}
              </span>
              <span className="text-sm text-sand-500">
                day{data.daysSinceLast !== 1 ? "s" : ""} since last AOR
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-brand-600">{data.weekAors.length}</div>
            <div className="text-[9px] text-sand-400 uppercase">This week</div>
          </div>
          <div>
            <div className="text-lg font-bold text-warn-dark">{data.waiting}</div>
            <div className="text-[9px] text-sand-400 uppercase">Waiting</div>
          </div>
        </div>
      </div>

      {/* Three swipeable cards */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex-shrink-0 w-[78vw] max-w-[300px] snap-center bg-white/80 rounded-xl border border-sand-100 overflow-hidden"
          >
            {/* Card header */}
            <div className="px-3 py-2 border-b border-sand-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-sand-900">{card.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                card.entries.length > 0 ? "bg-brand-100 text-brand-700" : "bg-sand-100 text-sand-400"
              }`}>{card.entries.length}</span>
            </div>

            {/* Card body — scrolling names */}
            {card.entries.length === 0 ? (
              <div className="px-3 py-5 text-center">
                <div className="text-[11px] text-sand-400">No AORs {card.label.toLowerCase()}</div>
              </div>
            ) : (
              <div className="overflow-hidden h-[120px] relative">
                {/* Fade edges */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/80 to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white/80 to-transparent z-10 pointer-events-none" />

                {/* Vertically scrolling entries */}
                <div className="aor-vertical-scroll">
                  {[...card.entries, ...card.entries].map((a, i) => (
                    <div key={`${a.initials}-${i}`} className="flex items-center gap-2.5 px-3 py-1.5">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 ${
                        a.stream === "Outland" ? "bg-brand-500" : "bg-warn"
                      }`}>
                        {a.initials.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-sand-900 truncate">{a.initials}</span>
                          <span className={`px-1 py-px rounded text-[7px] font-semibold flex-shrink-0 ${
                            a.stream === "Outland" ? "bg-brand-100 text-brand-700" : "bg-warn-light text-warn-dark"
                          }`}>{a.stream}</span>
                        </div>
                        <div className="text-[9px] text-sand-400">{a.country} · Sub {fmtDate(a.subDate)}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[11px] font-bold text-brand-600">{a.days}d</div>
                        <div className="text-[8px] text-sand-400">{fmtDate(a.aorDate)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
