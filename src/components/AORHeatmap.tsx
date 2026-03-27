"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface AORHeatmapProps {
  apps: Application[];
}

type CellStatus = "aor" | "waiting" | "stale" | "empty";

interface DayCell {
  date: string;
  day: number;
  submissions: number;
  withAor: number;
  status: CellStatus;
  label: string;
}

export function AORHeatmap({ apps }: AORHeatmapProps) {
  const { weeks, minDate, maxDate, stats } = useMemo(() => {
    // Build a map of submission date -> { total, withAor }
    const dateMap: Record<string, { total: number; withAor: number; initials: string[] }> = {};

    apps.forEach((a) => {
      const s = buildStepsMap(a.step_events || []);
      if (!s.submitted) return;
      const sub = s.submitted;
      if (!dateMap[sub]) dateMap[sub] = { total: 0, withAor: 0, initials: [] };
      dateMap[sub].total++;
      dateMap[sub].initials.push(a.initials);
      if (s.aor) dateMap[sub].withAor++;
    });

    const dates = Object.keys(dateMap).sort();
    if (dates.length === 0) return { weeks: [], minDate: "", maxDate: "", stats: null };

    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    // Find the Monday of the week containing minDate
    const startDate = new Date(minDate + "T00:00:00");
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset);

    // Find the Sunday after maxDate
    const endDate = new Date(maxDate + "T00:00:00");
    const endDayOfWeek = endDate.getDay();
    if (endDayOfWeek !== 0) endDate.setDate(endDate.getDate() + (7 - endDayOfWeek));

    // Build weeks grid
    // First compute latest AOR sub date so we can detect stale entries
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
            // Submitted before the latest AOR date but no AOR marked — likely didn't update
            status = "stale";
          } else {
            status = "waiting";
          }
        }

        week.push({
          date: dateStr,
          day: dayNum,
          submissions: data?.total || 0,
          withAor: data?.withAor || 0,
          status,
          label: `${month} ${dayNum}`,
        });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }

    // Stats
    const totalWithSub = Object.values(dateMap).reduce((a, b) => a + b.total, 0);
    const totalWithAor = Object.values(dateMap).reduce((a, b) => a + b.withAor, 0);

    // Next wave: earliest submission date AFTER the latest AOR sub date that has people waiting
    let nextWaveDate = "";
    const sortedDates = dates.sort();
    for (const dt of sortedDates) {
      if (dt > latestAorSubDate && dateMap[dt].total > dateMap[dt].withAor) {
        nextWaveDate = dt;
        break;
      }
    }

    return {
      weeks,
      minDate,
      maxDate,
      stats: {
        totalWithSub,
        totalWithAor,
        latestAorSubDate,
        nextWaveDate,
        nextWaveCount: nextWaveDate ? dateMap[nextWaveDate]?.total - dateMap[nextWaveDate]?.withAor : 0,
      },
    };
  }, [apps]);

  if (weeks.length === 0) return null;

  const fmtDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
  };

  // Get month labels for the top
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

  return (
    <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
      <h2 className="text-sm font-bold text-sand-900 mb-1">AOR Heatmap</h2>
      <p className="text-[11px] text-sand-400 mb-3">
        Which submission dates are getting AORs? Green = AOR received, amber = still waiting
      </p>

      {/* Key insight cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {stats.latestAorSubDate && (
            <div className="bg-brand-50 rounded-lg px-3 py-2.5">
              <div className="text-[9px] font-semibold text-brand-700 uppercase tracking-wider">AORs up to</div>
              <div className="text-sm font-bold text-brand-600">{fmtDate(stats.latestAorSubDate)} submissions</div>
            </div>
          )}
          {stats.nextWaveDate && (
            <div className="bg-warn-light rounded-lg px-3 py-2.5">
              <div className="text-[9px] font-semibold text-warn-dark uppercase tracking-wider">Next expected</div>
              <div className="text-sm font-bold text-warn-dark">{fmtDate(stats.nextWaveDate)} ({stats.nextWaveCount} waiting)</div>
            </div>
          )}
        </div>
      )}

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[320px]">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-[9px] font-semibold text-sand-500"
                style={{ width: `${(m.colSpan / weeks.length) * 100}%` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayLabel, dayIdx) => {
            const actualDayIdx = dayIdx === 6 ? 0 : dayIdx + 1; // Map Mon=1..Sun=0
            return (
              <div key={dayLabel} className="flex items-center gap-0.5 mb-0.5">
                <div className="w-7 text-[8px] text-sand-400 text-right pr-1 flex-shrink-0">
                  {dayIdx % 2 === 0 ? dayLabel : ""}
                </div>
                <div className="flex gap-0.5 flex-1">
                  {weeks.map((week, wi) => {
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
                      <div
                        key={wi}
                        className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] ${bg} ${border} transition-all hover:scale-125 cursor-default`}
                        title={title}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-[9px] text-sand-500">
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
          Waiting for AOR
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
