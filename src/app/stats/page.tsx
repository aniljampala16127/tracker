"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, LineChart, Line,
} from "recharts";
import { Application } from "@/lib/types";
import { STEPS, getVisibleSteps } from "@/lib/constants";
import { buildStepsMap, daysBetween, getOutlierMax } from "@/lib/utils";
import { AORProgress } from "@/components/AORProgress";
import { CountryBreakdown } from "@/components/CountryBreakdown";
import { StatsSkeleton } from "@/components/Skeletons";
import { PullToRefresh } from "@/components/PullToRefresh";
import { DigestImageExport } from "@/components/DigestImageExport";
import { Modal } from "@/components/ui";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Reusable collapsible section — collapsed by default, click to expand
function CollapsibleSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-sand-200 rounded-2xl mb-4 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${
          expanded ? "bg-sand-50/60 border-b border-sand-100" : "hover:bg-sand-50/60"
        }`}
      >
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-sand-900 tracking-tight truncate">{title}</h2>
          <p className="text-[11px] text-sand-500 truncate">{subtitle}</p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-sand-400 flex-shrink-0"
          style={{ transition: "transform 0.3s ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>
      <div style={{
        maxHeight: expanded ? "3000px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="px-4 pb-4 pt-3" style={{
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

// Reporter row supplied to the per-step modal — pre-computed so the
// modal doesn't have to re-walk the apps array on click.
interface StepReporter {
  appId: string;
  initials: string;
  country: string;
  stream: "Outland" | "Inland";
  days: number;
  eventDate: string;
}

export default function StatsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  // When non-null, show a modal listing the reporters for that step.
  const [reportersModal, setReportersModal] = useState<
    { stepLabel: string; reporters: StepReporter[] } | null
  >(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, []);

  const fetchApps = useCallback(async () => {
    const res = await fetch("/api/applications");
    const data = await res.json();
    if (Array.isArray(data)) setApps(data as Application[]);
    setLoading(false);
  }, []);

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
    const aorIdx = STEPS.findIndex(s => s.id === "aor");
    return STEPS.slice(1).map((step, idx) => {
      const outlandDays: number[] = [];
      const inlandDays: number[] = [];
      const stepGlobalIdx = idx + 1;
      const isPostAor = stepGlobalIdx > aorIdx;

      // Determine the label suffix based on what the step is measured from
      let fromLabel = "";
      if (step.id === "aor") fromLabel = "";
      else if (step.id === "biometrics_given") fromLabel = " (from BIL)";
      else if (step.id === "biometrics_done") fromLabel = " (from Bio Given)";
      else if (step.id === "medicals_attended") fromLabel = " (from Med Req)";
      else if (step.id === "medical_passed") fromLabel = " (from Med Attended)";
      else if (isPostAor) fromLabel = " (from AOR)";

      const reporters: StepReporter[] = [];

      apps.forEach((a) => {
        const s = buildStepsMap(a.step_events || []);
        if (!s[step.id]) return;

        // Each step measured from its logical trigger
        let baseDate: string | null = null;
        if (step.id === "aor") {
          baseDate = s.submitted || null;
        } else if (step.id === "biometrics_given") {
          baseDate = s.bil || null;
        } else if (step.id === "biometrics_done") {
          baseDate = s.biometrics_given || s.bil || null;
        } else if (step.id === "medicals_attended") {
          baseDate = s.medical || null;
        } else if (step.id === "medical_passed") {
          baseDate = s.medicals_attended || s.medical || null;
        } else if (isPostAor) {
          baseDate = s.aor || null;
        } else {
          baseDate = s.submitted || null;
        }
        if (!baseDate) return;

        const d = daysBetween(baseDate, s[step.id]!);
        if (d < 0 || d > getOutlierMax(a.province)) return;
        if (a.stream === "Outland") outlandDays.push(d);
        else inlandDays.push(d);

        // Capture the reporter for the per-step modal. Stream is narrowed
        // to the two valid values since the bar chart already discards
        // anything else.
        if (a.stream === "Outland" || a.stream === "Inland") {
          reporters.push({
            appId: a.id,
            initials: a.initials,
            country: a.country_origin,
            stream: a.stream,
            days: d,
            eventDate: s[step.id]!,
          });
        }
      });

      // Sort reporters fastest → slowest by default; ties break by event date.
      reporters.sort((x, y) => x.days - y.days || y.eventDate.localeCompare(x.eventDate));

      return {
        step: step.shortLabel,
        fullLabel: step.label + fromLabel,
        outland: outlandDays.length ? Math.round(outlandDays.reduce((a, b) => a + b, 0) / outlandDays.length) : null,
        inland: inlandDays.length ? Math.round(inlandDays.reduce((a, b) => a + b, 0) / inlandDays.length) : null,
        outlandReports: outlandDays.length,
        inlandReports: inlandDays.length,
        reporters,
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
      <div className="mb-5">
        <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1">Analytics</p>
        <h1 className="text-2xl font-bold text-sand-900 tracking-tight">Processing trends</h1>
        <p className="text-[13px] text-sand-500 mt-0.5">
          Community-reported timelines from <span className="font-semibold text-sand-700 nums-tabular">{apps.length}</span> applications.
        </p>
      </div>

      {/* Summary strip — single bordered card with divided cells */}
      <div className="bg-white border border-sand-200 rounded-2xl shadow-[0_1px_2px_rgba(26,26,24,0.04)] overflow-hidden mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-sand-100">
          {[
            { label: "Total entries", value: apps.length, valueClass: "text-sand-900" },
            { label: "With AOR", value: totalWithAor, valueClass: "text-brand-600" },
            { label: "Outland", value: totalOutland, valueClass: "text-brand-600" },
            { label: "Inland", value: totalInland, valueClass: "text-warn-dark" },
          ].map((s) => (
            <div key={s.label} className="p-4">
              <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1.5">{s.label}</div>
              <div className={`text-3xl font-bold ${s.valueClass} leading-none nums-tabular`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AOR Progress + Country Breakdown — sit side-by-side on xl+,
          stack on smaller screens. */}
      <div className="xl:grid xl:grid-cols-2 xl:gap-4 xl:items-start">
        <CollapsibleSection title="AOR Progress" subtitle="Which submission dates are getting AOR">
          <AORProgress apps={apps} />
        </CollapsibleSection>

        <CountryBreakdown apps={apps} />
      </div>

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
        <div className="mt-4 overflow-x-auto rounded-xl border border-sand-200">
          <table className="w-full text-sm nums-tabular">
            <thead>
              <tr className="bg-sand-50 text-[10px] font-bold text-sand-500 uppercase tracking-[0.06em]">
                <th className="text-left px-3 py-2.5">Step</th>
                <th className="text-center px-2 py-2.5">Outland avg</th>
                <th className="text-center px-2 py-2.5">Inland avg</th>
                <th className="text-center px-2 py-2.5">Reports</th>
              </tr>
            </thead>
            <tbody>
              {stepAverages.map((row, i) => (
                <tr key={row.step} className={`border-t border-sand-100 hover:bg-sand-50/60 transition-colors ${i % 2 === 1 ? "bg-sand-50/30" : ""}`}>
                  <td className="px-3 py-2.5 font-semibold text-sand-900">{row.fullLabel}</td>
                  <td className="px-2 py-2.5 text-center font-bold text-brand-600">
                    {row.outland != null ? `${row.outland}d` : <span className="text-sand-300 font-normal">—</span>}
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold text-warn-dark">
                    {row.inland != null ? `${row.inland}d` : <span className="text-sand-300 font-normal">—</span>}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {(row.outlandReports + row.inlandReports) > 0 ? (
                      <button
                        onClick={() => setReportersModal({
                          stepLabel: row.fullLabel,
                          reporters: row.reporters,
                        })}
                        className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-500/10 px-2 py-0.5 rounded transition-colors group"
                        title="See who reported this step"
                      >
                        <span className="nums-tabular">{row.outlandReports + row.inlandReports}</span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="t-icon-slide-x text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <path d="M9 18L15 12L9 6"/>
                        </svg>
                      </button>
                    ) : (
                      <span className="text-[11px] text-sand-300">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Monthly Cohort Comparison + Processing Speed Trend — paired in
          2-col on xl+. Both are charts of similar height. */}
      <div className="xl:grid xl:grid-cols-2 xl:gap-4 xl:items-start">
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
      </div>

      {/* Cohort summary cards — horizontal scroll */}
      <CollapsibleSection title="Monthly Cohorts" subtitle={`${Object.keys(monthCohorts).length} months tracked`}>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {Object.keys(monthCohorts).sort().reverse().map((key) => {
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
            const pct = group.length > 0 ? Math.round((aorDays.length / group.length) * 100) : 0;

            return (
              <div
                key={key}
                className="flex-shrink-0 w-[150px] bg-white border border-sand-200 rounded-xl p-3.5 snap-start hover:border-brand-300 hover:shadow-[0_4px_12px_rgba(26,26,24,0.06)] transition-all"
              >
                <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1">{label}</div>
                <div className="text-2xl font-bold text-brand-600 leading-none nums-tabular">
                  {avg != null ? <>{avg}<span className="text-base font-semibold ml-0.5">d</span></> : <span className="text-sand-300">—</span>}
                </div>
                <div className="text-[10px] text-sand-400 mt-0.5 mb-2.5">avg to AOR</div>
                {/* Mini progress */}
                <div className="w-full h-1.5 rounded-full bg-sand-100 overflow-hidden mb-1.5">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] text-sand-500 nums-tabular">
                  <span className="font-semibold text-sand-700">{aorDays.length}</span>/{group.length} AOR · {outland}O {inland}I
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Weekly WhatsApp Digest */}
      <WeeklyDigest apps={apps} />

      {/* Source note */}
      <p className="text-[11px] text-sand-400 mt-8 mb-2 text-center leading-relaxed">
        All data is community-reported. Processing times vary by case.
      </p>

      {/* Per-step reporters modal */}
      <Modal
        open={reportersModal !== null}
        onClose={() => setReportersModal(null)}
        title={reportersModal ? `${reportersModal.stepLabel} · ${reportersModal.reporters.length} report${reportersModal.reporters.length === 1 ? "" : "s"}` : ""}
      >
        {reportersModal && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-sand-500 uppercase tracking-[0.06em] px-3 pb-1.5 border-b border-sand-100">
              <span>Reporter</span>
              <span>Days</span>
            </div>
            <div className="max-h-[55vh] overflow-y-auto -mr-2 pr-2">
              {reportersModal.reporters.map((r, i) => (
                <button
                  key={`${r.appId}-${i}`}
                  onClick={() => {
                    setReportersModal(null);
                    router.push(`/dashboard/${r.appId}`);
                  }}
                  className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-sand-50 active:bg-sand-100 transition-colors border-b border-sand-50/80 last:border-b-0 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-sand-100 group-hover:bg-brand-500/12 group-hover:text-brand-700 flex items-center justify-center text-[10px] font-bold text-sand-700 shrink-0 transition-colors">
                      {r.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-sand-900 truncate group-hover:text-brand-700 transition-colors">{r.country}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded ${
                          r.stream === "Outland" ? "bg-brand-500/12 text-brand-700" : "bg-warn/15 text-warn-dark"
                        }`}>
                          {r.stream}
                        </span>
                        <span className="text-[10px] text-sand-400 nums-tabular">
                          {new Date(r.eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-[14px] font-bold text-sand-900 nums-tabular">
                      {r.days}<span className="text-[10px] font-normal text-sand-400 ml-0.5">d</span>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sand-300 group-hover:text-brand-500 t-icon-slide-x opacity-60 group-hover:opacity-100 transition-all">
                      <path d="M9 18L15 12L9 6"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
            {reportersModal.reporters.length === 0 && (
              <p className="text-center text-[12px] text-sand-400 italic py-6">No reports yet</p>
            )}
          </div>
        )}
      </Modal>
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

    const dow = now.getDay();
    const daysToMon = dow === 0 ? 6 : dow - 1;
    const wkStart = ld(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMon));

    const fmtDate = (dateStr: string) => {
      const d = new Date(dateStr + "T00:00:00");
      return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
    };

    // Collect this week's milestones by step
    const byStep: Record<string, { subDate: string; stepDate: string; stream: string; days: number }[]> = {};

    apps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      (a.step_events || []).forEach(ev => {
        if (ev.step_id === "submitted") return;
        if (ev.event_date > todayStr || ev.event_date < wkStart) return;

        const prevIdx = STEPS.findIndex(st => st.id === ev.step_id) - 1;
        const prevDate = prevIdx >= 0 ? s[STEPS[prevIdx].id] : s.submitted;
        const days = prevDate ? daysBetween(prevDate, ev.event_date) : 0;
        if (days < 0 || days > getOutlierMax(a.province)) return;

        if (!byStep[ev.step_id]) byStep[ev.step_id] = [];
        byStep[ev.step_id].push({ subDate: s.submitted || "", stepDate: ev.event_date, stream: a.stream, days });
      });
    });

    const totalUpdates = Object.values(byStep).reduce((s, arr) => s + arr.length, 0);
    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;

    // Build compact message
    let msg = `*SponsorTrack — Weekly Update*\n`;
    msg += `${fmtDate(wkStart)} to ${fmtDate(todayStr)}\n`;
    msg += `${totalUpdates} milestones · ${apps.length} tracked · ${waiting} waiting\n`;

    // One line per step: count + avg days + submission range
    STEPS.forEach(step => {
      if (step.id === "submitted") return;
      const entries = byStep[step.id];
      if (!entries || entries.length === 0) return;

      const avgDays = Math.round(entries.reduce((s, e) => s + e.days, 0) / entries.length);
      const outland = entries.filter(e => e.stream === "Outland").length;
      const inland = entries.filter(e => e.stream === "Inland").length;
      const streamInfo = outland > 0 && inland > 0 ? ` (${outland}O/${inland}I)` : inland > 0 ? " (Inland)" : "";

      const allSubs = Array.from(new Set(entries.map(e => e.subDate).filter(Boolean))).sort();
      const subRange = allSubs.length === 1 ? fmtDate(allSubs[0]) : allSubs.length > 1 ? `${fmtDate(allSubs[0])}–${fmtDate(allSubs[allSubs.length - 1])}` : "";

      msg += `\n${step.label} — ${entries.length}${streamInfo} · avg ${avgDays}d`;
      if (subRange) msg += ` · sub ${subRange}`;
    });

    msg += `\n\nhttps://sponsortrack.online/dashboard`;

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
