"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

interface StreamInsight {
  stream: string;
  totalEntries: number;
  totalWithAor: number;
  latestAorSubDate: string;
  nextWaveDate: string;
  nextWaveCount: number;
}

function computeStreamInsight(apps: Application[], stream: string): StreamInsight | null {
  const streamApps = apps.filter(a => a.stream === stream);
  if (streamApps.length === 0) return null;

  const dateMap: Record<string, { total: number; withAor: number }> = {};

  streamApps.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (!s.submitted) return;
    if (!dateMap[s.submitted]) dateMap[s.submitted] = { total: 0, withAor: 0 };
    dateMap[s.submitted].total++;
    if (s.aor) dateMap[s.submitted].withAor++;
  });

  const dates = Object.keys(dateMap).sort();
  if (dates.length === 0) return null;

  let latestAorSubDate = "";
  streamApps.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (s.submitted && s.aor && s.submitted > latestAorSubDate) {
      latestAorSubDate = s.submitted;
    }
  });

  let nextWaveDate = "";
  for (const dt of dates) {
    if (dt > latestAorSubDate && dateMap[dt].total > dateMap[dt].withAor) {
      nextWaveDate = dt;
      break;
    }
  }

  const totalEntries = streamApps.filter(a => buildStepsMap(a.step_events || []).submitted).length;
  const totalWithAor = streamApps.filter(a => buildStepsMap(a.step_events || []).aor).length;

  return {
    stream,
    totalEntries,
    totalWithAor,
    latestAorSubDate,
    nextWaveDate,
    nextWaveCount: nextWaveDate ? dateMap[nextWaveDate].total - dateMap[nextWaveDate].withAor : 0,
  };
}

export function AORProgress({ apps }: { apps: Application[] }) {
  const outland = useMemo(() => computeStreamInsight(apps, "Outland"), [apps]);
  const inland = useMemo(() => computeStreamInsight(apps, "Inland"), [apps]);

  if (!outland && !inland) return null;

  return (
    <div>
      {outland && <StreamCard insight={outland} color="brand" />}
      {inland && <StreamCard insight={inland} color="warn" />}
    </div>
  );
}

function StreamCard({ insight, color }: { insight: StreamInsight; color: "brand" | "warn" }) {
  const pct = insight.totalEntries > 0
    ? Math.round((insight.totalWithAor / insight.totalEntries) * 100)
    : 0;

  const colorClasses = color === "brand"
    ? { badge: "bg-brand-500/15 text-brand-700", bar: "bg-brand-500", light: "bg-brand-500/[0.06] border-brand-500/20" }
    : { badge: "bg-warn/15 text-warn-dark", bar: "bg-warn", light: "bg-warn/10 border-warn/25" };

  return (
    <div className={`mb-4 last:mb-0 nums-tabular`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${colorClasses.badge}`}>
          {insight.stream}
        </span>
        <span className="text-[11px] text-sand-500">
          <span className="font-bold text-sand-700">{insight.totalWithAor}</span> of {insight.totalEntries} got AOR · <span className="font-bold">{pct}%</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-sand-100 rounded-full mb-3 overflow-hidden">
        <div className={`h-full rounded-full ${colorClasses.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-lg border p-3 ${colorClasses.light}`}>
          <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1">AORs up to</div>
          <div className="text-[13px] font-bold text-sand-900">
            {insight.latestAorSubDate ? `${fmt(insight.latestAorSubDate)} sub` : "—"}
          </div>
        </div>
        <div className={`rounded-lg border p-3 ${colorClasses.light}`}>
          <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1">Next expected</div>
          <div className="text-[13px] font-bold text-sand-900">
            {insight.nextWaveDate
              ? <>{fmt(insight.nextWaveDate)} <span className="text-sand-500 font-medium">({insight.nextWaveCount} waiting)</span></>
              : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
