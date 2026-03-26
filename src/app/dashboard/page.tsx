"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationFormData, StepId } from "@/lib/types";
import { STEPS, COMMON_COUNTRIES, APPLICATION_SUBCATEGORIES, STREAMS, SPONSOR_STATUSES, PROVINCES, VISA_COUNTRIES, MEI_TYPES, getNextStep } from "@/lib/constants";
import { formatDate, weeksBetween, buildStepsMap } from "@/lib/utils";
import { hashPin, isValidPin, savePinForApp, getSavedPinHash, removeSavedPin } from "@/lib/pin";
import { PlusIcon, StepIcon } from "@/components/icons";
import { Button, Modal, Input, Select, SearchableSelect } from "@/components/ui";
import { PinModal, PinInput } from "@/components/PinModal";
import { ClaimPinModal } from "@/components/ClaimPinModal";
import { FilterBar, Filters, EMPTY_FILTERS } from "@/components/FilterBar";
import { StepChart } from "@/components/StepChart";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  // PIN state
  const [pinTarget, setPinTarget] = useState<Application | null>(null);
  const [claimTarget, setClaimTarget] = useState<Application | null>(null);
  const supabase = createClient();

  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .order("created_at", { ascending: true });
    if (data) {
      const sorted = (data as Application[]).sort((a, b) => {
        const aD = a.step_events?.find(e => e.step_id === "submitted")?.event_date || "";
        const bD = b.step_events?.find(e => e.step_id === "submitted")?.event_date || "";
        return aD.localeCompare(bD);
      });
      setApps(sorted);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // Filtered apps
  const filteredApps = useMemo(() => {
    return apps.filter((a) => {
      if (filters.stream && a.stream !== filters.stream) return false;
      if (filters.country && a.country_origin !== filters.country) return false;
      if (filters.sponsor_status && a.sponsor_status !== filters.sponsor_status) return false;
      if (filters.subcategory && a.subcategory !== filters.subcategory) return false;
      return true;
    });
  }, [apps, filters]);

  // Unique values for filter dropdowns (from actual data)
  const availableCountries = useMemo(() => Array.from(new Set(apps.map(a => a.country_origin))).sort(), [apps]);
  const availableSubcategories = useMemo(() => Array.from(new Set(apps.map(a => a.subcategory).filter(Boolean) as string[])).sort(), [apps]);

  const handleAdd = async (form: ApplicationFormData & { pin: string }) => {
    setSubmitting(true);
    const pinHash = await hashPin(form.pin);
    const { data: app } = await supabase
      .from("applications")
      .insert({
        initials: form.initials.trim(), sponsor_status: form.sponsor_status,
        stream: form.stream, country_origin: form.country_origin,
        subcategory: form.subcategory || null,
        visa_country: form.visa_country || null,
        mei_type: form.mei_type || null,
        province: form.province, current_step: "submitted", notes: form.notes || null,
        pin_hash: pinHash,
      }).select().single();
    if (app) {
      await supabase.from("step_events").insert({
        application_id: app.id, step_id: "submitted", event_date: form.submitted_date,
      });
      savePinForApp(app.id, pinHash);
    }
    setSubmitting(false); setShowAdd(false); fetchApps();
  };

  /** Row click — PIN check or claim */
  const handleRowClick = (app: Application) => {
    if (!app.pin_hash) {
      // No PIN — show claim modal
      setClaimTarget(app);
    } else {
      const savedHash = getSavedPinHash(app.id);
      if (savedHash === app.pin_hash) {
        setEditApp(app);
      } else {
        setPinTarget(app);
      }
    }
  };

  const handleMarkStep = async (appId: string, stepId: StepId, date: string) => {
    await supabase.from("step_events").insert({ application_id: appId, step_id: stepId, event_date: date });
    await supabase.from("applications").update({ current_step: stepId, is_complete: stepId === "ecopr" }).eq("id", appId);
    fetchApps();
    const { data } = await supabase.from("applications").select("*, step_events(*)").eq("id", appId).single();
    if (data) setEditApp(data as Application);
  };

  const handleDelete = async (appId: string) => {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("applications").delete().eq("id", appId);
    removeSavedPin(appId);
    setEditApp(null); fetchApps();
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Group filtered apps by month
  const monthGroups: Record<string, Application[]> = {};
  filteredApps.forEach((app) => {
    const sub = app.step_events?.find(e => e.step_id === "submitted");
    if (!sub) return;
    const d = new Date(sub.event_date + "T00:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(app);
  });
  const sortedMonths = Object.keys(monthGroups).sort();

  // Step-to-step averages (from filtered data)
  const stepPairs = STEPS.slice(1).map((step, i) => {
    const prev = STEPS[i];
    const durations: number[] = [];
    filteredApps.forEach((a) => {
      const s = buildStepsMap(a.step_events || []);
      if (s[prev.id] && s[step.id]) durations.push(weeksBetween(s[prev.id]!, s[step.id]!));
    });
    return {
      from: prev, to: step,
      avg: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
      count: durations.length,
    };
  });

  const cumulativeDays: Record<string, number | null> = {};
  STEPS.forEach((step, i) => {
    if (i === 0) { cumulativeDays[step.id] = null; return; }
    const durations: number[] = [];
    filteredApps.forEach((a) => {
      const s = buildStepsMap(a.step_events || []);
      if (s.submitted && s[step.id]) {
        const d1 = new Date(s.submitted + "T00:00:00");
        const d2 = new Date(s[step.id]! + "T00:00:00");
        durations.push(Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000)));
      }
    });
    cumulativeDays[step.id] = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  });

  if (loading) return <div className="py-20 text-center text-sand-400 text-sm">Loading...</div>;

  const isFiltered = Object.values(filters).some(Boolean);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-sand-400">
          {isFiltered ? `${filteredApps.length} of ${apps.length} entries` : `${apps.length} entries`}
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <PlusIcon size={14} className="text-white" /> Add
        </Button>
      </div>

      {/* Filters */}
      {apps.length > 0 && (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          availableCountries={availableCountries}
          availableSubcategories={availableSubcategories}
        />
      )}

      {/* Bar Chart */}
      {apps.length > 0 && <StepChart apps={filteredApps} />}

      {/* Step cards */}
      {filteredApps.length > 0 && (
        <div className="flex overflow-x-auto gap-2 pb-2 mb-5">
          {STEPS.map((step, i) => {
            const pair = i > 0 ? stepPairs[i - 1] : null;
            const cumDays = cumulativeDays[step.id];
            const hasData = pair?.avg != null;
            const isFirst = i === 0;
            const isLast = i === STEPS.length - 1;

            return (
              <div
                key={step.id}
                className={`rounded-xl border p-3 flex flex-col items-center text-center transition-all min-w-[80px] flex-shrink-0 ${
                  isFirst ? "bg-brand-500 border-brand-500 text-white"
                    : isLast ? "bg-brand-700 border-brand-700 text-white"
                    : hasData ? "bg-white border-brand-200"
                    : "bg-sand-50 border-sand-200"
                }`}
              >
                <StepIcon stepId={step.id} size={18} className={isFirst || isLast ? "text-white/80" : hasData ? "text-brand-500" : "text-sand-300"} />
                <span className={`text-[10px] font-bold mt-1.5 ${isFirst || isLast ? "text-white" : "text-sand-800"}`} title={step.label}>
                  {step.shortLabel}
                </span>
                {isFirst ? (
                  <span className="text-[9px] text-white/70 mt-0.5">Day 0</span>
                ) : hasData ? (
                  <div className="mt-1">
                    <div className="text-sm font-bold text-brand-600">~{pair!.avg! * 7}d</div>
                    {cumDays != null && <div className="text-[8px] text-sand-400">day {cumDays}</div>}
                    <div className="text-[7px] text-sand-300 mt-0.5">{pair!.count} reports</div>
                  </div>
                ) : (
                  <span className="text-[9px] text-sand-400 mt-1">awaiting data</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {filteredApps.length === 0 && (
        <div className="text-center py-20 bg-white border border-sand-200 rounded-xl">
          <p className="text-sand-500 text-sm mb-4">
            {isFiltered ? "No entries match your filters" : "No entries yet"}
          </p>
          {isFiltered ? (
            <Button onClick={() => setFilters(EMPTY_FILTERS)} size="sm" variant="secondary">
              Clear Filters
            </Button>
          ) : (
            <Button onClick={() => setShowAdd(true)} size="sm">
              <PlusIcon size={14} className="text-white" /> Add First Entry
            </Button>
          )}
        </div>
      )}

      {/* Monthly groups */}
      {sortedMonths.map((monthKey) => {
        const group = monthGroups[monthKey];
        const expanded = expandedMonths.has(monthKey);
        const [y, m] = monthKey.split("-");
        const label = `${MO[parseInt(m) - 1]} ${y}`;
        const outland = group.filter(a => a.stream === "Outland").length;
        const inland = group.filter(a => a.stream === "Inland").length;

        return (
          <div key={monthKey} className="mb-3 bg-white border border-sand-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleMonth(monthKey)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-sand-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-100 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-brand-700 leading-none">{MO[parseInt(m) - 1]}</span>
                  <span className="text-[8px] text-brand-500 leading-none">{y}</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-sand-900">{label}</span>
                  <div className="text-[10px] text-sand-400">
                    {group.length} {group.length === 1 ? "entry" : "entries"}
                    <span className="mx-1">·</span>
                    {outland} outland{inland > 0 && <>, {inland} inland</>}
                  </div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`text-sand-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
                <path d="M6 9L12 15L18 9" />
              </svg>
            </button>

            {expanded && (
              <div className="border-t border-sand-100 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-sand-50 text-[9px] font-semibold text-sand-500 uppercase tracking-wider">
                      <th className="text-left px-3 py-1.5">Name</th>
                      <th className="text-left px-2 py-1.5">Status</th>
                      <th className="text-left px-2 py-1.5">Country</th>
                      <th className="text-left px-2 py-1.5">App Type</th>
                      <th className="text-left px-2 py-1.5">Stream</th>
                      <th className="text-left px-2 py-1.5">Submitted</th>
                      {STEPS.slice(1).map(s => (
                        <th key={s.id} className="text-center px-1 py-1.5" title={s.label}>{s.shortLabel}</th>
                      ))}
                      <th className="text-left px-2 py-1.5">Notes</th>
                      <th className="text-center px-2 py-1.5 w-8">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline text-sand-400">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((app) => {
                      const stepsMap = buildStepsMap(app.step_events || []);
                      const hasPin = !!app.pin_hash;
                      const isOwner = hasPin && getSavedPinHash(app.id) === app.pin_hash;
                      return (
                        <tr key={app.id}
                          className="border-t border-sand-100 hover:bg-brand-50/30 cursor-pointer transition-colors"
                          onClick={() => handleRowClick(app)}
                        >
                          <td className="px-3 py-2 font-semibold text-sand-900 whitespace-nowrap">{app.initials}</td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              app.sponsor_status === "Citizen" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                            }`}>{app.sponsor_status}</span>
                          </td>
                          <td className="px-2 py-2 text-sand-700 text-xs whitespace-nowrap">{app.country_origin}</td>
                          <td className="px-2 py-2 text-sand-500 text-[10px] whitespace-nowrap max-w-[100px] truncate" title={app.subcategory || ""}>{app.subcategory ? app.subcategory.replace("Spousal — ", "").replace("Express Entry — ", "EE: ").replace("Provincial Nominee — ", "PN: ").replace("Work Permit — ", "WP: ") : "—"}</td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              app.stream === "Outland" ? "bg-brand-100 text-brand-600" : "bg-warn-light text-warn-dark"
                            }`}>{app.stream}</span>
                          </td>
                          <td className="px-2 py-2 text-xs text-sand-600 whitespace-nowrap">{formatDate(stepsMap.submitted)}</td>
                          {STEPS.slice(1).map((step) => {
                            const date = stepsMap[step.id];
                            const prevStep = STEPS[STEPS.findIndex(s => s.id === step.id) - 1];
                            const prevDate = stepsMap[prevStep.id];
                            const weeks = date && prevDate ? weeksBetween(prevDate, date) : null;
                            return (
                              <td key={step.id} className="px-1.5 py-2 text-center whitespace-nowrap">
                                {date ? (
                                  <div>
                                    <div className="text-[10px] text-brand-600 font-bold">{weeks}w</div>
                                    <div className="text-[8px] text-sand-400">{formatDate(date).replace(/, \d{4}/, "")}</div>
                                  </div>
                                ) : (
                                  <span className="text-sand-200">·</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-[10px] text-sand-400 max-w-[100px] truncate">{app.notes || ""}</td>
                          <td className="px-2 py-2 text-center">
                            {hasPin ? (
                              <span title={isOwner ? "Your entry" : "PIN protected"}>
                                {isOwner ? (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline text-brand-500">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                  </svg>
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline text-sand-400">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                )}
                              </span>
                            ) : (
                              <span title="Unclaimed — click to claim" className="text-[9px] text-warn font-medium">open</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-brand-50/50 border-t border-brand-200">
                      <td className="px-3 py-2 font-bold text-[10px] text-brand-700" colSpan={6}>Avg</td>
                      {STEPS.slice(1).map((step, i) => {
                        const prev = STEPS[i];
                        const durations: number[] = [];
                        group.forEach(a => {
                          const s = buildStepsMap(a.step_events || []);
                          if (s[prev.id] && s[step.id]) durations.push(weeksBetween(s[prev.id]!, s[step.id]!));
                        });
                        const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
                        return (
                          <td key={step.id} className="px-1.5 py-2 text-center">
                            {avg != null ? <span className="text-[10px] font-bold text-brand-600">{avg}w</span> : <span className="text-sand-300 text-[10px]">—</span>}
                          </td>
                        );
                      })}
                      <td></td><td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[9px] text-sand-400 mt-3 text-center">
        Click any row to update steps · PIN required to edit · Unclaimed entries can be claimed
      </p>

      <AddModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} loading={submitting} />
      {editApp && <EditModal app={editApp} onClose={() => setEditApp(null)} onMarkStep={handleMarkStep} onDelete={handleDelete} />}

      {/* PIN verification */}
      {pinTarget && pinTarget.pin_hash && (
        <PinModal
          open={!!pinTarget}
          onClose={() => setPinTarget(null)}
          expectedHash={pinTarget.pin_hash}
          appId={pinTarget.id}
          onVerified={() => { setEditApp(pinTarget); setPinTarget(null); }}
        />
      )}

      {/* Claim modal for unclaimed entries */}
      {claimTarget && (
        <ClaimPinModal
          open={!!claimTarget}
          onClose={() => setClaimTarget(null)}
          appId={claimTarget.id}
          appInitials={claimTarget.initials}
          onClaimed={(pinHash) => {
            // After claiming, open edit modal
            const claimed = { ...claimTarget, pin_hash: pinHash };
            setClaimTarget(null);
            setEditApp(claimed);
            fetchApps();
          }}
        />
      )}
    </div>
  );
}

// ============================================
// Edit modal
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
      <div className="flex flex-wrap gap-2 text-xs text-sand-500 mb-4">
        <span>{app.sponsor_status}</span><span>·</span><span>{app.stream}</span>
        {app.subcategory && <><span>·</span><span>{app.subcategory}</span></>}
        {app.notes && <><span>·</span><span className="italic">{app.notes}</span></>}
      </div>
      <div className="space-y-1">
        {STEPS.map((step, i) => {
          const date = stepsMap[step.id];
          const prevDate = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
          const weeks = date && prevDate ? weeksBetween(prevDate, date) : null;
          const isNext = step.id === nextStep;
          const isDone = !!date;

          return (
            <div key={step.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isDone ? "bg-brand-50/50" : isNext ? "bg-warn-light/30" : "opacity-40"}`}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isDone ? "bg-brand-500" : isNext ? "bg-warn" : "bg-sand-200"}`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-sand-900">{step.label}</div>
                {isDone && (
                  <div className="text-xs text-sand-500">
                    {formatDate(date)}{weeks != null && i > 0 && <span className="text-brand-500 font-semibold ml-1">({weeks}w)</span>}
                  </div>
                )}
              </div>
              {isNext && (
                <div className="flex items-center gap-2">
                  {activeStep === step.id ? (
                    <input type="date" autoFocus className="text-xs px-2 py-1 border border-sand-200 rounded-md bg-white"
                      max={new Date().toISOString().split("T")[0]} value={stepDate}
                      onChange={(e) => setStepDate(e.target.value)}
                      onBlur={() => { if (!stepDate) setActiveStep(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && stepDate) { onMarkStep(app.id, step.id, stepDate); setStepDate(""); setActiveStep(null); }}} />
                  ) : null}
                  {activeStep === step.id && stepDate ? (
                    <button className="text-xs bg-brand-500 text-white px-3 py-1 rounded-md font-medium hover:bg-brand-600"
                      onClick={() => { onMarkStep(app.id, step.id, stepDate); setStepDate(""); setActiveStep(null); }}>Save</button>
                  ) : activeStep !== step.id ? (
                    <button className="text-xs bg-warn text-white px-3 py-1 rounded-md font-medium hover:bg-warn-dark"
                      onClick={() => setActiveStep(step.id)}>Update</button>
                  ) : null}
                </div>
              )}
              {isDone && <span className="text-brand-500 text-xs">✓</span>}
            </div>
          );
        })}
      </div>
      <button onClick={() => onDelete(app.id)} className="mt-4 text-xs text-error hover:text-error-dark transition-colors">
        Delete this entry
      </button>
    </Modal>
  );
}

// ============================================
// Add modal (with PIN)
// ============================================
function AddModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void;
  onSubmit: (f: ApplicationFormData & { pin: string }) => void; loading: boolean;
}) {
  const empty = {
    initials: "", sponsor_status: "PR" as const, stream: "Outland" as const,
    country_origin: "", subcategory: "", visa_country: "", mei_type: "",
    province: "Ontario", submitted_date: "", notes: "", pin: "",
  };
  const [form, setForm] = useState(empty);
  useEffect(() => { if (open) setForm(empty); }, [open]);

  const u = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.initials || !form.submitted_date || !form.country_origin) return;
    if (!isValidPin(form.pin)) return;
    onSubmit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Entry">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input label="Name *" maxLength={20} value={form.initials} onChange={(e) => u("initials", e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Sponsor Status" value={form.sponsor_status} onChange={(e) => u("sponsor_status", e.target.value)} options={SPONSOR_STATUSES.map((s) => ({ value: s, label: s }))} />
          <Select label="Stream" value={form.stream} onChange={(e) => u("stream", e.target.value)} options={STREAMS.map((s) => ({ value: s, label: s }))} />
        </div>
        <SearchableSelect label="PA Country *" value={form.country_origin} onChange={(v) => u("country_origin", v)} options={COMMON_COUNTRIES.map((c) => ({ value: c, label: c }))} />
        <Select label="Application Type" value={form.subcategory} onChange={(e) => u("subcategory", e.target.value)} options={[{ value: "", label: "Select type..." }, ...APPLICATION_SUBCATEGORIES.map((c) => ({ value: c, label: c }))]} />
        <Select label="Province" value={form.province} onChange={(e) => u("province", e.target.value)} options={PROVINCES.map((p) => ({ value: p, label: p }))} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="PA Visa Country" value={form.visa_country} onChange={(e) => u("visa_country", e.target.value)} options={VISA_COUNTRIES.map((v) => ({ value: v, label: v || "Select..." }))} />
          <Select label="MEI Type" value={form.mei_type} onChange={(e) => u("mei_type", e.target.value)} options={MEI_TYPES.map((m) => ({ value: m, label: m || "Select..." }))} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">Submission Date *</label>
          <input type="date" className="px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
            value={form.submitted_date} onChange={(e) => u("submitted_date", e.target.value)} max={new Date().toISOString().split("T")[0]} required />
        </div>
        <PinInput value={form.pin} onChange={(v) => u("pin", v)} />
        <Input label="Notes" value={form.notes} onChange={(e) => u("notes", e.target.value)} />
        <Button type="submit" disabled={loading || !isValidPin(form.pin)} className="w-full mt-1">{loading ? "Adding..." : "Add"}</Button>
      </form>
    </Modal>
  );
}
