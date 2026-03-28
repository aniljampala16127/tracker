"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationFormData, StepId } from "@/lib/types";
import { STEPS, COMMON_COUNTRIES, APPLICATION_SUBCATEGORIES, STREAMS, SPONSOR_STATUSES, PROVINCES, VISA_COUNTRIES, MEI_TYPES, getNextStep } from "@/lib/constants";
import { formatDate, daysBetween, buildStepsMap } from "@/lib/utils";
import { hashPin, isValidPin, savePinForApp, getSavedPinHash, removeSavedPin } from "@/lib/pin";
import { PlusIcon } from "@/components/icons";
import { Button, Modal, Input, Select, SearchableSelect } from "@/components/ui";
import { PinModal, PinInput } from "@/components/PinModal";
import { ClaimPinModal } from "@/components/ClaimPinModal";
import { FilterBar, Filters, EMPTY_FILTERS } from "@/components/FilterBar";
import { StepChart } from "@/components/StepChart";
import { Reactions, ReactionsBadge } from "@/components/Reactions";
import { ShareButtons } from "@/components/ShareButtons";
import { InsightsPanel } from "@/components/InsightsPanel";
import { Confetti } from "@/components/Confetti";
import { AORWaveTracker } from "@/components/AORWaveTracker";
import { NewSinceLastVisit } from "@/components/NewSinceLastVisit";
import { CelebrationWall } from "@/components/CelebrationWall";
import { playMilestoneSound } from "@/lib/sounds";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [celebrateApp, setCelebrateApp] = useState<Application | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
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
      // Fetch updated app with step_events for celebration
      const { data: fullApp } = await supabase.from("applications").select("*, step_events(*)").eq("id", app.id).single();
      setSubmitting(false); setShowAdd(false); fetchApps();
      if (fullApp) setCelebrateApp(fullApp as Application);
    } else {
      setSubmitting(false); setShowAdd(false); fetchApps();
    }
  };

  /** Row click - PIN check or claim */
  const handleRowClick = (app: Application) => {
    if (!app.pin_hash) {
      // No PIN - show claim modal
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

  // Auto-select latest month on first load
  useEffect(() => {
    if (sortedMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
    }
  }, [sortedMonths, selectedMonth]);

  if (loading) return <div className="py-20 text-center text-sand-400 text-sm">Loading...</div>;

  const isFiltered = Object.values(filters).some(Boolean);
  const hasMyEntry = apps.some(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash);

  // Compute teaser stats
  const aorDaysAll: number[] = [];
  apps.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (s.submitted && s.aor) aorDaysAll.push(daysBetween(s.submitted, s.aor));
  });
  const avgAorAll = aorDaysAll.length ? Math.round(aorDaysAll.reduce((a, b) => a + b, 0) / aorDaysAll.length) : null;
  const waitingForAor = apps.filter(a => !a.step_events?.some(e => e.step_id === "aor")).length;

  // Selected month group data
  const selectedGroup = selectedMonth ? monthGroups[selectedMonth] || [] : [];
  const selectedOutland = selectedGroup.filter(a => a.stream === "Outland").length;
  const selectedInland = selectedGroup.filter(a => a.stream === "Inland").length;
  const selectedMonthParts = selectedMonth ? selectedMonth.split("-") : [];
  const selectedMonthLabel = selectedMonthParts.length === 2 ? `${MO[parseInt(selectedMonthParts[1]) - 1]} ${selectedMonthParts[0]}` : "";

  return (
    <div>
      {/* CTA Banner - only for users who haven't added */}
      {!hasMyEntry && (
        <div className="mb-4 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl p-4 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <h3 className="text-sm font-bold mb-0.5">Add yours to unlock predictions</h3>
          <p className="text-[11px] text-white/70 mb-3">See your predicted AOR date, queue position, and how your timeline compares</p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-white text-brand-600 text-xs font-semibold rounded-lg hover:bg-sand-50 transition-all active:scale-[0.98]"
          >
            Add Your Application - 30 sec
          </button>
        </div>
      )}

      {/* Blurred Insights Teaser - only for users who haven't added */}
      {!hasMyEntry && avgAorAll && (
        <div className="mb-4 relative">
          <div className="bg-white border border-sand-200 rounded-xl p-4 blur-[3px] pointer-events-none select-none" aria-hidden="true">
            <div className="space-y-2">
              <div className="bg-sand-50 rounded-lg px-3 py-2.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20V14" /></svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-sand-500 uppercase">Where You Stand</div>
                  <div className="text-sm font-bold text-brand-600">AOR could come any day now</div>
                  <div className="text-[10px] text-sand-400">Community avg: {avgAorAll} days to AOR</div>
                </div>
              </div>
              <div className="bg-sand-50 rounded-lg px-3 py-2.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-warn-light flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9B7420" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /></svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-sand-500 uppercase">Queue Position</div>
                  <div className="text-sm font-bold text-sand-900">#?? of {waitingForAor} waiting for AOR</div>
                </div>
              </div>
              <div className="bg-brand-50 rounded-lg px-3 py-2.5 flex items-center gap-3 border border-brand-200">
                <div className="w-9 h-9 rounded-lg bg-brand-200 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4331" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6V12L16 14" /></svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-brand-700 uppercase">Predicted AOR</div>
                  <div className="text-sm font-bold text-brand-600">~??? ??, 2026</div>
                </div>
              </div>
            </div>
          </div>
          {/* Overlay CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="bg-white/90 border border-sand-200 rounded-xl px-5 py-4 text-center shadow-lg max-w-[260px]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p className="text-xs font-bold text-sand-900 mb-1">Add your entry to unlock</p>
              <p className="text-[10px] text-sand-500 mb-3">Your predicted AOR date, queue position & cohort insights</p>
              <button
                onClick={() => setShowAdd(true)}
                className="px-4 py-2 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-600 transition-all active:scale-[0.98] w-full"
              >
                Add - takes 30 seconds
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Celebration Wall — eCoPR completions */}
      <CelebrationWall apps={apps} />

      {/* New since last visit */}
      {apps.length > 0 && <NewSinceLastVisit apps={apps} />}

      {/* AOR Wave Tracker */}
      {apps.length > 0 && <AORWaveTracker apps={apps} />}

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
        />
      )}

      {/* Bar Chart */}
      {apps.length > 0 && <StepChart apps={filteredApps} />}

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

      {/* Month pills */}
      {sortedMonths.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            {sortedMonths.map((monthKey) => {
              const [y, m] = monthKey.split("-");
              const grp = monthGroups[monthKey];
              const active = selectedMonth === monthKey;
              return (
                <button
                  key={monthKey}
                  onClick={() => setSelectedMonth(monthKey)}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-[0.97] ${
                    active
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-white border border-sand-200 text-sand-600 hover:bg-sand-50"
                  }`}
                >
                  <span className="font-bold">{MO[parseInt(m) - 1]} {y}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-sand-100 text-sand-500"
                  }`}>{grp.length}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected month entries */}
      {selectedMonth && selectedGroup.length > 0 && (
          <div className="bg-white border border-sand-200 rounded-xl overflow-hidden mb-3">
            <div className="px-4 py-2.5 border-b border-sand-100">
              <div className="text-[10px] text-sand-400">
                {selectedGroup.length} {selectedGroup.length === 1 ? "entry" : "entries"}
                <span className="mx-1">·</span>
                {selectedOutland} outland{selectedInland > 0 && <>, {selectedInland} inland</>}
              </div>
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden max-h-[65vh] overflow-y-auto">
              {selectedGroup.map((app) => {
                const stepsMap = buildStepsMap(app.step_events || []);
                const completedSteps = STEPS.filter(s => stepsMap[s.id]);
                const lastStep = completedSteps.length > 0 ? completedSteps[completedSteps.length - 1] : null;
                const daysTotal = stepsMap.submitted && lastStep && stepsMap[lastStep.id]
                  ? daysBetween(stepsMap.submitted, stepsMap[lastStep.id]!)
                  : null;
                const nextStepIdx = completedSteps.length < STEPS.length ? completedSteps.length : null;
                const nextStepLabel = nextStepIdx !== null ? STEPS[nextStepIdx].label : null;
                const statusLabel = app.is_complete ? "eCoPR \u2713" : nextStepLabel ? `Waiting for ${nextStepLabel}` : "Submitted";
                const statusDone = app.is_complete;

                return (
                  <div
                    key={app.id}
                    onClick={() => handleRowClick(app)}
                    className="flex items-center gap-3 px-4 py-3 border-b border-sand-100 active:bg-brand-50/30 cursor-pointer transition-colors"
                  >
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#E8E6E1" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke={statusDone ? "#D4A03C" : "#2D6A4F"} strokeWidth="3"
                          strokeDasharray={`${(completedSteps.length / STEPS.length) * 94} 94`}
                          strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-sand-700">
                        {completedSteps.length}/{STEPS.length}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-sand-900">{app.initials}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${
                          app.stream === "Outland" ? "bg-brand-100 text-brand-600" : "bg-warn-light text-warn-dark"
                        }`}>{app.stream}</span>
                        <ReactionsBadge applicationId={app.id} />
                      </div>
                      <div className="text-[10px] text-sand-500 mt-0.5">
                        {app.country_origin} · {app.sponsor_status}
                        {stepsMap.submitted && <span> · {formatDate(stepsMap.submitted)}</span>}
                      </div>
                      <div className={`text-[10px] font-medium mt-0.5 ${statusDone ? "text-warn-dark" : "text-brand-600"}`}>
                        {statusLabel}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {daysTotal != null && daysTotal > 0 && (
                        <div className="text-xs font-semibold text-sand-700">{daysTotal}d</div>
                      )}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B0ADA6" strokeWidth="2" strokeLinecap="round" className="ml-auto mt-0.5"><path d="M9 18L15 12L9 6" /></svg>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-auto max-h-[70vh]">
              <div className="hidden sm:block border-t border-sand-100 overflow-auto max-h-[70vh]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-20 bg-sand-50">
                    <tr className="bg-sand-50 text-[8px] font-semibold text-sand-500 uppercase tracking-wider">
                      <th className="text-left px-3 py-2 sticky left-0 bg-sand-50 z-30">Name</th>
                      <th className="text-left px-1.5 py-2 bg-sand-50">Sponsor Status</th>
                      <th className="text-left px-1.5 py-2 bg-sand-50">PA Country</th>
                      <th className="text-left px-1.5 py-2 bg-sand-50">PA Visa Country</th>
                      <th className="text-center px-1.5 py-2 bg-sand-50">Class</th>
                      <th className="text-left px-1.5 py-2 bg-sand-50">App Type</th>
                      <th className="text-left px-1.5 py-2 bg-sand-50">Submitted</th>
                      <th className="text-center px-1 py-2 bg-sand-50">AOR</th>
                      <th className="text-center px-1 py-2 bg-sand-50">BIL</th>
                      <th className="text-center px-1 py-2 bg-sand-50">MEI Req/Upfront</th>
                      <th className="text-center px-1 py-2 bg-sand-50">Sponsor Eligibility</th>
                      <th className="text-center px-1 py-2 bg-sand-50">Medical Update</th>
                      <th className="text-center px-1 py-2 bg-sand-50">PA Eligibility</th>
                      <th className="text-center px-1 py-2 bg-sand-50">Pre-Arrival</th>
                      <th className="text-center px-1 py-2 bg-sand-50">Background Verification</th>
                      <th className="text-center px-1 py-2 bg-sand-50">Portal 1</th>
                      <th className="text-center px-1 py-2 bg-sand-50">Portal 2</th>
                      <th className="text-center px-1 py-2 bg-sand-50">eCoPR</th>
                      <th className="text-center px-1.5 py-2 w-8 bg-sand-50">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline text-sand-400">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroup.map((app) => {
                      const stepsMap = buildStepsMap(app.step_events || []);
                      const hasPin = !!app.pin_hash;
                      const isOwner = hasPin && getSavedPinHash(app.id) === app.pin_hash;
                      return (
                        <tr key={app.id}
                          className="border-t border-sand-100 hover:bg-brand-50/30 cursor-pointer transition-colors"
                          onClick={() => handleRowClick(app)}
                        >
                          <td className="px-3 py-2 font-semibold text-sand-900 whitespace-nowrap sticky left-0 bg-white">{app.initials}<ReactionsBadge applicationId={app.id} /></td>
                          <td className="px-1.5 py-2 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              app.sponsor_status === "Citizen" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                            }`}>{app.sponsor_status}</span>
                          </td>
                          <td className="px-1.5 py-2 text-sand-700 text-xs whitespace-nowrap">{app.country_origin}</td>
                          <td className="px-1.5 py-2 text-sand-500 text-[10px] whitespace-nowrap max-w-[90px] truncate" title={app.visa_country || ""}>{app.visa_country || ""}</td>
                          <td className="px-1.5 py-2 text-center text-sand-500 text-[10px]">Family</td>
                          <td className="px-1.5 py-2 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              app.stream === "Outland" ? "bg-brand-100 text-brand-600" : "bg-warn-light text-warn-dark"
                            }`}>{app.stream}</span>
                          </td>
                          <td className="px-1.5 py-2 text-xs text-sand-600 whitespace-nowrap">{formatDate(stepsMap.submitted)}</td>
                          {STEPS.slice(1).map((step, stepIdx) => {
                            const date = stepsMap[step.id];
                            const prevStep = STEPS[STEPS.findIndex(s => s.id === step.id) - 1];
                            const prevDate = stepsMap[prevStep.id];
                            const days = date && prevDate ? daysBetween(prevDate, date) : null;

                            // Insert MEI column after BIL
                            const meiCol = step.id === "sponsor_eligibility" ? (
                              <td key="mei" className="px-1 py-2 text-center whitespace-nowrap">
                                {app.mei_type ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                    app.mei_type === "Upfront" ? "bg-brand-100 text-brand-700" : "bg-warn-light text-warn-dark"
                                  }`}>{app.mei_type}</span>
                                ) : <span className="text-sand-200">·</span>}
                              </td>
                            ) : null;

                            return (
                              <React.Fragment key={step.id}>
                                {meiCol}
                                <td className="px-1 py-2 text-center whitespace-nowrap">
                                  {date ? (
                                    <div>
                                      <div className="text-[10px] text-brand-600 font-bold">{days}d</div>
                                      <div className="text-[8px] text-sand-400">{formatDate(date).replace(/, \d{4}/, "")}</div>
                                    </div>
                                  ) : (
                                    <span className="text-sand-200">·</span>
                                  )}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className="px-1.5 py-2 text-center">
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
                              <span title="Unclaimed - click to claim" className="text-[9px] text-warn font-medium">open</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-brand-50/50 border-t border-brand-200">
                      <td className="px-3 py-2 font-bold text-[10px] text-brand-700 sticky left-0 bg-brand-50/50" colSpan={7}>Avg</td>
                      {STEPS.slice(1).map((step, i) => {
                        const prev = STEPS[i];
                        const durations: number[] = [];
                        selectedGroup.forEach(a => {
                          const s = buildStepsMap(a.step_events || []);
                          if (s[prev.id] && s[step.id]) durations.push(daysBetween(s[prev.id]!, s[step.id]!));
                        });
                        const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

                        // Insert MEI avg placeholder before sponsor_eligibility
                        const meiAvg = step.id === "sponsor_eligibility" ? (
                          <td key="mei-avg" className="px-1 py-2 text-center"><span className="text-sand-300 text-[10px]">-</span></td>
                        ) : null;

                        return (
                          <React.Fragment key={step.id}>
                            {meiAvg}
                            <td className="px-1 py-2 text-center">
                              {avg != null ? <span className="text-[10px] font-bold text-brand-600">{avg}d</span> : <span className="text-sand-300 text-[10px]">-</span>}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
      )}


      <p className="text-[9px] text-sand-400 mt-3 text-center">
        Click any row to update steps · PIN required to edit · Unclaimed entries can be claimed
      </p>

      <AddModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} loading={submitting} />
      {editApp && <EditModal app={editApp} allApps={apps} onClose={() => setEditApp(null)} onMarkStep={handleMarkStep} onDelete={handleDelete} />}

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
      {celebrateApp && (
        <CelebrationModal
          app={celebrateApp}
          allApps={apps}
          onClose={() => setCelebrateApp(null)}
        />
      )}
    </div>
  );
}

// ============================================
// Edit modal
// ============================================
function EditModal({ app, allApps, onClose, onMarkStep, onDelete }: {
  app: Application; allApps: Application[]; onClose: () => void;
  onMarkStep: (appId: string, stepId: StepId, date: string) => void;
  onDelete: (appId: string) => void;
}) {
  const stepsMap = buildStepsMap(app.step_events || []);
  const [stepDate, setStepDate] = useState("");
  const [activeStep, setActiveStep] = useState<StepId | null>(null);
  const [meiType, setMeiType] = useState(app.mei_type || "");
  const [showConfetti, setShowConfetti] = useState(false);
  const nextStep = getNextStep(app.current_step);
  const supabase = createClient();

  const handleMeiChange = async (val: string) => {
    setMeiType(val);
    await supabase.from("applications").update({ mei_type: val || null }).eq("id", app.id);
  };

  const handleStepSave = (stepId: StepId, date: string) => {
    if (navigator.vibrate) navigator.vibrate(12);
    playMilestoneSound();
    onMarkStep(app.id, stepId, date);
    setShowConfetti(true);
  };

  return (
    <Modal open={true} onClose={onClose} title={`${app.initials} - ${app.country_origin}`}>
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      <div className="flex flex-wrap gap-2 text-xs text-sand-500 mb-3">
        <span>{app.sponsor_status}</span><span>·</span><span>{app.stream}</span>
        {app.visa_country && <><span>·</span><span>{app.visa_country}</span></>}
        {app.subcategory && <><span>·</span><span>{app.subcategory}</span></>}
        {app.notes && <><span>·</span><span className="italic">{app.notes}</span></>}
      </div>

      {/* Insights Panel */}
      <InsightsPanel app={app} allApps={allApps} />

      {/* MEI / Medical Exam */}
      <div className="bg-sand-50 rounded-lg px-3 py-2.5 mb-3">
        <div className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider mb-1.5">Medical Exam (MEI)</div>
        <div className="flex gap-2">
          {["Upfront", "Request", ""].map((opt) => (
            <button
              key={opt || "none"}
              onClick={() => handleMeiChange(opt)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                meiType === opt
                  ? opt === "Upfront" ? "bg-brand-500 text-white" : opt === "Request" ? "bg-warn text-white" : "bg-sand-300 text-sand-700"
                  : "bg-white border border-sand-200 text-sand-500 hover:bg-sand-100"
              }`}
            >
              {opt || "Not set"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {STEPS.map((step, i) => {
          const date = stepsMap[step.id];
          const prevDate = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
          const days = date && prevDate ? daysBetween(prevDate, date) : null;
          const isNext = step.id === nextStep;
          const isDone = !!date;

          return (
            <React.Fragment key={step.id}>
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isDone ? "bg-brand-50/50" : isNext ? "bg-warn-light/30" : "opacity-40"}`}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isDone ? "bg-brand-500" : isNext ? "bg-warn" : "bg-sand-200"}`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-sand-900">{step.label}</div>
                {isDone && (
                  <div className="text-xs text-sand-500">
                    {formatDate(date)}{days != null && i > 0 && <span className="text-brand-500 font-semibold ml-1">({days}d)</span>}
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
                      onKeyDown={(e) => { if (e.key === "Enter" && stepDate) { handleStepSave(step.id, stepDate); setStepDate(""); setActiveStep(null); }}} />
                  ) : null}
                  {activeStep === step.id && stepDate ? (
                    <button className="text-xs bg-brand-500 text-white px-3 py-1 rounded-md font-medium hover:bg-brand-600"
                      onClick={() => { handleStepSave(step.id, stepDate); setStepDate(""); setActiveStep(null); }}>Save</button>
                  ) : activeStep !== step.id ? (
                    <button className="text-xs bg-warn text-white px-3 py-1 rounded-md font-medium hover:bg-warn-dark"
                      onClick={() => setActiveStep(step.id)}>Update</button>
                  ) : null}
                </div>
              )}
              {isDone && (
                <div className="flex items-center gap-1">
                  <Reactions applicationId={app.id} stepId={step.id} compact />
                  <span className="text-brand-500 text-xs">✓</span>
                </div>
              )}
            </div>
            {isDone && (
              <div className="pl-9 -mt-1 mb-1">
                <Reactions applicationId={app.id} stepId={step.id} />
              </div>
            )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Share */}
      <div className="mt-4 pt-3 border-t border-sand-100">
        <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Share this timeline</div>
        <ShareButtons app={app} />
      </div>

      <button onClick={() => onDelete(app.id)} className="mt-3 text-xs text-error hover:text-error-dark transition-colors">
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

// ============================================
// Post-add celebration modal
// ============================================
function CelebrationModal({ app, allApps, onClose }: {
  app: Application; allApps: Application[]; onClose: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(true);
  const stepsMap = buildStepsMap(app.step_events || []);
  const submittedDate = stepsMap.submitted;

  // Position
  const position = allApps.length;

  // AOR prediction
  const streamApps = allApps.filter(a => a.stream === app.stream);
  const aorDays: number[] = [];
  streamApps.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (s.submitted && s.aor) aorDays.push(daysBetween(s.submitted, s.aor));
  });
  const avgAor = aorDays.length ? Math.round(aorDays.reduce((a, b) => a + b, 0) / aorDays.length) : null;

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let aorPrediction = "";
  if (avgAor && submittedDate) {
    const d = new Date(submittedDate + "T00:00:00");
    d.setDate(d.getDate() + avgAor);
    aorPrediction = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  // Same week cohort
  const sameWeek = allApps.filter(a => {
    if (a.id === app.id) return false;
    const s = buildStepsMap(a.step_events || []);
    if (!s.submitted || !submittedDate) return false;
    const diff = Math.abs(new Date(s.submitted + "T00:00:00").getTime() - new Date(submittedDate + "T00:00:00").getTime());
    return diff < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <Modal open={true} onClose={onClose} title="">
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
      <div className="text-center py-2">
        <h2 className="text-xl font-bold text-sand-900 mb-1">You&apos;re in! 🎉</h2>
        <p className="text-sm text-sand-500 mb-5">
          Application #{position} in the community
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {avgAor && aorPrediction && (
            <div className="bg-brand-50 rounded-xl p-3 text-center col-span-2">
              <div className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider">Predicted AOR</div>
              <div className="text-lg font-bold text-brand-600">~{aorPrediction}</div>
              <div className="text-[10px] text-brand-500">Based on {app.stream} avg of {avgAor} days</div>
            </div>
          )}
          <div className="bg-sand-50 rounded-xl p-3 text-center">
            <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Queue Position</div>
            <div className="text-lg font-bold text-sand-900">#{streamApps.filter(a => !a.step_events?.some(e => e.step_id === "aor")).length}</div>
            <div className="text-[10px] text-sand-400">waiting for AOR</div>
          </div>
          <div className="bg-sand-50 rounded-xl p-3 text-center">
            <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Same Week</div>
            <div className="text-lg font-bold text-sand-900">{sameWeek.length}</div>
            <div className="text-[10px] text-sand-400">submitted same week</div>
          </div>
        </div>

        <div className="space-y-2">
          <a href="/me" className="block w-full px-4 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-all active:scale-[0.98]">
            View My Dashboard
          </a>
          <button onClick={onClose} className="w-full px-4 py-2.5 text-sand-500 text-sm font-medium hover:text-sand-700 transition-colors">
            Stay on Tracker
          </button>
        </div>
      </div>
    </Modal>
  );
}
