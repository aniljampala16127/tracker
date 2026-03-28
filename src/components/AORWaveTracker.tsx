"use client";

import { useMemo, useRef, useEffect } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

export function AORWaveTracker({ apps }: { apps: Application[] }) {
  const tickerRef = useRef<HTMLDivElement>(null);

  const wave = useMemo(() => {
    const now = Date.now();

    const aorEntries: { initials: string; aorDate: string; subDate: string; createdAt: string; stream: string; days: number }[] = [];
    apps.forEach((a) => {
      const ev = (a.step_events || []).find(e => e.step_id === "aor");
      if (!ev) return;
      const s = buildStepsMap(a.step_events || []);
      const days = s.submitted && s.aor ? daysBetween(s.submitted, s.aor) : 0;
      aorEntries.push({
        initials: a.initials, aorDate: ev.event_date, subDate: s.submitted || "",
        createdAt: ev.created_at, stream: a.stream, days,
      });
    });

    if (aorEntries.length === 0) return null;

    aorEntries.sort((a, b) => b.aorDate.localeCompare(a.aorDate) || b.createdAt.localeCompare(a.createdAt));

    const latest = aorEntries[0];
    const latestDate = new Date(latest.createdAt);
    const hoursSinceLast = Math.floor((now - latestDate.getTime()) / 3600000);
    const daysSinceLast = Math.floor(hoursSinceLast / 24);

    // Today's AORs only
    const today = new Date().toISOString().split("T")[0];
    const todayAors = aorEntries.filter(e => e.createdAt.startsWith(today));

    // If no AORs today, show the latest wave day's AORs
    const latestWaveDay = aorEntries[0].createdAt.split("T")[0];
    const latestWaveAors = aorEntries.filter(e => e.createdAt.startsWith(latestWaveDay));

    const weekAors = aorEntries.filter(e => now - new Date(e.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000);

    // Streak
    const aorDays = new Set(aorEntries.map(e => e.createdAt.split("T")[0]));
    let streak = 0;
    const checkDate = new Date();
    for (let i = 0; i < 30; i++) {
      const ds = checkDate.toISOString().split("T")[0];
      if (aorDays.has(ds)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else if (i === 0) { checkDate.setDate(checkDate.getDate() - 1); continue; }
      else break;
    }

    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;
    const isToday = todayAors.length > 0;
    const tickerAors = isToday ? todayAors : latestWaveAors;

    return {
      hoursSinceLast, daysSinceLast,
      todayCount: todayAors.length,
      waveCount: latestWaveAors.length,
      waveDate: latestWaveDay,
      weekCount: weekAors.length, streak, waiting,
      tickerAors, isToday,
    };
  }, [apps]);

  // Auto-scroll ticker
  useEffect(() => {
    const el = tickerRef.current;
    if (!el || !wave || wave.tickerAors.length <= 2) return;

    let scrollPos = 0;
    const speed = 0.5; // px per frame
    let animId: number;

    const scroll = () => {
      scrollPos += speed;
      if (scrollPos >= el.scrollWidth - el.clientWidth) {
        scrollPos = 0;
      }
      el.scrollLeft = scrollPos;
      animId = requestAnimationFrame(scroll);
    };

    // Start after a short delay
    const timeout = setTimeout(() => { animId = requestAnimationFrame(scroll); }, 1500);

    // Pause on touch
    const pause = () => cancelAnimationFrame(animId);
    const resume = () => { animId = requestAnimationFrame(scroll); };
    el.addEventListener("touchstart", pause);
    el.addEventListener("touchend", resume);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(animId);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [wave]);

  if (!wave) return null;

  const isHot = wave.isToday;
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
            <div className="text-2xl font-bold text-brand-600">
              {wave.todayCount} AOR{wave.todayCount > 1 ? "s" : ""} today
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

      {/* Auto-scrolling AOR ticker */}
      {wave.tickerAors.length > 0 && (
        <div>
          <div className="text-[9px] text-sand-400 mb-1.5">
            {wave.isToday ? "Received today" : `Last wave — ${fmtDate(wave.waveDate)}`}
          </div>
          <div ref={tickerRef} className="flex gap-2 overflow-x-auto hide-scrollbar">
            {wave.tickerAors.map((a, i) => (
              <div key={i} className="flex-shrink-0 flex items-center gap-2 bg-white/80 rounded-lg px-2.5 py-1.5 border border-sand-100">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${
                  a.stream === "Outland" ? "bg-brand-500" : "bg-warn"
                }`}>
                  {a.initials.slice(0, 2)}
                </div>
                <div className="text-[10px] leading-tight">
                  <span className="font-semibold text-sand-900">{a.initials}</span>
                  <span className={`ml-1 px-1 py-px rounded text-[8px] font-semibold ${
                    a.stream === "Outland" ? "bg-brand-100 text-brand-600" : "bg-warn-light text-warn-dark"
                  }`}>{a.stream}</span>
                  <div className="text-sand-400">Sub {fmtDate(a.subDate)}</div>
                </div>
                <span className="text-[10px] font-bold text-brand-600">{a.days}d</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
