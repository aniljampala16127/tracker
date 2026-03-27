"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { Application, StepId } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

// IRCC official processing times (as of early 2026, approximate)
const IRCC_TIMES: Record<string, { outland: number | null; inland: number | null; label: string }> = {
  aor: { outland: 30, inland: 30, label: "AOR" },
  bil: { outland: 7, inland: 7, label: "BIL" },
  sponsor_eligibility: { outland: 75, inland: 120, label: "Spon. Elig" },
  medical: { outland: 60, inland: 90, label: "Medical" },
  pa_eligibility: { outland: 60, inland: 120, label: "PA Elig" },
  background: { outland: 90, inland: 150, label: "Background" },
  pre_arrival: { outland: 30, inland: 30, label: "Pre-Arrival" },
  portal1: { outland: 14, inland: 14, label: "Portal 1" },
  portal2: { outland: 14, inland: 14, label: "Portal 2" },
  ecopr: { outland: 30, inland: 30, label: "eCoPR" },
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

  // Compute average days to AOR per month cohort
  const cohortChartData = useMemo(() => {
    const sorted = Object.keys(monthCohorts).sort();
    return sorted.map((key) => {
      const group = monthCohorts[key];
      const [y, m] = key.split("-");
      const label = `${MONTHS_SHORT[parseInt(m) - 1]} ${y.slice(2)}`;

      const aorDays: number[] = [];
      group.forEach((a) => {
        const s = buildStepsMap(a.step_events || []);
        if (s.submitted && s.aor) aorDays.push(daysBetween(s.submitted, s.aor));
      });

      const avgAor = aorDays.length ? Math.round(aorDays.reduce((a, b) => a + b, 0) / aorDays.length) : null;
      return {
        month: label,
        avgDaysToAOR: avgAor,
        totalEntries: group.length,
        withAOR: aorDays.length,
      };
    });
  }, [monthCohorts]);

  // IRCC vs community comparison data
  const comparisonData = useMemo(() => {
    return STEPS.slice(1).map((step) => {
      const prev = STEPS[STEPS.indexOf(step) - 1];
      const communityDays: number[] = [];

      apps.forEach((a) => {
        const s = buildStepsMap(a.step_events || []);
        if (s[prev.id] && s[step.id]) {
          communityDays.push(daysBetween(s[prev.id]!, s[step.id]!));
        }
      });

      const ircc = IRCC_TIMES[step.id];
      const communityAvg = communityDays.length
        ? Math.round(communityDays.reduce((a, b) => a + b, 0) / communityDays.length)
        : null;

      return {
        step: step.shortLabel,
        fullLabel: step.label,
        ircc: ircc?.outland || null,
        community: communityAvg,
        reports: communityDays.length,
      };
    });
  }, [apps]);

  if (loading) return <div className="py-20 text-center text-sand-400 text-sm">Loading stats...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-sand-900">Processing Analytics</h1>
        <p className="text-xs text-sand-500 mt-0.5">
          Community-reported timelines vs IRCC reference times
        </p>
      </div>

      {/* IRCC vs Community */}
      <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold text-sand-900 mb-1">IRCC Reference vs Community Average</h2>
        <p className="text-[11px] text-sand-400 mb-3">
          Official IRCC estimates (Outland) compared to what the community is actually seeing
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData} margin={{ top: 4, right: 12, left: -4, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
            <XAxis dataKey="step" tick={{ fontSize: 9, fill: "#8A8880" }} axisLine={{ stroke: "#E8E6E1" }} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: "#8A8880" }} axisLine={false} tickLine={false}
              label={{ value: "days", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#B0ADA6" } }} />
            <Tooltip
              cursor={{ fill: "rgba(45, 106, 79, 0.05)" }}
              contentStyle={{ borderRadius: "12px", border: "1px solid #E8E6E1", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              formatter={(value: any, name: string, props: any) => {
                const row = props.payload;
                if (name === "ircc") return [value != null ? `${value} days (IRCC estimate)` : "N/A", "IRCC Reference"];
                return [value != null ? `${value} days (${row.reports} reports)` : "No data yet", "Community"];
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }}
              formatter={(val: string) => val === "ircc" ? "IRCC Reference" : "Community Actual"} />
            <Bar dataKey="ircc" fill="#B0ADA6" radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="community" fill="#2D6A4F" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {comparisonData.map((entry, idx) => (
                <Cell key={idx} fill={entry.community != null ? "#2D6A4F" : "#E8E6E1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* IRCC vs Community table */}
      <div className="bg-white border border-sand-200 rounded-xl overflow-hidden mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-sand-50 text-[9px] font-semibold text-sand-500 uppercase tracking-wider">
              <th className="text-left px-3 py-2">Step</th>
              <th className="text-center px-2 py-2">IRCC (Outland)</th>
              <th className="text-center px-2 py-2">Community Avg</th>
              <th className="text-center px-2 py-2">Difference</th>
              <th className="text-center px-2 py-2">Reports</th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row) => {
              const diff = row.ircc != null && row.community != null ? row.community - row.ircc : null;
              return (
                <tr key={row.step} className="border-t border-sand-100">
                  <td className="px-3 py-2.5 font-medium text-sand-900">{row.fullLabel}</td>
                  <td className="px-2 py-2.5 text-center text-sand-500">
                    {row.ircc != null ? `${row.ircc}d` : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-center font-semibold text-brand-600">
                    {row.community != null ? `${row.community}d` : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {diff != null ? (
                      <span className={`text-xs font-semibold ${diff < 0 ? "text-brand-600" : diff > 0 ? "text-error" : "text-sand-500"}`}>
                        {diff > 0 ? "+" : ""}{diff}d {diff < 0 ? "faster" : diff > 0 ? "slower" : "same"}
                      </span>
                    ) : (
                      <span className="text-sand-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center text-[10px] text-sand-400">{row.reports}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Monthly Cohort Comparison */}
      <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold text-sand-900 mb-1">Monthly Cohort Comparison</h2>
        <p className="text-[11px] text-sand-400 mb-3">
          Average days to AOR by submission month — is your batch faster or slower?
        </p>
        {cohortChartData.some(d => d.avgDaysToAOR != null) ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cohortChartData} margin={{ top: 4, right: 12, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8880" }} axisLine={{ stroke: "#E8E6E1" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8A8880" }} axisLine={false} tickLine={false}
                label={{ value: "days to AOR", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#B0ADA6" } }} />
              <Tooltip
                cursor={{ fill: "rgba(45, 106, 79, 0.05)" }}
                contentStyle={{ borderRadius: "12px", border: "1px solid #E8E6E1", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                formatter={(value: any, name: string, props: any) => {
                  const row = props.payload;
                  return [value != null ? `${value} days avg (${row.withAOR} of ${row.totalEntries} reported)` : "No AOR data", "Avg Days to AOR"];
                }}
              />
              <Bar dataKey="avgDaysToAOR" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {cohortChartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.avgDaysToAOR != null ? "#2D6A4F" : "#E8E6E1"} />
                ))}
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
    </div>
  );
}
