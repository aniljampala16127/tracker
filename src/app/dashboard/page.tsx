"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationFormData } from "@/lib/types";
import { STEPS, COMMON_COUNTRIES, STREAMS, SPONSOR_STATUSES, PROVINCES } from "@/lib/constants";
import { progressPercent, formatDate, weeksBetween, buildStepsMap } from "@/lib/utils";
import { PlusIcon } from "@/components/icons";
import { Button, Modal, Input, Select, Badge } from "@/components/ui";

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleAdd = async (form: ApplicationFormData) => {
    setSubmitting(true);
    const { data: app } = await supabase
      .from("applications")
      .insert({
        initials: form.initials.toUpperCase(),
        sponsor_status: form.sponsor_status,
        stream: form.stream,
        country_origin: form.country_origin,
        province: form.province,
        current_step: "submitted",
        notes: form.notes || null,
      })
      .select()
      .single();

    if (app) {
      await supabase.from("step_events").insert({
        application_id: app.id,
        step_id: "submitted",
        event_date: form.submitted_date,
      });
    }
    setSubmitting(false);
    setShowAdd(false);
    fetchApps();
  };

  // Group apps by submission month
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

  // Compute avg weeks per step for a group of apps
  function getGroupStepAvgs(group: Application[]) {
    const avgs: Record<string, number | null> = {};
    STEPS.forEach((step, i) => {
      if (i === 0) { avgs[step.id] = null; return; }
      const prev = STEPS[i - 1].id;
      const durations: number[] = [];
      group.forEach((a) => {
        const s = buildStepsMap(a.step_events || []);
        if (s[prev] && s[step.id]) durations.push(weeksBetween(s[prev]!, s[step.id]!));
      });
      avgs[step.id] = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
    });
    return avgs;
  }

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function monthLabel(key: string) {
    const [y, m] = key.split("-");
    return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
  }

  if (loading) {
    return <div className="py-20 text-center text-sand-400 text-sm">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-sand-900">Spousal Sponsorship Tracker</h1>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <PlusIcon size={14} className="text-white" /> Add Entry
        </Button>
      </div>

      {/* Applications table */}
      {apps.length === 0 ? (
        <div className="text-center py-16 bg-white border border-sand-200 rounded-xl">
          <p className="text-sand-500 text-sm mb-4">No applications yet</p>
          <Button onClick={() => setShowAdd(true)} size="sm">
            <PlusIcon size={14} className="text-white" /> Add First Entry
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-sand-200 rounded-xl overflow-hidden mb-6">
          {/* Table header */}
          <div className="grid grid-cols-[60px_1fr_70px_70px_1fr_60px] gap-0 text-[10px] font-semibold text-sand-500 uppercase tracking-wider border-b border-sand-200 px-3 py-2 bg-sand-50">
            <span>Who</span>
            <span>Details</span>
            <span>Stream</span>
            <span>Status</span>
            <span>Progress</span>
            <span className="text-right">Done</span>
          </div>

          {/* Rows */}
          {apps.map((app) => {
            const pct = progressPercent(app.current_step);
            const stepsMap = buildStepsMap(app.step_events || []);

            const submitted = stepsMap.submitted;
            const lastStepDate = Object.values(stepsMap).filter(Boolean).sort().pop();
            const totalWeeks = submitted && lastStepDate && submitted !== lastStepDate
              ? weeksBetween(submitted, lastStepDate) : null;

            return (
              <div
                key={app.id}
                className="grid grid-cols-[60px_1fr_70px_70px_1fr_60px] gap-0 items-center px-3 py-2.5 border-b border-sand-100 hover:bg-sand-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard/${app.id}`)}
              >
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600">
                  {app.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-sand-900 truncate">{app.country_origin}</div>
                  <div className="text-[11px] text-sand-400 truncate">
                    {formatDate(stepsMap.submitted)}{app.notes && ` · ${app.notes}`}
                  </div>
                </div>
                <Badge variant={app.stream === "Outland" ? "success" : "warning"}>{app.stream}</Badge>
                <span className="text-xs text-sand-600">{app.sponsor_status}</span>
                <div className="flex items-center gap-0.5">
                  {STEPS.map((step, i) => {
                    const done = stepsMap[step.id];
                    const prevDone = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
                    const weeks = done && prevDone ? weeksBetween(prevDone, done) : null;
                    const isCurrent = step.id === app.current_step;
                    return (
                      <div key={step.id} className="flex items-center gap-0.5" title={`${step.label}${weeks ? `: ${weeks}w` : ""}`}>
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full ${done ? "bg-brand-500" : isCurrent ? "bg-warn border border-warn" : "bg-sand-200"}`} />
                          {weeks != null && i > 0 && (
                            <span className="text-[8px] text-brand-500 font-medium mt-0.5 leading-none">{weeks}w</span>
                          )}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`w-2 h-px ${done && stepsMap[STEPS[i + 1]?.id] ? "bg-brand-400" : "bg-sand-200"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-brand-600">{pct}%</span>
                  {totalWeeks != null && <div className="text-[9px] text-sand-400">{totalWeeks}w total</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly step duration breakdown */}
      {sortedMonths.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-sand-900 mb-3">Average Step Duration by Month</h2>
          <div className="bg-white border border-sand-200 rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="grid gap-0 text-[9px] font-semibold text-sand-500 uppercase tracking-wider border-b border-sand-200 px-3 py-2 bg-sand-50"
              style={{ gridTemplateColumns: `90px repeat(${STEPS.length - 1}, 1fr) 60px` }}>
              <span>Month</span>
              {STEPS.slice(1).map((s) => (
                <span key={s.id} className="text-center">{s.label}</span>
              ))}
              <span className="text-right">Total</span>
            </div>

            {/* Month rows */}
            {sortedMonths.map((monthKey) => {
              const group = monthGroups[monthKey];
              const avgs = getGroupStepAvgs(group);

              // Total avg: submitted to latest step
              const totals: number[] = [];
              group.forEach((a) => {
                const s = buildStepsMap(a.step_events || []);
                const sub = s.submitted;
                const dates = Object.values(s).filter(Boolean).sort();
                const last = dates[dates.length - 1];
                if (sub && last && sub !== last) totals.push(weeksBetween(sub, last));
              });
              const avgTotal = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;

              return (
                <div
                  key={monthKey}
                  className="grid gap-0 items-center px-3 py-2 border-b border-sand-100 hover:bg-sand-50 transition-colors"
                  style={{ gridTemplateColumns: `90px repeat(${STEPS.length - 1}, 1fr) 60px` }}
                >
                  <div>
                    <span className="text-xs font-semibold text-sand-900">{monthLabel(monthKey)}</span>
                    <span className="text-[10px] text-sand-400 ml-1">({group.length})</span>
                  </div>
                  {STEPS.slice(1).map((step) => {
                    const w = avgs[step.id];
                    return (
                      <div key={step.id} className="text-center">
                        {w != null ? (
                          <span className="text-xs font-semibold text-brand-600">{w}w</span>
                        ) : (
                          <span className="text-[10px] text-sand-300">—</span>
                        )}
                      </div>
                    );
                  })}
                  <div className="text-right">
                    {avgTotal != null ? (
                      <span className="text-xs font-bold text-sand-800">{avgTotal}w</span>
                    ) : (
                      <span className="text-[10px] text-sand-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-sand-400 mt-1.5 px-1">
            Weeks between each step, averaged across all entries for that month. Updates as people mark milestones.
          </p>
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

  // Reset form every time modal opens
  useEffect(() => {
    if (open) setForm(emptyForm);
  }, [open]);

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
          <input
            type="date"
            className="px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
            value={form.submitted_date}
            onChange={(e) => u("submitted_date", e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            required
          />
        </div>
        <Input label="Notes" placeholder="Optional" value={form.notes} onChange={(e) => u("notes", e.target.value)} />
        <Button type="submit" disabled={loading} className="w-full mt-1">
          {loading ? "Adding..." : "Add"}
        </Button>
      </form>
    </Modal>
  );
}
