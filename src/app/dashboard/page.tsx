"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationFormData } from "@/lib/types";
import { STEPS, COMMON_COUNTRIES, STREAMS, SPONSOR_STATUSES, PROVINCES, getStepIndex } from "@/lib/constants";
import { progressPercent, formatDate, weeksBetween, buildStepsMap } from "@/lib/utils";
import { PlusIcon, StepIcon } from "@/components/icons";
import { Button, Modal, Input, Select, Badge } from "@/components/ui";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function moLabel(k: string) { const [y,m]=k.split("-"); return `${MO[parseInt(m)-1]} ${y}`; }

// Step colors for the visual bars
const STEP_COLORS = [
  "bg-brand-400", "bg-brand-500", "bg-emerald-500", "bg-teal-500",
  "bg-cyan-500", "bg-blue-500", "bg-indigo-500", "bg-violet-500",
];

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .order("created_at", { ascending: false });
    if (data) setApps(data as Application[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const handleAdd = async (form: ApplicationFormData) => {
    setSubmitting(true);
    const { data: app } = await supabase
      .from("applications")
      .insert({
        initials: form.initials.toUpperCase(), sponsor_status: form.sponsor_status,
        stream: form.stream, country_origin: form.country_origin,
        province: form.province, current_step: "submitted", notes: form.notes || null,
      })
      .select().single();
    if (app) {
      await supabase.from("step_events").insert({
        application_id: app.id, step_id: "submitted", event_date: form.submitted_date,
      });
    }
    setSubmitting(false); setShowAdd(false); fetchApps();
  };

  // Group by month
  const monthGroups: Record<string, Application[]> = {};
  apps.forEach((app) => {
    const sub = app.step_events?.find((e) => e.step_id === "submitted");
    if (!sub) return;
    const d = new Date(sub.event_date + "T00:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(app);
  });
  const sortedMonths = Object.keys(monthGroups).sort().reverse();

  // Avg step weeks for a group
  function stepAvgs(group: Application[]) {
    const out: Record<string, number | null> = {};
    STEPS.forEach((step, i) => {
      if (i === 0) { out[step.id] = null; return; }
      const prev = STEPS[i - 1].id;
      const d: number[] = [];
      group.forEach((a) => {
        const s = buildStepsMap(a.step_events || []);
        if (s[prev] && s[step.id]) d.push(weeksBetween(s[prev]!, s[step.id]!));
      });
      out[step.id] = d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : null;
    });
    return out;
  }

  // Stats
  const total = apps.length;
  const active = apps.filter(a => !a.is_complete).length;
  const complete = apps.filter(a => a.is_complete).length;
  const outland = apps.filter(a => a.stream === "Outland").length;

  // Global avgs
  const globalAvgs = stepAvgs(apps);
  const maxWeeks = Math.max(...Object.values(globalAvgs).filter(Boolean).map(v => v as number), 1);

  if (loading) {
    return <div className="py-20 text-center text-sand-400 text-sm">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-sand-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-sand-400 mt-0.5">{total} applications tracked</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <PlusIcon size={14} className="text-white" /> Add Entry
        </Button>
      </div>

      {/* Quick stats */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: total, color: "text-sand-900" },
            { label: "Active", value: active, color: "text-warn" },
            { label: "Complete", value: complete, color: "text-brand-600" },
            { label: "Outland", value: outland, color: "text-sand-700" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-sand-200 px-4 py-3">
              <div className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-sand-400 font-medium uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Overall step duration bars */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-sand-200 p-4 mb-6">
          <div className="text-xs font-bold text-sand-900 mb-3">Overall Avg. Step Duration</div>
          <div className="flex items-end gap-1 h-20 mb-2">
            {STEPS.slice(1).map((step, i) => {
              const w = globalAvgs[step.id];
              const pct = w ? (w / maxWeeks) * 100 : 0;
              return (
                <div key={step.id} className="flex-1 flex flex-col items-center gap-1">
                  {w != null && (
                    <span className="text-[10px] font-bold text-sand-700">{w}w</span>
                  )}
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${STEP_COLORS[i + 1] || "bg-brand-500"}`}
                    style={{ height: `${Math.max(pct, 8)}%`, minHeight: w ? 8 : 3, opacity: w ? 1 : 0.15 }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1">
            {STEPS.slice(1).map((step) => (
              <div key={step.id} className="flex-1 text-center text-[8px] text-sand-400 font-medium truncate">
                {step.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly cohort cards */}
      {sortedMonths.length > 0 && (
        <div className="space-y-4 mb-6">
          {sortedMonths.map((monthKey) => {
            const group = monthGroups[monthKey];
            const avgs = stepAvgs(group);
            const expanded = expandedMonth === monthKey;
            const avgPct = Math.round(group.reduce((s, a) => s + progressPercent(a.current_step), 0) / group.length);
            const done = group.filter(a => a.is_complete).length;

            // Total weeks for this cohort
            const totals: number[] = [];
            group.forEach((a) => {
              const s = buildStepsMap(a.step_events || []);
              const sub = s.submitted;
              const dates = Object.values(s).filter(Boolean).sort();
              const last = dates[dates.length - 1];
              if (sub && last && sub !== last) totals.push(weeksBetween(sub, last));
            });
            const avgTotalWeeks = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
            const localMax = Math.max(...Object.values(avgs).filter(Boolean).map(v => v as number), 1);

            return (
              <div key={monthKey} className="bg-white rounded-xl border border-sand-200 overflow-hidden">
                {/* Month header */}
                <div
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-sand-50 transition-colors"
                  onClick={() => setExpandedMonth(expanded ? null : monthKey)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-brand-700 leading-none">{MO[parseInt(monthKey.split("-")[1]) - 1]}</span>
                      <span className="text-[9px] text-brand-500 leading-none">{monthKey.split("-")[0]}</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-sand-900">{moLabel(monthKey)}</div>
                      <div className="text-[11px] text-sand-400">
                        {group.length} {group.length === 1 ? "entry" : "entries"}
                        {done > 0 && <span className="text-brand-500"> · {done} complete</span>}
                        {avgTotalWeeks && <span> · ~{avgTotalWeeks}w avg</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Mini progress */}
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-sand-200 overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${avgPct}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold text-brand-600">{avgPct}%</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      className={`text-sand-400 transition-transform ${expanded ? "rotate-180" : ""}`}>
                      <path d="M6 9L12 15L18 9" />
                    </svg>
                  </div>
                </div>

                {/* Expanded: step bars + entries */}
                {expanded && (
                  <div className="border-t border-sand-100">
                    {/* Step duration bars for this month */}
                    <div className="px-4 py-3 bg-sand-50/50">
                      <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Step Durations</div>
                      <div className="space-y-1.5">
                        {STEPS.slice(1).map((step, i) => {
                          const w = avgs[step.id];
                          const pct = w ? Math.min((w / localMax) * 100, 100) : 0;
                          return (
                            <div key={step.id} className="flex items-center gap-2">
                              <StepIcon stepId={step.id} size={14} className="text-sand-400 flex-shrink-0" />
                              <span className="text-[11px] text-sand-600 w-16 flex-shrink-0">{step.label}</span>
                              <div className="flex-1 h-5 bg-sand-100 rounded-md overflow-hidden relative">
                                {w != null && (
                                  <div
                                    className={`h-full rounded-md transition-all duration-700 ${STEP_COLORS[i + 1] || "bg-brand-500"}`}
                                    style={{ width: `${Math.max(pct, 6)}%` }}
                                  />
                                )}
                              </div>
                              <span className="text-[11px] font-semibold text-sand-700 w-8 text-right">
                                {w != null ? `${w}w` : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Individual entries */}
                    <div className="divide-y divide-sand-100">
                      {group.map((app) => {
                        const pct = progressPercent(app.current_step);
                        const stepsMap = buildStepsMap(app.step_events || []);
                        const currentStepLabel = STEPS.find(s => s.id === app.current_step)?.label;

                        return (
                          <div
                            key={app.id}
                            className="px-4 py-2.5 flex items-center gap-3 hover:bg-sand-50 cursor-pointer transition-colors"
                            onClick={() => router.push(`/dashboard/${app.id}`)}
                          >
                            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-600 flex-shrink-0">
                              {app.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-sand-900">{app.country_origin}</span>
                                <Badge variant={app.stream === "Outland" ? "success" : "warning"}>{app.stream}</Badge>
                                <span className="text-[11px] text-sand-400">{app.sponsor_status}</span>
                              </div>
                              {/* Step dots inline */}
                              <div className="flex items-center gap-1 mt-1">
                                {STEPS.map((step, i) => {
                                  const done = stepsMap[step.id];
                                  const prevDone = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
                                  const weeks = done && prevDone ? weeksBetween(prevDone, done) : null;
                                  return (
                                    <div key={step.id} className="flex items-center gap-0.5">
                                      <div
                                        className={`w-2 h-2 rounded-full ${
                                          done ? "bg-brand-500" : step.id === app.current_step ? "bg-warn" : "bg-sand-200"
                                        }`}
                                        title={`${step.label}${weeks ? `: ${weeks}w` : ""}`}
                                      />
                                      {weeks != null && i > 0 && (
                                        <span className="text-[7px] text-brand-500 font-semibold">{weeks}w</span>
                                      )}
                                      {i < STEPS.length - 1 && (
                                        <div className={`w-1.5 h-px ${done && stepsMap[STEPS[i+1]?.id] ? "bg-brand-300" : "bg-sand-200"}`} />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs font-bold text-brand-600">{pct}%</div>
                              <div className="text-[10px] text-sand-400">{currentStepLabel}</div>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-sand-300 flex-shrink-0">
                              <path d="M9 18L15 12L9 6" />
                            </svg>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {total === 0 && (
        <div className="text-center py-16 bg-white border border-sand-200 rounded-xl">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-sand-300 mb-4">
            <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
          <p className="text-sand-500 text-sm mb-1">No applications yet</p>
          <p className="text-sand-400 text-xs mb-5">Add your sponsorship application to start tracking</p>
          <Button onClick={() => setShowAdd(true)} size="sm">
            <PlusIcon size={14} className="text-white" /> Add First Entry
          </Button>
        </div>
      )}

      <AddModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} loading={submitting} />
    </div>
  );
}

function AddModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void;
  onSubmit: (f: ApplicationFormData) => void; loading: boolean;
}) {
  const emptyForm: ApplicationFormData = {
    initials: "", sponsor_status: "PR", stream: "Outland",
    country_origin: "", province: "Ontario", submitted_date: "", notes: "",
  };
  const [form, setForm] = useState<ApplicationFormData>(emptyForm);
  useEffect(() => { if (open) setForm(emptyForm); }, [open]);

  const u = (f: keyof ApplicationFormData, v: string) => setForm((p) => ({ ...p, [f]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.initials || !form.submitted_date || !form.country_origin) return;
    onSubmit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Entry">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input label="Initials *" placeholder="AB" maxLength={4} value={form.initials} onChange={(e) => u("initials", e.target.value.toUpperCase())} required />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Status" value={form.sponsor_status} onChange={(e) => u("sponsor_status", e.target.value)} options={SPONSOR_STATUSES.map((s) => ({ value: s, label: s }))} />
          <Select label="Stream" value={form.stream} onChange={(e) => u("stream", e.target.value)} options={STREAMS.map((s) => ({ value: s, label: s }))} />
        </div>
        <Select label="Country *" value={form.country_origin} onChange={(e) => u("country_origin", e.target.value)} options={[{ value: "", label: "Select..." }, ...COMMON_COUNTRIES.map((c) => ({ value: c, label: c }))]} />
        <Select label="Province" value={form.province} onChange={(e) => u("province", e.target.value)} options={PROVINCES.map((p) => ({ value: p, label: p }))} />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">Submission Date *</label>
          <input type="date" className="px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
            value={form.submitted_date} onChange={(e) => u("submitted_date", e.target.value)} max={new Date().toISOString().split("T")[0]} required />
        </div>
        <Input label="Notes" placeholder="Optional" value={form.notes} onChange={(e) => u("notes", e.target.value)} />
        <Button type="submit" disabled={loading} className="w-full mt-1">{loading ? "Adding..." : "Add"}</Button>
      </form>
    </Modal>
  );
}
