"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, LineChart, Line,
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

      {/* Processing Speed Trend */}
      <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold text-sand-900 mb-1">Processing Speed Trend</h2>
        <p className="text-[11px] text-sand-400 mb-3">
          Days from submission to AOR — plotted by AOR received date. Is IRCC getting faster or slower?
        </p>
        {(() => {
          // Build trend data: each AOR as a data point
          const points: { date: string; label: string; days: number; name: string; stream: string }[] = [];
          apps.forEach((a) => {
            const s = buildStepsMap(a.step_events || []);
            if (s.submitted && s.aor) {
              const days = daysBetween(s.submitted, s.aor);
              const d = new Date(s.aor + "T00:00:00");
              points.push({
                date: s.aor,
                label: `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`,
                days,
                name: a.initials,
                stream: a.stream,
              });
            }
          });
          points.sort((a, b) => a.date.localeCompare(b.date));

          if (points.length < 3) {
            return <p className="text-xs text-sand-400 py-8 text-center">Need at least 3 AOR data points to show trend.</p>;
          }

          // Compute 3-point rolling average
          const withAvg = points.map((p, i) => {
            const window = points.slice(Math.max(0, i - 2), i + 1);
            const avg = Math.round(window.reduce((s, w) => s + w.days, 0) / window.length);
            return { ...p, rollingAvg: avg };
          });

          return (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={withAvg} margin={{ top: 4, right: 12, left: -4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8A8880" }} axisLine={{ stroke: "#E8E6E1" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8A8880" }} axisLine={false} tickLine={false}
                  label={{ value: "days", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#B0ADA6" } }} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #E8E6E1", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(value: any, name: string) => {
                    if (name === "days") return [`${value} days`, "Actual"];
                    return [`${value} days`, "Rolling Avg"];
                  }}
                  labelFormatter={(label: string, payload: any) => {
                    if (payload?.[0]?.payload?.name) return `${payload[0].payload.name} — AOR ${label}`;
                    return `AOR ${label}`;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }}
                  formatter={(val: string) => val === "days" ? "Individual" : "Rolling Average"} />
                <Line type="monotone" dataKey="days" stroke="#B0ADA6" strokeWidth={1} dot={{ fill: "#8A8880", r: 3 }} name="days" />
                <Line type="monotone" dataKey="rollingAvg" stroke="#2D6A4F" strokeWidth={2.5} dot={false} name="rollingAvg" />
              </LineChart>
            </ResponsiveContainer>
          );
        })()}
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

      {/* Weekly WhatsApp Digest */}
      <WeeklyDigest apps={apps} />

      {/* Source note */}
      <p className="text-[9px] text-sand-400 mt-6 text-center">
        IRCC official times from IRCC Processing Times Tool (March 9, 2026). Per-step data is community-reported only — IRCC does not publish step-level breakdowns.
      </p>
    </div>
  );
}

// ============================================
// Weekly WhatsApp Digest Generator
// ============================================
function WeeklyDigest({ apps }: { apps: Application[] }) {
  const [copied, setCopied] = useState(false);
  const [period, setPeriod] = useState<"7" | "14" | "30">("7");

  const digest = useMemo(() => {
    const now = Date.now();
    const cutoff = now - parseInt(period) * 24 * 60 * 60 * 1000;

    // New entries in period
    const newEntries = apps.filter(a => new Date(a.created_at).getTime() > cutoff);

    // Step milestones in period (non-submitted)
    const milestones: Record<string, number> = {};
    apps.forEach(a => {
      (a.step_events || []).forEach(e => {
        if (e.step_id === "submitted") return;
        if (new Date(e.created_at).getTime() > cutoff) {
          const label = STEPS.find(s => s.id === e.step_id)?.label || e.step_id;
          milestones[label] = (milestones[label] || 0) + 1;
        }
      });
    });

    // Average AOR days
    const aorDays: number[] = [];
    apps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      if (s.submitted && s.aor) aorDays.push(daysBetween(s.submitted, s.aor));
    });
    const avgAor = aorDays.length ? Math.round(aorDays.reduce((a, b) => a + b, 0) / aorDays.length) : null;
    const totalWithAor = apps.filter(a => a.step_events?.some(e => e.step_id === "aor")).length;

    const periodLabel = period === "7" ? "This Week" : period === "14" ? "Last 2 Weeks" : "This Month";

    // Build the message
    let msg = `📊 *SponsorTrack ${periodLabel}*\n\n`;
    msg += `👥 *${apps.length} total entries* (${newEntries.length} new)\n`;
    if (avgAor) msg += `⏱ *Avg AOR: ${avgAor} days* (${totalWithAor} reported)\n`;
    msg += `\n`;

    if (Object.keys(milestones).length > 0) {
      msg += `🎉 *Milestones*\n`;
      Object.entries(milestones)
        .sort((a, b) => b[1] - a[1])
        .forEach(([step, count]) => {
          msg += `  → ${count} reached ${step}\n`;
        });
      msg += `\n`;
    }

    if (newEntries.length > 0) {
      msg += `🆕 *New entries:* ${newEntries.map(a => a.initials).join(", ")}\n\n`;
    }

    msg += `🔗 Track yours: tracker-lime-five.vercel.app\n`;
    msg += `_Free • No sign-up • PIN protected_`;

    return msg;
  }, [apps, period]);

  const handleCopy = () => {
    navigator.clipboard.writeText(digest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(digest)}`;

  return (
    <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-sand-900">Weekly Digest</h2>
          <p className="text-[11px] text-sand-400">Auto-generated summary to paste in your WhatsApp group</p>
        </div>
        <div className="flex items-center gap-1 bg-sand-50 rounded-lg p-0.5 border border-sand-200">
          {(["7", "14", "30"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all ${
                period === p
                  ? "bg-brand-500 text-white"
                  : "text-sand-500 hover:text-sand-800"
              }`}
            >
              {p === "7" ? "7d" : p === "14" ? "14d" : "30d"}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-sand-50 rounded-lg p-3 mb-3 font-mono text-[11px] text-sand-700 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
        {digest}
      </div>

      <div className="flex items-center gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] text-xs font-medium hover:bg-[#25D366]/20 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Send via WhatsApp
        </a>
        <button
          onClick={handleCopy}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
            copied
              ? "bg-brand-100 text-brand-600"
              : "bg-sand-100 text-sand-600 hover:bg-sand-200"
          }`}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12" /></svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
