"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, LineChart, Line,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween, getOutlierMax } from "@/lib/utils";
import { AORProgress } from "@/components/AORProgress";
import { CountryBreakdown } from "@/components/CountryBreakdown";
import { StatsSkeleton } from "@/components/Skeletons";
import { PullToRefresh } from "@/components/PullToRefresh";
import { DigestImageExport } from "@/components/DigestImageExport";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Reusable collapsible section — collapsed by default, auto-expands on scroll
function CollapsibleSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.2 && !autoExpanded) {
          setExpanded(true);
          setAutoExpanded(true);
        }
      },
      { threshold: [0.2] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, autoExpanded]);

  return (
    <div ref={ref} className="bg-white border border-sand-200 rounded-xl mb-5 overflow-hidden">
      <button onClick={() => { setExpanded(!expanded); setAutoExpanded(true); }}
        className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-sand-50 transition-colors">
        <div>
          <h2 className="text-sm font-bold text-sand-900">{title}</h2>
          <p className="text-[11px] text-sand-400">{subtitle}</p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8880" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "transform 0.3s ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>
      <div style={{
        maxHeight: expanded ? "2000px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="px-4 pb-4" style={{
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.25s ease",
          transitionDelay: expanded ? "0.15s" : "0s",
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

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
          if (d < 0 || d > getOutlierMax(a.province)) return;
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
          if (d < 0 || d > getOutlierMax(a.province)) return;
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

  if (loading) return <StatsSkeleton />;

  const totalOutland = apps.filter(a => a.stream === "Outland").length;
  const totalInland = apps.filter(a => a.stream === "Inland").length;
  const totalWithAor = apps.filter(a => a.step_events?.some(e => e.step_id === "aor")).length;

  return (
    <PullToRefresh onRefresh={async () => { await fetchApps(); }}>
    <div className="page-enter">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-sand-900">Processing Analytics</h1>
        <p className="text-xs text-sand-500 mt-0.5">
          Community-reported timelines from {apps.length} applications
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

      {/* AOR Progress */}
      <AORProgress apps={apps} />

      {/* Country Breakdown */}
      <CountryBreakdown apps={apps} />

      {/* Community per-step averages */}
      <CollapsibleSection title="Community Average: Days per Step" subtitle="Based on community-reported data">
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
      </CollapsibleSection>

      {/* Monthly Cohort Comparison */}
      <CollapsibleSection title="Monthly Cohort Comparison" subtitle="Avg days to AOR by submission month">
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
      </CollapsibleSection>

      {/* Processing Speed Trend */}
      <CollapsibleSection title="Processing Speed Trend" subtitle="Days to AOR by date — is IRCC getting faster?">
        {(() => {
          // Build trend data: each AOR as a data point
          const points: { date: string; label: string; days: number; name: string; stream: string }[] = [];
          apps.forEach((a) => {
            const s = buildStepsMap(a.step_events || []);
            if (s.submitted && s.aor) {
              const days = daysBetween(s.submitted, s.aor);
              if (days < 0 || days > getOutlierMax(a.province)) return;
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
      </CollapsibleSection>

      {/* Cohort summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.keys(monthCohorts).sort().map((key) => {
          const group = monthCohorts[key];
          const [y, m] = key.split("-");
          const label = `${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
          const aorDays: number[] = [];
          group.forEach((a) => {
            const s = buildStepsMap(a.step_events || []);
            if (s.submitted && s.aor) {
              const d = daysBetween(s.submitted, s.aor);
              if (d >= 0 && d <= getOutlierMax(a.province)) aorDays.push(d);
            }
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
        All data is community-reported. Processing times vary by case.
      </p>
    </div>
    </PullToRefresh>
  );
}

// ============================================
// Weekly WhatsApp Digest Generator
// ============================================
function WeeklyDigest({ apps }: { apps: Application[] }) {

  const digest = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ld = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const todayStr = ld(now);

    // Week = Monday to today
    const dow = now.getDay();
    const daysToMon = dow === 0 ? 6 : dow - 1;
    const wkStart = ld(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMon));

    const fmtDate = (dateStr: string) => {
      const d = new Date(dateStr + "T00:00:00");
      return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
    };

    // Collect this week's milestones by step, with individual entries
    const byStep: Record<string, { initials: string; subDate: string; stepDate: string; stream: string; days: number }[]> = {};

    apps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      (a.step_events || []).forEach(ev => {
        if (ev.step_id === "submitted") return;
        if (ev.event_date > todayStr) return; // skip future dates
        if (ev.event_date < wkStart) return; // only this week

        const prevIdx = STEPS.findIndex(st => st.id === ev.step_id) - 1;
        const prevDate = prevIdx >= 0 ? s[STEPS[prevIdx].id] : s.submitted;
        const days = prevDate ? daysBetween(prevDate, ev.event_date) : 0;
        if (days < 0 || days > getOutlierMax(a.province)) return; // skip outliers

        if (!byStep[ev.step_id]) byStep[ev.step_id] = [];
        byStep[ev.step_id].push({
          initials: a.initials,
          subDate: s.submitted || "",
          stepDate: ev.event_date,
          stream: a.stream,
          days,
        });
      });
    });

    // Sort each step's entries by most recent first
    Object.values(byStep).forEach(arr => arr.sort((a, b) => b.stepDate.localeCompare(a.stepDate)));

    const totalUpdates = Object.values(byStep).reduce((s, arr) => s + arr.length, 0);
    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;

    // Build clean WhatsApp message
    let msg = `*SponsorTrack — Weekly Update*\n`;
    msg += `${fmtDate(wkStart)} to ${fmtDate(todayStr)}\n`;
    msg += `${totalUpdates} milestones · ${apps.length} tracked · ${waiting} waiting\n`;

    // Currently Processing — what sub dates are being processed per milestone
    msg += `\n*Currently Processing*\n`;
    STEPS.forEach(step => {
      if (step.id === "submitted") return;
      const entries = byStep[step.id];
      if (!entries || entries.length === 0) return;
      const allSubs = Array.from(new Set(entries.map(e => e.subDate).filter(Boolean))).sort();
      if (allSubs.length === 0) return;
      const earliest = fmtDate(allSubs[0]);
      const latest = fmtDate(allSubs[allSubs.length - 1]);
      const subInfo = allSubs.length === 1 ? earliest : `${earliest} to ${latest}`;
      msg += `  ${step.label}: submitted ${subInfo}\n`;
    });

    STEPS.forEach(step => {
      if (step.id === "submitted") return;
      const entries = byStep[step.id];
      if (!entries || entries.length === 0) return;

      // Group by milestone date
      const byDate: Record<string, { count: number; subDates: string[]; streams: { outland: number; inland: number } }> = {};
      entries.forEach(e => {
        if (!byDate[e.stepDate]) byDate[e.stepDate] = { count: 0, subDates: [], streams: { outland: 0, inland: 0 } };
        byDate[e.stepDate].count++;
        if (!byDate[e.stepDate].subDates.includes(e.subDate) && e.subDate) byDate[e.stepDate].subDates.push(e.subDate);
        if (e.stream === "Outland") byDate[e.stepDate].streams.outland++;
        else byDate[e.stepDate].streams.inland++;
      });

      // Avg days for this step this week
      const avgDays = Math.round(entries.reduce((s, e) => s + e.days, 0) / entries.length);

      msg += `\n*${step.label}* — ${entries.length} received · avg ${avgDays}d\n`;

      // Show each date
      Object.keys(byDate).sort((a, b) => b.localeCompare(a)).forEach(date => {
        const d = byDate[date];
        d.subDates.sort();
        const subList = d.subDates.map(s => fmtDate(s)).join(", ");
        const streamInfo = d.streams.inland > 0 && d.streams.outland > 0
          ? ` (${d.streams.outland} Outland, ${d.streams.inland} Inland)`
          : d.streams.inland > 0 ? ` (Inland)` : "";
        msg += `  ${fmtDate(date)} — ${d.count} received${streamInfo} · sub ${subList}\n`;
      });
    });

    msg += `\nhttps://tracker-lime-five.vercel.app/dashboard`;

    return msg;
  }, [apps]);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(digest)}`;

  return (
    <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-sand-900">Weekly Digest</h2>
          <p className="text-[11px] text-sand-400">This week's milestones — share to your WhatsApp group</p>
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
          Send as Text
        </a>
        <DigestImageExport apps={apps} />
      </div>
    </div>
  );
}
