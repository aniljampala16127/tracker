"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

interface WaveTrackerProps {
  apps: Application[];
}

export function AORWaveTracker({ apps }: WaveTrackerProps) {
  const wave = useMemo(() => {
    const now = Date.now();

    // Find all AOR events with details
    const aorEntries: { initials: string; aorDate: string; subDate: string; createdAt: string; stream: string; days: number }[] = [];
    apps.forEach((a) => {
      const ev = (a.step_events || []).find(e => e.step_id === "aor");
      if (!ev) return;
      const s = buildStepsMap(a.step_events || []);
      const days = s.submitted && s.aor ? daysBetween(s.submitted, s.aor) : 0;
      aorEntries.push({
        initials: a.initials,
        aorDate: ev.event_date,
        subDate: s.submitted || "",
        createdAt: ev.created_at,
        stream: a.stream,
        days,
      });
    });

    if (aorEntries.length === 0) return null;

    // Sort by AOR date (most recent first)
    aorEntries.sort((a, b) => b.aorDate.localeCompare(a.aorDate) || b.createdAt.localeCompare(a.createdAt));

    const latest = aorEntries[0];
    const latestDate = new Date(latest.createdAt);
    const hoursSinceLast = Math.floor((now - latestDate.getTime()) / 3600000);
    const daysSinceLast = Math.floor(hoursSinceLast / 24);

    const latestDay = latest.aorDate;
    const waveAors = aorEntries.filter(e => e.aorDate === latestDay);

    const weekAors = aorEntries.filter(e => now - new Date(e.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000);

    // Streak
    const aorDays = new Set(aorEntries.map(e => e.createdAt.split("T")[0]));
    let streak = 0;
    const checkDate = new Date();
    for (let i = 0; i < 30; i++) {
      const ds = checkDate.toISOString().split("T")[0];
      if (aorDays.has(ds)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        break;
      }
    }

    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;

    // Recent AORs for the ticker (last 10)
    const recentAors = aorEntries.slice(0, 10);

    return {
      hoursSinceLast, daysSinceLast,
      waveCount: waveAors.length, waveDate: latestDay,
      weekCount: weekAors.length, streak, waiting,
      recentAors,
    };
  }, [apps]);

  if (!wave) return null;

  const isHot = wave.hoursSinceLast < 24;
  const isWarm = wave.hoursSinceLast < 72;

  return (
    <div className={`rounded-xl p-4 mb-4 border transition-all ${
      isHot
        ? "bg-gradient-to-r from-brand-50 to-brand-100 border-brand-200"
        : isWarm
        ? "bg-white border-sand-200"
        : "bg-gradient-to-r from-warn-light to-orange-50 border-warn/30"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isHot ? "bg-brand-500 animate-pulse" : isWarm ? "bg-warn" : "bg-error animate-pulse"}`} />
          <span className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">AOR Wave Tracker</span>
        </div>
        {wave.streak > 1 && (
          <span className="text-[10px] font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
            {wave.streak} day streak
          </span>
        )}
      </div>

      <div className="flex items-end gap-4 mb-3">
        <div className="flex-1">
          {isHot ? (
            <div>
              <div className="text-2xl font-bold text-brand-600">
                {wave.waveCount} AOR{wave.waveCount > 1 ? "s" : ""} today
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-bold tabular-nums ${wave.daysSinceLast > 2 ? "text-warn-dark" : "text-sand-800"}`}>
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

      {/* Scrolling AOR ticker */}
      <div className="overflow-hidden relative">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {wave.recentAors.map((a, i) => (
            <div key={i} className="flex-shrink-0 flex items-center gap-2 bg-white/70 rounded-lg px-2.5 py-1.5 border border-sand-100">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${
                a.stream === "Outland" ? "bg-brand-500" : "bg-warn"
              }`}>
                {a.initials.slice(0, 2)}
              </div>
              <div className="text-[10px] leading-tight">
                <div className="font-semibold text-sand-900">{a.initials}</div>
                <div className="text-sand-400">Sub {fmtDate(a.subDate)} &rarr; AOR {fmtDate(a.aorDate)}</div>
              </div>
              <div className="text-[10px] font-bold text-brand-600 ml-1">{a.days}d</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
