"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

interface CountryData {
  country: string;
  outlandAvg: number | null;
  outlandCount: number;
  inlandAvg: number | null;
  inlandCount: number;
  totalEntries: number;
  totalAor: number;
}

export function CountryBreakdown({ apps }: { apps: Application[] }) {
  const data = useMemo(() => {
    const map: Record<string, {
      outlandDays: number[]; inlandDays: number[];
      outlandTotal: number; inlandTotal: number;
    }> = {};

    apps.forEach(a => {
      const c = a.country_origin;
      if (!c) return;
      if (!map[c]) map[c] = { outlandDays: [], inlandDays: [], outlandTotal: 0, inlandTotal: 0 };
      if (a.stream === "Outland") map[c].outlandTotal++;
      else map[c].inlandTotal++;

      const s = buildStepsMap(a.step_events || []);
      if (s.submitted && s.aor) {
        const d = daysBetween(s.submitted, s.aor);
        if (a.stream === "Outland") map[c].outlandDays.push(d);
        else map[c].inlandDays.push(d);
      }
    });

    const result: CountryData[] = Object.entries(map)
      .map(([country, v]) => ({
        country,
        outlandAvg: v.outlandDays.length >= 1
          ? Math.round(v.outlandDays.reduce((a, b) => a + b, 0) / v.outlandDays.length)
          : null,
        outlandCount: v.outlandDays.length,
        inlandAvg: v.inlandDays.length >= 1
          ? Math.round(v.inlandDays.reduce((a, b) => a + b, 0) / v.inlandDays.length)
          : null,
        inlandCount: v.inlandDays.length,
        totalEntries: v.outlandTotal + v.inlandTotal,
        totalAor: v.outlandDays.length + v.inlandDays.length,
      }))
      .filter(d => d.totalEntries >= 2)
      .sort((a, b) => b.totalEntries - a.totalEntries);

    return result;
  }, [apps]);

  if (data.length === 0) return null;

  const maxAvg = Math.max(
    ...data.map(d => d.outlandAvg || 0),
    ...data.map(d => d.inlandAvg || 0),
    1
  );

  return (
    <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
      <h2 className="text-sm font-bold text-sand-900 mb-1">AOR by Country</h2>
      <p className="text-[11px] text-sand-400 mb-4">
        Average days to AOR by PA country · min 2 entries to show
      </p>

      <div className="space-y-3">
        {data.map(d => (
          <div key={d.country}>
            {/* Country header */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-sand-900">{d.country}</span>
                <span className="text-[9px] text-sand-400">{d.totalEntries} entries · {d.totalAor} AOR</span>
              </div>
            </div>

            {/* Bars */}
            <div className="space-y-1">
              {d.outlandAvg != null && (
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-sand-400 w-12 text-right flex-shrink-0">Outland</span>
                  <div className="flex-1 h-4 bg-sand-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full flex items-center justify-end pr-1.5 transition-all"
                      style={{ width: `${Math.max((d.outlandAvg / maxAvg) * 100, 15)}%` }}
                    >
                      <span className="text-[8px] font-bold text-white">{d.outlandAvg}d</span>
                    </div>
                  </div>
                  <span className="text-[8px] text-sand-400 w-4 flex-shrink-0">{d.outlandCount}</span>
                </div>
              )}
              {d.inlandAvg != null && (
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-sand-400 w-12 text-right flex-shrink-0">Inland</span>
                  <div className="flex-1 h-4 bg-sand-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warn rounded-full flex items-center justify-end pr-1.5 transition-all"
                      style={{ width: `${Math.max((d.inlandAvg / maxAvg) * 100, 15)}%` }}
                    >
                      <span className="text-[8px] font-bold text-white">{d.inlandAvg}d</span>
                    </div>
                  </div>
                  <span className="text-[8px] text-sand-400 w-4 flex-shrink-0">{d.inlandCount}</span>
                </div>
              )}
              {d.totalAor === 0 && (
                <div className="text-[9px] text-sand-300 italic pl-14">No AOR data yet</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-sand-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
          <span className="text-[9px] text-sand-500">Outland avg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-warn" />
          <span className="text-[9px] text-sand-500">Inland avg</span>
        </div>
        <span className="text-[9px] text-sand-400 ml-auto">count on right</span>
      </div>
    </div>
  );
}
