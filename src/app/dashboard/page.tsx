"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationFormData, StepId } from "@/lib/types";
import { STEPS, COMMON_COUNTRIES, STREAMS, SPONSOR_STATUSES, PROVINCES } from "@/lib/constants";
import { progressPercent, formatDate, weeksBetween, buildStepsMap } from "@/lib/utils";
import { StepIcon, PlusIcon } from "@/components/icons";
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

  // Compute community avg per step (from all apps data)
  const stepAvgs: Record<string, number | null> = {};
  STEPS.forEach((step, i) => {
    if (i === 0) { stepAvgs[step.id] = null; return; }
    const prev = STEPS[i - 1].id;
    const durations: number[] = [];
    apps.forEach((a) => {
      const steps = buildStepsMap(a.step_events || []);
      if (steps[prev] && steps[step.id]) {
        durations.push(weeksBetween(steps[prev]!, steps[step.id]!));
      }
    });
    stepAvgs[step.id] = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;
  });

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

      {/* Step averages bar */}
      {apps.length > 0 && (
        <div className="flex gap-1 mb-5 overflow-x-auto hide-scrollbar pb-1">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className="flex flex-col items-center min-w-[72px] px-2 py-2 bg-white border border-sand-200 rounded-lg"
            >
              <StepIcon stepId={step.id} size={16} className="text-brand-500 mb-1" />
              <span className="text-[10px] font-semibold text-sand-700">{step.label}</span>
              <span className="text-[10px] text-sand-400">
                {stepAvgs[step.id] != null ? `~${stepAvgs[step.id]}w` : step.avgWeeksOutland[0] > 0 ? `${step.avgWeeksOutland[0]}–${step.avgWeeksOutland[1]}w` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Applications table */}
      {apps.length === 0 ? (
        <div className="text-center py-16 bg-white border border-sand-200 rounded-xl">
          <p className="text-sand-500 text-sm mb-4">No applications yet</p>
          <Button onClick={() => setShowAdd(true)} size="sm">
            <PlusIcon size={14} className="text-white" /> Add First Entry
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-sand-200 rounded-xl overflow-hidden">
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
            const currentStepData = STEPS.find((s) => s.id === app.current_step);

            // Calculate total weeks so far
            const submitted = stepsMap.submitted;
            const lastStepDate = Object.values(stepsMap).filter(Boolean).sort().pop();
            const totalWeeks = submitted && lastStepDate && submitted !== lastStepDate
              ? weeksBetween(submitted, lastStepDate)
              : null;

            return (
              <div
                key={app.id}
                className="grid grid-cols-[60px_1fr_70px_70px_1fr_60px] gap-0 items-center px-3 py-2.5 border-b border-sand-100 hover:bg-sand-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard/${app.id}`)}
              >
                {/* Initials */}
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600">
                  {app.initials}
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-sand-900 truncate">
                    {app.country_origin}
                  </div>
                  <div className="text-[11px] text-sand-400 truncate">
                    {formatDate(stepsMap.submitted)}
                    {app.notes && ` · ${app.notes}`}
                  </div>
                </div>

                {/* Stream */}
                <Badge variant={app.stream === "Outland" ? "success" : "warning"}>
                  {app.stream}
                </Badge>

                {/* Sponsor Status */}
                <span className="text-xs text-sand-600">{app.sponsor_status}</span>

                {/* Progress - step dots with durations */}
                <div className="flex items-center gap-0.5">
                  {STEPS.map((step, i) => {
                    const done = stepsMap[step.id];
                    const prevDone = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
                    const weeks = done && prevDone ? weeksBetween(prevDone, done) : null;
                    const isCurrent = step.id === app.current_step;

                    return (
                      <div key={step.id} className="flex items-center gap-0.5" title={`${step.label}${weeks ? `: ${weeks}w` : ""}`}>
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              done
                                ? "bg-brand-500"
                                : isCurrent
                                ? "bg-warn border border-warn"
                                : "bg-sand-200"
                            }`}
                          />
                          {weeks != null && i > 0 && (
                            <span className="text-[8px] text-brand-500 font-medium mt-0.5 leading-none">
                              {weeks}w
                            </span>
                          )}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className={`w-2 h-px ${
                              done && stepsMap[STEPS[i + 1]?.id]
                                ? "bg-brand-400"
                                : "bg-sand-200"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Percentage */}
                <div className="text-right">
                  <span className="text-xs font-bold text-brand-600">{pct}%</span>
                  {totalWeeks != null && (
                    <div className="text-[9px] text-sand-400">{totalWeeks}w total</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-sand-400 mt-3 text-center">
        Outland: ~5–12 months · Inland: ~12–28 months · IRCC standard: 12 months
      </p>

      <AddModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} loading={submitting} />
    </div>
  );
}

function AddModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void;
  onSubmit: (f: ApplicationFormData) => void; loading: boolean;
}) {
  const [form, setForm] = useState<ApplicationFormData>({
    initials: "", sponsor_status: "PR", stream: "Outland",
    country_origin: "", province: "Ontario", submitted_date: "", notes: "",
  });
  const u = (f: keyof ApplicationFormData, v: string) => setForm((p) => ({ ...p, [f]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.initials || !form.submitted_date || !form.country_origin) return;
    onSubmit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Application">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input label="Initials *" placeholder="AB" maxLength={4} value={form.initials} onChange={(e) => u("initials", e.target.value.toUpperCase())} required />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Status" value={form.sponsor_status} onChange={(e) => u("sponsor_status", e.target.value)} options={SPONSOR_STATUSES.map((s) => ({ value: s, label: s }))} />
          <Select label="Stream" value={form.stream} onChange={(e) => u("stream", e.target.value)} options={STREAMS.map((s) => ({ value: s, label: s }))} />
        </div>
        <Select label="Country *" value={form.country_origin} onChange={(e) => u("country_origin", e.target.value)} options={[{ value: "", label: "Select..." }, ...COMMON_COUNTRIES.map((c) => ({ value: c, label: c }))]} />
        <Select label="Province" value={form.province} onChange={(e) => u("province", e.target.value)} options={PROVINCES.map((p) => ({ value: p, label: p }))} />
        <Input type="date" label="Submitted *" value={form.submitted_date} onChange={(e) => u("submitted_date", e.target.value)} required />
        <Input label="Notes" placeholder="Optional" value={form.notes} onChange={(e) => u("notes", e.target.value)} />
        <Button type="submit" disabled={loading} className="w-full mt-1">
          {loading ? "Adding..." : "Add"}
        </Button>
      </form>
    </Modal>
  );
}
