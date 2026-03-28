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
    const today = new Date().toISOString().split("T")[0];

    // Find all AOR events with dates
    const aorEvents: { initials: string; aorDate: string; createdAt: string; stream: string }[] = [];
    apps.forEach((a) => {
      const ev = (a.step_events || []).find(e => e.step_id === "aor");
      if (!ev) return;
      aorEvents.push({
        initials: a.initials,
        aorDate: ev.event_date,
        createdAt: ev.created_at,
        stream: a.stream,
      });
    });

    if (aorEvents.length === 0) return null;

    // Sort by when the AOR was reported (created_at)
    aorEvents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Latest AOR event
    const latest = aorEvents[0];
    const latestDate = new Date(latest.createdAt);
    const hoursSinceLast = Math.floor((now - latestDate.getTime()) / 3600000);
    const daysSinceLast = Math.floor(hoursSinceLast / 24);

    // Count AORs in the last wave (same day as latest)
    const latestDay = latest.createdAt.split("T")[0];
    const waveAors = aorEvents.filter(e => e.createdAt.startsWith(latestDay));

    // AORs in last 7 days
    const weekAors = aorEvents.filter(e => now - new Date(e.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000);

    // Streak: count consecutive days with AOR reports (going backwards from today)
    const aorDays = new Set(aorEvents.map(e => e.createdAt.split("T")[0]));
    let streak = 0;
    const checkDate = new Date();
    for (let i = 0; i < 30; i++) {
      const ds = checkDate.toISOString().split("T")[0];
      if (aorDays.has(ds)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Today might not have AOR yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        break;
      }
    }

    // Total waiting
    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;

    return {
      hoursSinceLast,
      daysSinceLast,
      waveCount: waveAors.length,
      waveDate: latestDay,
      weekCount: weekAors.length,
      streak,
      waiting,
      latestStream: latest.stream,
      latestInitials: latest.initials,
    };
  }, [apps]);

  if (!wave) return null;

  // Urgency color based on time since last AOR
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

      <div className="flex items-end gap-4">
        {/* Main counter */}
        <div className="flex-1">
          {isHot ? (
            <div>
              <div className="text-2xl font-bold text-brand-600">
                {wave.waveCount} AOR{wave.waveCount > 1 ? "s" : ""} today
              </div>
              <div className="text-xs text-sand-500">
                Last: {wave.latestInitials} ({wave.latestStream})
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
              <div className="text-xs text-sand-400 mt-0.5">
                Last wave: {fmtDate(wave.waveDate)} ({wave.waveCount} AOR{wave.waveCount > 1 ? "s" : ""})
              </div>
            </div>
          )}
        </div>

        {/* Side stats */}
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
    </div>
  );
}
