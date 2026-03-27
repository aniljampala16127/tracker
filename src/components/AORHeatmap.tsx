"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type CellStatus = "aor" | "waiting" | "stale" | "empty";

interface DayCell {
  date: string;
  day: number;
  submissions: number;
  withAor: number;
  status: CellStatus;
  label: string;
}

interface HeatmapData {
  weeks: DayCell[][];
  monthLabels: { label: string; colSpan: number }[];
  latestAorSubDate: string;
  nextWaveDate: string;
  nextWaveCount: number;
  totalEntries: number;
  totalWithAor: number;
}

function buildHeatmapData(apps: Application[]): HeatmapData | null {
  const dateMap: Record<string, { total: number; withAor: number }> = {};

  apps.forEach((a) => {
    const s = buildStepsMap(a.step_events || []);
    if (!s.submitted) return;
    const sub = s.submitted;
    if (!dateMap[sub]) dateMap[sub] = { total: 0, withAor: 0 };
    dateMap[sub].total++;
    if (s.aor) dateMap[sub].withAor++;
  });

  const dates = Object.keys(dateMap).sort();
  if (dates.length === 0) return null;

  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const startDate = new Date(minDate + "T00:00:00");
  const dayOfWeek = startDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + mondayOffset);

  const endDate = new Date(maxDate + "T00:00:00");
  const endDayOfWeek = endDate.getDay();
  if (endDayOfWeek !== 0) endDate.setDate(endDate.getDate() + (7 - endDayOfWeek));

  let latestAorSubDate = "";
  apps.forEach((a) => {
    const s = buildStepsMap(a.step_events || []);
    if (s.submitted && s.aor && s.submitted > latestAorSubDate) {
      latestAorSubDate = s.submitted;
    }
  });

  const weeks: DayCell[][] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().split("T")[0];
      const data = dateMap[dateStr];
      const dayNum = current.getDate();
      const month = MONTHS[current.getMonth()];

      let status: CellStatus = "empty";
      if (data) {
        if (data.withAor > 0) {
          status = "aor";
        } else if (latestAorSubDate && dateStr < latestAorSubDate) {
          status = "stale";
        } else {
          status = "waiting";
        }
      }

      week.push({
        date: dateStr, day: dayNum,
        submissions: data?.total || 0, withAor: data?.withAor || 0,
        status, label: `${month} ${dayNum}`,
      });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  let nextWaveDate = "";
  for (const dt of dates) {
    if (dt > latestAorSubDate && dateMap[dt].total > dateMap[dt].withAor) {
      nextWaveDate = dt;
      break;
    }
  }

  const monthLabels: { label: string; colSpan: number }[] = [];
  let prevMonth = "";
  weeks.forEach((week) => {
    const mondayDate = new Date(week[0].date + "T00:00:00");
    const monthKey = `${MONTHS[mondayDate.getMonth()]} ${mondayDate.getFullYear()}`;
    if (monthKey !== prevMonth) {
      monthLabels.push({ label: monthKey, colSpan: 1 });
      prevMonth = monthKey;
    } else {
      monthLabels[monthLabels.length - 1].colSpan++;
    }
  });

  return {
    weeks, monthLabels, latestAorSubDate, nextWaveDate,
    nextWaveCount: nextWaveDate ? dateMap[nextWaveDate]?.total - dateMap[nextWaveDate]?.withAor : 0,
    totalEntries: apps.length,
    totalWithAor: Object.values(dateMap).reduce((a, b) => a + b.withAor, 0),
  };
}

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

function HeatmapGrid({ data }: { data: HeatmapData }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {data.latestAorSubDate && (
          <div className="bg-brand-50 rounded-lg px-3 py-2">
            <div className="text-[9px] font-semibold text-brand-700 uppercase tracking-wider">AORs up to</div>
            <div className="text-sm font-bold text-brand-600">{fmtDate(data.latestAorSubDate)} sub</div>
          </div>
        )}
        {data.nextWaveDate && (
          <div className="bg-sand-50 rounded-lg px-3 py-2">
            <div className="text-[9px] font-semibold text-sand-500 uppercase tracking-wider">Next expected</div>
            <div className="text-sm font-bold text-sand-700">{fmtDate(data.nextWaveDate)} ({data.nextWaveCount} waiting)</div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[300px]">
          <div className="flex mb-1 ml-8">
            {data.monthLabels.map((m, i) => (
              <div key={i} className="text-[9px] font-semibold text-sand-500"
                style={{ width: `${(m.colSpan / data.weeks.length) * 100}%` }}>
                {m.label}
              </div>
            ))}
          </div>

          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayLabel, dayIdx) => {
            const actualDayIdx = dayIdx === 6 ? 0 : dayIdx + 1;
            return (
              <div key={dayLabel} className="flex items-center gap-0.5 mb-0.5">
                <div className="w-7 text-[8px] text-sand-400 text-right pr-1 flex-shrink-0">
                  {dayIdx % 2 === 0 ? dayLabel : ""}
                </div>
                <div className="flex gap-0.5 flex-1">
                  {data.weeks.map((week, wi) => {
                    const cell = week[actualDayIdx === 0 ? 6 : actualDayIdx - 1];
                    if (!cell) return <div key={wi} className="w-3 h-3 sm:w-4 sm:h-4" />;

                    let bg = "bg-sand-100";
                    let border = "";
                    let title = `${cell.label}: No submissions`;

                    if (cell.status === "aor") {
                      const pct = cell.withAor / cell.submissions;
                      if (pct >= 1) bg = "bg-brand-500";
                      else if (pct >= 0.5) bg = "bg-brand-400";
                      else bg = "bg-brand-300";
                      title = `${cell.label}: ${cell.withAor}/${cell.submissions} got AOR`;
                    } else if (cell.status === "stale") {
                      bg = "bg-sand-300";
                      title = `${cell.label}: ${cell.submissions} likely got AOR (not updated)`;
                    } else if (cell.status === "waiting") {
                      bg = "bg-warn";
                      border = "ring-1 ring-warn-dark/20";
                      title = `${cell.label}: ${cell.submissions} waiting for AOR`;
                    }

                    return (
                      <div key={wi}
                        className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] ${bg} ${border} transition-all hover:scale-125 cursor-default`}
                        title={title} />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AORHeatmap({ apps }: { apps: Application[] }) {
  const outlandApps = useMemo(() => apps.filter(a => a.stream === "Outland"), [apps]);
  const inlandApps = useMemo(() => apps.filter(a => a.stream === "Inland"), [apps]);
  const outlandData = useMemo(() => buildHeatmapData(outlandApps), [outlandApps]);
  const inlandData = useMemo(() => buildHeatmapData(inlandApps), [inlandApps]);

  if (!outlandData && !inlandData) return null;

  return (
    <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
      <h2 className="text-sm font-bold text-sand-900 mb-1">AOR Heatmap</h2>
      <p className="text-[11px] text-sand-400 mb-4">
        Which submission dates are getting AORs? Green = received, amber = waiting
      </p>

      {outlandData && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-600">Outland</span>
            <span className="text-[10px] text-sand-400">{outlandData.totalEntries} entries, {outlandData.totalWithAor} with AOR</span>
          </div>
          <HeatmapGrid data={outlandData} />
        </div>
      )}

      {inlandData && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-warn-light text-warn-dark">Inland</span>
            <span className="text-[10px] text-sand-400">{inlandData.totalEntries} entries, {inlandData.totalWithAor} with AOR</span>
          </div>
          <HeatmapGrid data={inlandData} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-sand-100 text-[9px] text-sand-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-sand-100" />
          No submissions
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-sand-300" />
          Likely got AOR
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-warn" />
          Waiting
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-brand-300" />
          Some AORs
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-brand-500" />
          All got AOR
        </div>
      </div>
    </div>
  );
}
