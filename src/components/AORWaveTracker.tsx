"use client";

import { useMemo, useState, useRef } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MO[dt.getMonth()]} ${dt.getDate()}`;
}

function fmtDateFull(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MO[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

interface AorEntry {
  initials: string;
  aorDate: string;
  subDate: string;
  stream: string;
  days: number;
  country: string;
}

type Tab = "today" | "yesterday" | "week";

export function AORWaveTracker({ apps }: { apps: Application[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("week");
  const touchStartX = useRef(0);

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

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const tabs: Tab[] = ["today", "yesterday", "week"];
    const idx = tabs.indexOf(activeTab);
    if (diff > 50 && idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
    if (diff < -50 && idx > 0) setActiveTab(tabs[idx - 1]);
  };

  if (data.totalAor === 0) return null;

  const tabData: Record<Tab, { entries: AorEntry[]; label: string; emptyMsg: string }> = {
    today: { entries: data.todayAors, label: "Today", emptyMsg: "No AORs received today" },
    yesterday: { entries: data.yesterdayAors, label: "Yesterday", emptyMsg: "No AORs received yesterday" },
    week: { entries: data.weekAors, label: "This Week", emptyMsg: "No AORs this week" },
  };

  const current = tabData[activeTab];
  const hasWeekActivity = data.weekAors.length > 0;

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

      {/* Tab bar */}
      <div className="flex bg-white/60 rounded-lg p-0.5 mb-3 border border-sand-100">
        {(["today", "yesterday", "week"] as Tab[]).map(tab => {
          const count = tabData[tab].entries.length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                activeTab === tab
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-sand-500 hover:text-sand-700"
              }`}
            >
              {tabData[tab].label}
              {count > 0 && (
                <span className={`text-[9px] px-1.5 py-px rounded-full font-bold ${
                  activeTab === tab ? "bg-white/25" : "bg-sand-200 text-sand-600"
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Swipeable card area */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="min-h-[60px]"
      >
        {current.entries.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-xs text-sand-400">{current.emptyMsg}</div>
            {data.latestAorDate && activeTab === "today" && (
              <div className="text-[10px] text-sand-400 mt-1">Last AOR: {fmtDateFull(data.latestAorDate)}</div>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            {current.entries.map((a, i) => (
              <div key={`${a.initials}-${i}`} className="flex items-center gap-3 bg-white/80 rounded-xl px-3 py-2.5 border border-sand-100">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${
                  a.stream === "Outland" ? "bg-brand-500" : "bg-warn"
                }`}>
                  {a.initials.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-sand-900">{a.initials}</span>
                    <span className={`px-1.5 py-px rounded-full text-[8px] font-semibold ${
                      a.stream === "Outland" ? "bg-brand-100 text-brand-700" : "bg-warn-light text-warn-dark"
                    }`}>{a.stream}</span>
                  </div>
                  <div className="text-[10px] text-sand-500">
                    {a.country} · Sub {fmtDate(a.subDate)}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-brand-600">{a.days}d</div>
                  <div className="text-[9px] text-sand-400">AOR {fmtDate(a.aorDate)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Swipe dots */}
      <div className="flex justify-center gap-1.5 mt-2.5">
        {(["today", "yesterday", "week"] as Tab[]).map(tab => (
          <div key={tab} className={`h-1.5 rounded-full transition-all duration-300 ${
            activeTab === tab ? "bg-brand-500 w-4" : "bg-sand-300 w-1.5"
          }`} />
        ))}
      </div>
    </div>
  );
}
