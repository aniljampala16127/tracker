"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationFormData, StepId } from "@/lib/types";
import { STEPS, COMMON_COUNTRIES, STREAMS, SPONSOR_STATUSES, PROVINCES, getNextStep } from "@/lib/constants";
import { formatDate, weeksBetween, buildStepsMap } from "@/lib/utils";
import { PlusIcon } from "@/components/icons";
import { Button, Modal, Input, Select } from "@/components/ui";

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
      }).select().single();
    if (app) {
      await supabase.from("step_events").insert({
        application_id: app.id, step_id: "submitted", event_date: form.submitted_date,
      });
    }
    setSubmitting(false); setShowAdd(false); fetchApps();
  };

  const handleMarkStep = async (appId: string, stepId: StepId, date: string) => {
    await supabase.from("step_events").insert({
      application_id: appId, step_id: stepId, event_date: date,
    });
    await supabase.from("applications").update({
      current_step: stepId, is_complete: stepId === "landing",
    }).eq("id", appId);
    fetchApps();
    // Refresh the edit modal data
    const { data } = await supabase.from("applications").select("*, step_events(*)").eq("id", appId).single();
    if (data) setEditApp(data as Application);
  };

  const handleDelete = async (appId: string) => {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("applications").delete().eq("id", appId);
    setEditApp(null); fetchApps();
  };

  if (loading) return <div className="py-20 text-center text-sand-400 text-sm">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-sand-400">{apps.length} entries</div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <PlusIcon size={14} className="text-white" /> Add
        </Button>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-20 bg-white border border-sand-200 rounded-xl">
          <p className="text-sand-500 text-sm mb-4">No entries yet</p>
          <Button onClick={() => setShowAdd(true)} size="sm">
            <PlusIcon size={14} className="text-white" /> Add First Entry
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-sand-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200 bg-sand-50 text-[10px] font-semibold text-sand-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Country</th>
                <th className="text-left px-3 py-2">Stream</th>
                <th className="text-left px-3 py-2">Submitted</th>
                {STEPS.slice(1).map((s) => (
                  <th key={s.id} className="text-center px-2 py-2">{s.label}</th>
                ))}
                <th className="text-left px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => {
                const stepsMap = buildStepsMap(app.step_events || []);
                return (
                  <tr
                    key={app.id}
                    className="border-b border-sand-100 hover:bg-brand-50/30 cursor-pointer transition-colors"
                    onClick={() => setEditApp(app)}
                  >
                    <td className="px-3 py-2 font-semibold text-sand-900 whitespace-nowrap">{app.initials}</td>
                    <td className="px-3 py-2 text-sand-600 whitespace-nowrap">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        app.sponsor_status === "Citizen" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                      }`}>{app.sponsor_status}</span>
                    </td>
                    <td className="px-3 py-2 text-sand-700 whitespace-nowrap">{app.country_origin}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        app.stream === "Outland" ? "bg-brand-100 text-brand-600" : "bg-warn-light text-warn-dark"
                      }`}>{app.stream}</span>
                    </td>
                    <td className="px-3 py-2 text-sand-600 whitespace-nowrap text-xs">{formatDate(stepsMap.submitted)}</td>
                    {STEPS.slice(1).map((step) => {
                      const date = stepsMap[step.id];
                      const prevStep = STEPS[STEPS.findIndex(s => s.id === step.id) - 1];
                      const prevDate = stepsMap[prevStep.id];
                      const weeks = date && prevDate ? weeksBetween(prevDate, date) : null;
                      return (
                        <td key={step.id} className="px-2 py-2 text-center whitespace-nowrap">
                          {date ? (
                            <div>
                              <div className="text-[10px] text-brand-600 font-bold">{weeks}w</div>
                              <div className="text-[9px] text-sand-400">{formatDate(date).replace(/, \d{4}/, "")}</div>
                            </div>
                          ) : (
                            <span className="text-sand-200">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-xs text-sand-400 max-w-[120px] truncate">{app.notes || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-sand-400 mt-3 text-center">
        Click any row to update steps or delete · Anyone can edit
      </p>

      {/* Add modal */}
      <AddModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} loading={submitting} />

      {/* Edit modal - click a row to open */}
      {editApp && (
        <EditModal
          app={editApp}
          onClose={() => setEditApp(null)}
          onMarkStep={handleMarkStep}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ============================================
// Edit modal — update steps
// ============================================
function EditModal({ app, onClose, onMarkStep, onDelete }: {
  app: Application; onClose: () => void;
  onMarkStep: (appId: string, stepId: StepId, date: string) => void;
  onDelete: (appId: string) => void;
}) {
  const stepsMap = buildStepsMap(app.step_events || []);
  const [stepDate, setStepDate] = useState("");
  const [activeStep, setActiveStep] = useState<StepId | null>(null);
  const nextStep = getNextStep(app.current_step);

  return (
    <Modal open={true} onClose={onClose} title={`${app.initials} — ${app.country_origin}`}>
      <div className="flex gap-3 text-xs text-sand-500 mb-4">
        <span>{app.sponsor_status}</span>
        <span>·</span>
        <span>{app.stream}</span>
        {app.notes && <><span>·</span><span className="italic">{app.notes}</span></>}
      </div>

      <div className="space-y-1">
        {STEPS.map((step, i) => {
          const date = stepsMap[step.id];
          const prevDate = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
          const weeks = date && prevDate ? weeksBetween(prevDate, date) : null;
          const isNext = step.id === nextStep;
          const isDone = !!date;
          const isFuture = !isDone && !isNext;

          return (
            <div key={step.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isDone ? "bg-brand-50/50" : isNext ? "bg-warn-light/30" : "opacity-40"}`}>
              {/* Status dot */}
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isDone ? "bg-brand-500" : isNext ? "bg-warn" : "bg-sand-200"}`} />

              {/* Step info */}
              <div className="flex-1">
                <div className="text-sm font-medium text-sand-900">{step.label}</div>
                {isDone && (
                  <div className="text-xs text-sand-500">
                    {formatDate(date)}{weeks != null && i > 0 && <span className="text-brand-500 font-semibold ml-1">({weeks} weeks)</span>}
                  </div>
                )}
              </div>

              {/* Action */}
              {isNext && (
                <div className="flex items-center gap-2">
                  {activeStep === step.id ? (
                    <input
                      type="date"
                      autoFocus
                      className="text-xs px-2 py-1 border border-sand-200 rounded-md bg-white"
                      max={new Date().toISOString().split("T")[0]}
                      value={stepDate}
                      onChange={(e) => setStepDate(e.target.value)}
                      onBlur={() => { if (!stepDate) setActiveStep(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && stepDate) {
                          onMarkStep(app.id, step.id, stepDate);
                          setStepDate(""); setActiveStep(null);
                        }
                      }}
                    />
                  ) : null}
                  {activeStep === step.id && stepDate ? (
                    <button
                      className="text-xs bg-brand-500 text-white px-3 py-1 rounded-md font-medium hover:bg-brand-600"
                      onClick={() => { onMarkStep(app.id, step.id, stepDate); setStepDate(""); setActiveStep(null); }}
                    >Save</button>
                  ) : activeStep !== step.id ? (
                    <button
                      className="text-xs bg-warn text-white px-3 py-1 rounded-md font-medium hover:bg-warn-dark"
                      onClick={() => setActiveStep(step.id)}
                    >Update</button>
                  ) : null}
                </div>
              )}

              {isDone && <span className="text-brand-500">✓</span>}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onDelete(app.id)}
        className="mt-4 text-xs text-error hover:text-error-dark transition-colors"
      >
        Delete this entry
      </button>
    </Modal>
  );
}

// ============================================
// Add modal
// ============================================
function AddModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void;
  onSubmit: (f: ApplicationFormData) => void; loading: boolean;
}) {
  const empty: ApplicationFormData = {
    initials: "", sponsor_status: "PR", stream: "Outland",
    country_origin: "", province: "Ontario", submitted_date: "", notes: "",
  };
  const [form, setForm] = useState<ApplicationFormData>(empty);
  useEffect(() => { if (open) setForm(empty); }, [open]);

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
