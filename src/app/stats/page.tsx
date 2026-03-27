"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

// IRCC official total processing times (March 2026)
// Source: IRCC Processing Times Tool, updated March 9, 2026
// These are TOTAL end-to-end times (submission to decision), not per-step
const IRCC_TOTAL = {
  outland: { months: 15, days: 456, label: "Outland (non-Quebec)" },
  inland: { months: 21, days: 639, label: "Inland (non-Quebec)" },
  serviceStandard: { months: 12, days: 365, label: "IRCC Service Standard (Outland)" },
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function StatsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .order("created_at", { ascending: true });
    if (data) setApps(data as Application[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // Group apps by submission month
  const monthCohorts = useMemo(() => {
    const cohorts: Record<string, Application[]> = {};
    apps.forEach((app) => {
      const sub = app.step_events?.find(e => e.step_id === "submitted");
      if (!sub) return;
      const d = new Date(sub.event_date + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!cohorts[key]) cohorts[key] = [];
      cohorts[key].push(app);
    });
    return cohorts;
  }, [apps]);

  // Compute per-step community averages
  const stepAverages = useMemo(() => {
    return STEPS.slice(1).map((step) => {
      const prev = STEPS[STEPS.indexOf(step) - 1];
      const outlandDays: number[] = [];
      const inlandDays: number[] = [];

      apps.forEach((a) => {
        const s = buildStepsMap(a.step_events || []);
        if (s[prev.id] && s[step.id]) {
          const d = daysBetween(s[prev.id]!, s[step.id]!);
          if (a.stream === "Outland") outlandDays.push(d);
          else inlandDays.push(d);
        }
      });

      return {
        step: step.shortLabel,
        fullLabel: step.label,
        outland: outlandDays.length ? Math.round(outlandDays.reduce((a, b) => a + b, 0) / outlandDays.length) : null,
        inland: inlandDays.length ? Math.round(inlandDays.reduce((a, b) => a + b, 0) / inlandDays.length) : null,
        outlandReports: outlandDays.length,
        inlandReports: inlandDays.length,
      };
    });
  }, [apps]);

  // Monthly cohort AOR data
  const cohortChartData = useMemo(() => {
    const sorted = Object.keys(monthCohorts).sort();
    return sorted.map((key) => {
      const group = monthCohorts[key];
      const [y, m] = key.split("-");
      const label = `${MONTHS_SHORT[parseInt(m) - 1]} ${y.slice(2)}`;

      const outlandAor: number[] = [];
      const inlandAor: number[] = [];
      group.forEach((a) => {
        const s = buildStepsMap(a.step_events || []);
        if (s.submitted && s.aor) {
          const d = daysBetween(s.submitted, s.aor);
          if (a.stream === "Outland") outlandAor.push(d);
          else inlandAor.push(d);
        }
      });

      return {
        month: label,
        outlandAvg: outlandAor.length ? Math.round(outlandAor.reduce((a, b) => a + b, 0) / outlandAor.length) : null,
        inlandAvg: inlandAor.length ? Math.round(inlandAor.reduce((a, b) => a + b, 0) / inlandAor.length) : null,
        totalEntries: group.length,
        outlandAorCount: outlandAor.length,
        inlandAorCount: inlandAor.length,
        outlandTotal: group.filter(a => a.stream === "Outland").length,
        inlandTotal: group.filter(a => a.stream === "Inland").length,
      };
    });
  }, [monthCohorts]);

  if (loading) return <div className="py-20 text-center text-sand-400 text-sm">Loading stats...</div>;

  const totalOutland = apps.filter(a => a.stream === "Outland").length;
  const totalInland = apps.filter(a => a.stream === "Inland").length;
  const totalWithAor = apps.filter(a => a.step_events?.some(e => e.step_id === "aor")).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-sand-900">Processing Analytics</h1>
        <p className="text-xs text-sand-500 mt-0.5">
          Community-reported timelines vs IRCC official processing times
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-sand-200 rounded-xl p-4">
          <div className="text-[10px] text-sand-500 uppercase tracking-wider">Total Entries</div>
          <div className="text-2xl font-bold text-sand-900">{apps.length}</div>
        </div>
        <div className="bg-white border border-sand-200 rounded-xl p-4">
          <div className="text-[10px] text-sand-500 uppercase tracking-wider">With AOR</div>
          <div className="text-2xl font-bold text-brand-600">{totalWithAor}</div>
        </div>
        <div className="bg-white border border-sand-200 rounded-xl p-4">
          <div className="text-[10px] text-sand-500 uppercase tracking-wider">Outland</div>
          <div className="text-2xl font-bold text-brand-600">{totalOutland}</div>
        </div>
        <div className="bg-white border border-sand-200 rounded-xl p-4">
          <div className="text-[10px] text-sand-500 uppercase tracking-wider">Inland</div>
          <div className="text-2xl font-bold text-warn">{totalInland}</div>
        </div>
      </div>

      {/* IRCC Official Times */}
      <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold text-sand-900 mb-1">IRCC Official Processing Times</h2>
        <p className="text-[11px] text-sand-400 mb-3">
          Source: IRCC Processing Times Tool, updated March 9, 2026. Total end-to-end time (80% of applications).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-brand-50 rounded-xl p-4 text-center">
            <div className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider">Outland (non-Quebec)</div>
            <div className="text-3xl font-bold text-brand-600 mt-1">15 <span className="text-sm font-medium">months</span></div>
            <div className="text-[10px] text-brand-500 mt-0.5">~456 days · 48,200 in queue</div>
          </div>
          <div className="bg-warn-light/50 rounded-xl p-4 text-center">
            <div className="text-[10px] font-semibold text-warn-dark uppercase tracking-wider">Inland (non-Quebec)</div>
            <div className="text-3xl font-bold text-warn-dark mt-1">21 <span className="text-sm font-medium">months</span></div>
            <div className="text-[10px] text-warn-dark/70 mt-0.5">~639 days · 52,400 in queue</div>
          </div>
          <div className="bg-sand-100 rounded-xl p-4 text-center">
            <div className="text-[10px] font-semibold text-sand-600 uppercase tracking-wider">IRCC Service Standard</div>
            <div className="text-3xl font-bold text-sand-700 mt-1">12 <span className="text-sm font-medium">months</span></div>
            <div className="text-[10px] text-sand-500 mt-0.5">Target for Outland spousal</div>
          </div>
        </div>
      </div>

      {/* Community per-step averages */}
      <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold text-sand-900 mb-1">Community Average: Days per Step</h2>
        <p className="text-[11px] text-sand-400 mb-3">
          Based on community-reported data — IRCC does not publish per-step breakdowns
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stepAverages} margin={{ top: 4, right: 12, left: -4, bottom: 0 }} barCategoryGap="16%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
            <XAxis dataKey="step" tick={{ fontSize: 9, fill: "#8A8880" }} axisLine={{ stroke: "#E8E6E1" }} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: "#8A8880" }} axisLine={false} tickLine={false}
              label={{ value: "days", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#B0ADA6" } }} />
            <Tooltip
              cursor={{ fill: "rgba(45, 106, 79, 0.05)" }}
              contentStyle={{ borderRadius: "12px", border: "1px solid #E8E6E1", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              formatter={(value: any, name: string, props: any) => {
                const row = props.payload;
                const count = name === "outland" ? row.outlandReports : row.inlandReports;
                return [value != null ? `${value} days (${count} reports)` : "No data", name === "outland" ? "Outland" : "Inland"];
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }}
              formatter={(val: string) => val === "outland" ? "Outland" : "Inland"} />
            <Bar dataKey="outland" fill="#2D6A4F" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {stepAverages.map((e, i) => <Cell key={i} fill={e.outland != null ? "#2D6A4F" : "#E8E6E1"} />)}
            </Bar>
            <Bar dataKey="inland" fill="#D4A03C" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {stepAverages.map((e, i) => <Cell key={i} fill={e.inland != null ? "#D4A03C" : "#E8E6E1"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Per-step table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand-50 text-[9px] font-semibold text-sand-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2">Step</th>
                <th className="text-center px-2 py-2">Outland Avg</th>
                <th className="text-center px-2 py-2">Inland Avg</th>
                <th className="text-center px-2 py-2">Reports</th>
              </tr>
            </thead>
            <tbody>
              {stepAverages.map((row) => (
                <tr key={row.step} className="border-t border-sand-100">
                  <td className="px-3 py-2 font-medium text-sand-900">{row.fullLabel}</td>
                  <td className="px-2 py-2 text-center font-semibold text-brand-600">
                    {row.outland != null ? `${row.outland}d` : "—"}
                  </td>
                  <td className="px-2 py-2 text-center font-semibold text-warn-dark">
                    {row.inland != null ? `${row.inland}d` : "—"}
                  </td>
                  <td className="px-2 py-2 text-center text-[10px] text-sand-400">
                    {row.outlandReports + row.inlandReports}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Cohort Comparison */}
      <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold text-sand-900 mb-1">Monthly Cohort Comparison</h2>
        <p className="text-[11px] text-sand-400 mb-3">
          Average days to AOR by submission month — is your batch faster or slower?
        </p>
        {cohortChartData.some(d => d.outlandAvg != null || d.inlandAvg != null) ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cohortChartData} margin={{ top: 4, right: 12, left: -4, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8880" }} axisLine={{ stroke: "#E8E6E1" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8A8880" }} axisLine={false} tickLine={false}
                label={{ value: "days to AOR", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#B0ADA6" } }} />
              <Tooltip
                cursor={{ fill: "rgba(45, 106, 79, 0.05)" }}
                contentStyle={{ borderRadius: "12px", border: "1px solid #E8E6E1", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                formatter={(value: any, name: string, props: any) => {
                  const row = props.payload;
                  if (name === "outlandAvg") return [value != null ? `${value} days (${row.outlandAorCount} of ${row.outlandTotal})` : "No data", "Outland"];
                  return [value != null ? `${value} days (${row.inlandAorCount} of ${row.inlandTotal})` : "No data", "Inland"];
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }}
                formatter={(val: string) => val === "outlandAvg" ? "Outland" : "Inland"} />
              <Bar dataKey="outlandAvg" fill="#2D6A4F" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {cohortChartData.map((e, i) => <Cell key={i} fill={e.outlandAvg != null ? "#2D6A4F" : "#E8E6E1"} />)}
              </Bar>
              <Bar dataKey="inlandAvg" fill="#D4A03C" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {cohortChartData.map((e, i) => <Cell key={i} fill={e.inlandAvg != null ? "#D4A03C" : "#E8E6E1"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-sand-400 py-8 text-center">Not enough AOR data across months to compare yet.</p>
        )}
      </div>

      {/* Cohort summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.keys(monthCohorts).sort().map((key) => {
          const group = monthCohorts[key];
          const [y, m] = key.split("-");
          const label = `${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
          const aorDays: number[] = [];
          group.forEach((a) => {
            const s = buildStepsMap(a.step_events || []);
            if (s.submitted && s.aor) aorDays.push(daysBetween(s.submitted, s.aor));
          });
          const avg = aorDays.length ? Math.round(aorDays.reduce((a, b) => a + b, 0) / aorDays.length) : null;
          const outland = group.filter(a => a.stream === "Outland").length;
          const inland = group.filter(a => a.stream === "Inland").length;

          return (
            <div key={key} className="bg-white border border-sand-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-sand-900">{label}</span>
                <span className="text-[10px] text-sand-400">{group.length} entries</span>
              </div>
              <div className="flex gap-4 mb-2">
                <div>
                  <div className="text-[10px] text-sand-500 uppercase tracking-wider">Avg to AOR</div>
                  <div className="text-lg font-bold text-brand-600">{avg != null ? `${avg}d` : "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-sand-500 uppercase tracking-wider">With AOR</div>
                  <div className="text-lg font-bold text-sand-700">{aorDays.length}/{group.length}</div>
                </div>
              </div>
              <div className="text-[10px] text-sand-400">
                {outland} outland · {inland} inland
              </div>
            </div>
          );
        })}
      </div>

      {/* Source note */}
      <p className="text-[9px] text-sand-400 mt-6 text-center">
        IRCC official times from IRCC Processing Times Tool (March 9, 2026). Per-step data is community-reported only — IRCC does not publish step-level breakdowns.
      </p>
    </div>
  );
}
