"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Application, StepId, StepDefinition } from "@/lib/types";
import { STEPS, getStepIndex, getVisibleSteps } from "@/lib/constants";
import { formatDate, daysBetween, buildStepsMap } from "@/lib/utils";
import { getSavedPinHash } from "@/lib/pin";
import { Confetti } from "@/components/Confetti";
import { PositionRunway } from "@/components/PositionRunway";
import { playMilestoneSound } from "@/lib/sounds";
import { TimelineExport } from "@/components/TimelineExport";
import { MeSkeleton } from "@/components/Skeletons";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Button } from "@/components/ui";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatNice(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function MyAppPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [myApps, setMyApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, []);

  const fetchApps = useCallback(async (bustCache = false) => {
    const url = bustCache ? `/api/applications?t=${Date.now()}` : "/api/applications";
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) {
      const all = data as Application[];
      setApps(all);
      const mine = all.filter(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash);
      setMyApps(mine);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  if (loading) return <MeSkeleton />;

  if (myApps.length === 0) {
    return (
      <div className="py-12">
        <div className="text-center bg-white border border-sand-200 rounded-2xl p-8 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-sand-900 mb-2">No entries linked to this device</h2>
          <p className="text-sm text-sand-500 mb-4">
            Add your application on the Tracker page, or claim an existing entry. Your personal dashboard will appear here automatically.
          </p>
          <a href="/dashboard">
            <Button>Go to Tracker</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => { await fetchApps(); }}>
    <div className="page-enter">

      {myApps.map((app) => (
        <MyAppCard key={app.id} app={app} allApps={apps} onRefresh={fetchApps} />
      ))}
    </div>
    </PullToRefresh>
  );
}

function MyAppCard({ app, allApps, onRefresh }: { app: Application; allApps: Application[]; onRefresh: () => void }) {
  const stepsMap = buildStepsMap(app.step_events || []);
  const submittedDate = stepsMap.submitted;
  const visibleSteps = getVisibleSteps(app.stream);
  const currentIdx = getStepIndex(app.current_step);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [stepDate, setStepDate] = useState("");
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  // Completed steps (stream-filtered)
  const completedStepIds = visibleSteps.filter(s => stepsMap[s.id]).map(s => s.id);

  // Next step to complete (first incomplete in visible steps, after submitted)
  const nextStepDef = visibleSteps.find(s => s.id !== "submitted" && !stepsMap[s.id]);
  const nextStepId = nextStepDef?.id || null;
  // Latest completed (for highlight, not for restriction)
  const latestCompletedId = completedStepIds.length > 0 ? completedStepIds[completedStepIds.length - 1] : null;

  const handleSaveStep = async (stepId: string, date: string) => {
    setSaving(true);
    if (navigator.vibrate) navigator.vibrate(12);
    playMilestoneSound();
    const pinHash = getSavedPinHash(app.id);
    const res = await fetch("/api/steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: app.id, step_id: stepId, event_date: date, pin_hash: pinHash || "" }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to save step");
      setSaving(false);
      return;
    }
    setShowConfetti(true);
    setActiveStep(null);
    setStepDate("");
    setSaving(false);
    onRefresh();
  };

  const handleUndoStep = async (stepId: string) => {
    if (!confirm("Remove this step? This will revert your progress.")) return;
    setUndoing(true);
    try {
      const pinHash = getSavedPinHash(app.id);
      const res = await fetch(`/api/steps?application_id=${app.id}&step_id=${stepId}&pin_hash=${pinHash || ""}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to undo step");
      }
    } catch (e) {
      alert("Network error — try again");
    }
    setUndoing(false);
    onRefresh();
  };

  const handleEditStep = async (stepId: string, newDate: string) => {
    setSaving(true);
    const pinHash = getSavedPinHash(app.id);
    const res = await fetch("/api/steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: app.id, step_id: stepId, event_date: newDate, pin_hash: pinHash || "" }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to edit step");
    }
    setEditingStep(null);
    setEditDate("");
    setSaving(false);
    onRefresh();
  };

  // Compute AOR prediction
  const streamApps = allApps.filter(a => a.stream === app.stream);
  const aorDays: number[] = [];
  streamApps.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (s.submitted && s.aor) aorDays.push(daysBetween(s.submitted, s.aor));
  });
  const avgAor = aorDays.length ? Math.round(aorDays.reduce((a, b) => a + b, 0) / aorDays.length) : null;
  const aorPrediction = !stepsMap.aor && avgAor && submittedDate ? addDays(submittedDate, avgAor) : null;

  // Days since submitted
  const today = new Date().toISOString().split("T")[0];
  const daysSoFar = submittedDate ? daysBetween(submittedDate, today) : 0;

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    initials: app.initials, country_origin: app.country_origin,
    stream: app.stream as string, sponsor_status: app.sponsor_status as string,
    province: app.province || "Outside Quebec",
  });

  const handleEditSave = async () => {
    setSaving(true);
    const pinHash = getSavedPinHash(app.id);
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: app.id, pin_hash: pinHash || "",
        initials: editForm.initials.trim(), country_origin: editForm.country_origin,
        stream: editForm.stream, sponsor_status: editForm.sponsor_status,
        province: editForm.province,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to save");
    }
    setSaving(false);
    setEditing(false);
    onRefresh();
  };

  return (
    <div className="bg-white border border-sand-200 rounded-2xl p-5 mb-5">
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* 1. Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-lg">
          {app.initials.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-sand-900">{app.initials}</h2>
            <button onClick={() => { setEditing(!editing); if (!editing) setTimelineExpanded(false); }}
              className="text-[10px] text-brand-500 font-medium px-2 py-0.5 rounded-full border border-brand-200 hover:bg-brand-50 transition-colors">
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>
          <p className="text-xs text-sand-500">
            {app.country_origin} · {app.sponsor_status} · {app.stream}
            {app.province === "Quebec" ? " · Inside Quebec" : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-brand-600">Day {daysSoFar}</div>
          <div className="text-[9px] text-sand-400">{submittedDate ? formatNice(submittedDate) : "—"}</div>
        </div>
      </div>

      {/* Inline Edit Form — cleaner, more spacious */}
      {editing && (
        <div className="bg-sand-50 rounded-xl p-4 mb-3 border border-sand-200">
          <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-3">Edit Details</div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-sand-500 font-medium mb-1 block">Name</label>
              <input className="w-full px-3 py-2.5 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                value={editForm.initials} onChange={(e) => setEditForm(p => ({ ...p, initials: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] text-sand-500 font-medium mb-1 block">PA Country</label>
              <input className="w-full px-3 py-2.5 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                value={editForm.country_origin} onChange={(e) => setEditForm(p => ({ ...p, country_origin: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-sand-500 font-medium mb-1 block">Sponsor Status</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  value={editForm.sponsor_status} onChange={(e) => setEditForm(p => ({ ...p, sponsor_status: e.target.value }))}>
                  <option value="PR">PR</option><option value="Citizen">Citizen</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-sand-500 font-medium mb-1 block">Stream</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  value={editForm.stream} onChange={(e) => setEditForm(p => ({ ...p, stream: e.target.value }))}>
                  <option value="Outland">Outland</option><option value="Inland">Inland</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-sand-500 font-medium mb-1 block">Quebec</label>
              <select className="w-full px-3 py-2.5 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                value={editForm.province} onChange={(e) => setEditForm(p => ({ ...p, province: e.target.value }))}>
                <option value="Outside Quebec">Outside Quebec</option><option value="Quebec">Inside Quebec</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleEditSave} disabled={saving || !editForm.initials.trim() || !editForm.country_origin}
                className="flex-1 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50 active:scale-[0.98]">
                {saving ? "..." : "Save"}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-5 py-2.5 rounded-lg border border-sand-200 text-sm text-sand-500 font-medium hover:bg-sand-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Timeline — always visible, below edit if open */}
      <TimelineSection app={app} stepsMap={stepsMap} currentIdx={currentIdx} nextStepId={nextStepId}
        latestCompletedId={latestCompletedId} activeStep={activeStep} setActiveStep={setActiveStep}
        stepDate={stepDate} setStepDate={setStepDate} handleSaveStep={handleSaveStep}
        handleUndoStep={handleUndoStep} handleEditStep={handleEditStep}
        editingStep={editingStep} setEditingStep={setEditingStep} editDate={editDate} setEditDate={setEditDate}
        saving={saving} undoing={undoing} visibleSteps={visibleSteps}
        expanded={timelineExpanded} setExpanded={(v: boolean) => { setTimelineExpanded(v); if (v) setEditing(false); }} />

      {/* 3. Next Step Estimate — works for ALL steps */}
      <NextStepEstimate app={app} allApps={allApps} />

      {/* 3. Queue Position */}
      <PositionRunway app={app} allApps={allApps} />

      {/* 3.5 Submission Week Cohort */}
      {submittedDate && (() => {
        const subDate = new Date(submittedDate + "T00:00:00");
        const day = subDate.getDay();
        const weekStart = new Date(subDate);
        weekStart.setDate(weekStart.getDate() - day);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const sameWeek = allApps.filter(a => {
          if (a.id === app.id) return false;
          const s = buildStepsMap(a.step_events || []);
          if (!s.submitted) return false;
          const d = new Date(s.submitted + "T00:00:00");
          return d >= weekStart && d <= weekEnd;
        });
        const withAor = sameWeek.filter(a => a.step_events?.some(e => e.step_id === "aor"));
        if (sameWeek.length === 0) return null;
        return (
          <a href={`/cohort/${app.id}`} className="block bg-sand-50 rounded-xl px-3 py-2.5 mb-3 hover:bg-sand-100 transition-colors active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sand-200 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#65635D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21V19C23 17.5 22 16.2 20.6 15.8"/><path d="M16.5 3.1C17.9 3.6 19 5 19 6.5C19 8 17.9 9.4 16.5 9.9"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Your Submission Week</div>
                <div className="text-sm font-bold text-sand-900">{sameWeek.length} others submitted the same week</div>
                <div className="text-[10px] text-sand-400">
                  {withAor.length > 0 ? `${withAor.length} have AOR` : "None have AOR yet"}
                  {" · "}
                  {sameWeek.slice(0, 4).map(a => a.initials).join(", ")}{sameWeek.length > 4 ? "..." : ""}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A69E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M9 18L15 12L9 6"/>
              </svg>
            </div>
          </a>
        );
      })()}

      {/* Support card */}
      <div className="bg-gradient-to-br from-sand-50 to-white border border-sand-200 rounded-xl p-4 mt-1">
        <div className="text-center">
          <div className="text-sm font-semibold text-sand-800 mb-1">Built for the sponsorship community</div>
          <p className="text-[11px] text-sand-500 mb-3 leading-relaxed">
            SponsorTrack is free and always will be. If it helped ease your wait, consider supporting its development.
          </p>
          <a
            href="https://buymeacoffee.com/aniljampala"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFDD00] text-[#000000] text-xs font-bold hover:bg-[#e6c800] transition-all active:scale-[0.98] shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            Buy me a coffee
          </a>
        </div>
      </div>
    </div>
  );
}

// Next Step Estimate — works for ALL steps, not just AOR
function NextStepEstimate({ app, allApps }: { app: Application; allApps: Application[] }) {
  const data = useMemo(() => {
    const stepsMap = buildStepsMap(app.step_events || []);
    if (app.is_complete) return null;

    const visSteps = getVisibleSteps(app.stream);

    // Find the FIRST incomplete step by position (skipping submitted)
    let nextIdx = -1;
    for (let i = 1; i < visSteps.length; i++) {
      if (!stepsMap[visSteps[i].id]) { nextIdx = i; break; }
    }
    if (nextIdx < 0) return null;

    // Find the base: step right before the incomplete one, or walk back to find
    // the most recent completed step with a date
    let baseStep = null;
    let baseDate: string | null = null;
    for (let i = nextIdx - 1; i >= 0; i--) {
      if (stepsMap[visSteps[i].id]) {
        baseStep = visSteps[i];
        baseDate = stepsMap[visSteps[i].id];
        break;
      }
    }
    if (!baseStep || !baseDate) return null;

    // If we have a later completed step with a more recent date, use that instead
    // (handles out-of-order: BG done Feb 27, but PA done March 13)
    for (let i = nextIdx + 1; i < visSteps.length; i++) {
      const d = stepsMap[visSteps[i].id];
      if (d && d > baseDate) {
        baseStep = visSteps[i];
        baseDate = d;
      }
    }

    const nextStep = visSteps[nextIdx];
    const today = new Date().toISOString().split("T")[0];
    const daysSinceCurrent = daysBetween(baseDate, today);

    // Calculate community average for base -> next step
    const durations: number[] = [];
    allApps.forEach(a => {
      if (a.stream !== app.stream) return;
      const s = buildStepsMap(a.step_events || []);
      const from = s[baseStep!.id];
      const to = s[nextStep.id];
      if (from && to) {
        const d = daysBetween(from, to);
        if (d >= 0 && d <= 200) durations.push(d);
      }
    });

    if (durations.length < 1) return null;

    const avgDays = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const daysLeft = avgDays - daysSinceCurrent;
    const predictedDate = new Date(baseDate + "T00:00:00");
    predictedDate.setDate(predictedDate.getDate() + avgDays);
    const predictedStr = predictedDate.toISOString().split("T")[0];

    return {
      currentStep: baseStep!.label,
      nextStep: nextStep.label,
      daysSinceCurrent,
      avgDays,
      daysLeft,
      predictedDate: predictedStr,
      sampleSize: durations.length,
    };
  }, [app, allApps]);

  if (!data) return null;

  const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate = (d: string) => { const dt = new Date(d + "T00:00:00"); return `${MO[dt.getMonth()]} ${dt.getDate()}`; };

  const isImminent = data.daysLeft <= 0;
  const isClose = data.daysLeft > 0 && data.daysLeft <= 5;
  const pct = Math.min(Math.round((data.daysSinceCurrent / data.avgDays) * 100), 100);

  return (
    <div className={`rounded-xl p-4 mb-3 border transition-all ${
      isImminent ? "bg-gradient-to-r from-brand-100 to-brand-200 border-brand-300"
      : isClose ? "bg-gradient-to-r from-brand-50 to-brand-100 border-brand-200"
      : "bg-white border-sand-200"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">
          Next: {data.nextStep}
        </div>
        <div className="text-[9px] text-sand-400">{data.sampleSize} {data.sampleSize === 1 ? "report" : "reports"}{data.sampleSize < 5 ? " · limited data" : ""}</div>
      </div>

      {isImminent ? (
        <div className="text-center py-1">
          <div className="text-xl font-bold text-brand-600 animate-pulse">Any day now!</div>
          <div className="text-[10px] text-brand-500 mt-0.5">
            Past the {data.avgDays}-day average · Day {data.daysSinceCurrent} since {data.currentStep}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-3xl font-bold tabular-nums ${isClose ? "text-brand-600" : "text-sand-900"}`}>
              {data.daysLeft}
            </span>
            <span className="text-xs text-sand-500">days left</span>
            <span className="text-[10px] text-sand-400 ml-auto">~{fmtDate(data.predictedDate)}</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-sand-100 overflow-hidden">
            <div className="h-full rounded-full bg-brand-500 transition-all duration-700"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-sand-400">{data.currentStep} · Day {data.daysSinceCurrent}</span>
            <span className="text-[9px] text-sand-400">avg {data.avgDays}d</span>
          </div>
        </div>
      )}
    </div>
  );
}

// GCKey inline step with expandable setup guide
function GCKeyInlineStep({ appId, gckeyDone, toggleGckey }: {
  appId: string; gckeyDone: boolean; toggleGckey: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const GCKEY_STEPS = [
    { text: "Go to IRCC account page → \"Sign in with GCKey\"", link: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/account.html" },
    { text: "Create an account with your email" },
    { text: "Complete all security questions" },
    { text: "Click \"Link Application\" in the table" },
    { text: "Select \"Application number and family name\"" },
    { text: "Enter family name with a space in front", highlight: true },
    { text: "Enter application number and other details" },
    { text: "Enter 2 for \"number of people\"" },
    { text: "Submit → should show \"account found\" → Link" },
  ];

  const TRACKER_STEPS = [
    { text: "Go to IRCC Tracker registration", link: "https://ircc-tracker-suivi.apps.cic.gc.ca/en/register" },
    { text: "Enter UCI (from your GCKey account)" },
    { text: "Enter Application Number" },
    { text: "Enter names and Date of Birth exactly as in application" },
    { text: "Submit → application linked to tracker" },
  ];

  if (gckeyDone) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg mx-1 mt-1 mb-1 bg-brand-50">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17L4 12" /></svg>
        <span className="text-xs text-brand-600 flex-1">GCKey & IRCC Tracker set up</span>
        <button onClick={toggleGckey} className="text-[9px] text-sand-400">Undo</button>
      </div>
    );
  }

  return (
    <div className="mx-1 mt-1 mb-1 rounded-lg border border-brand-200 bg-brand-50/50 overflow-hidden">
      {/* Header — tap to expand */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16V12M12 8H12.01"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-brand-700">Set up GCKey & IRCC Tracker</div>
          <div className="text-[9px] text-brand-500">Tap to see setup steps</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A8880" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "transform 0.3s ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>

      {/* Expandable content */}
      <div style={{
        maxHeight: expanded ? "600px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="px-3 pb-3" style={{ opacity: expanded ? 1 : 0, transition: "opacity 0.2s ease", transitionDelay: expanded ? "0.1s" : "0s" }}>
          {/* GCKey steps */}
          <div className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-1.5">1. GCKey Setup</div>
          <div className="space-y-1 mb-3">
            {GCKEY_STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[9px] text-brand-400 mt-0.5 flex-shrink-0">{i + 1}.</span>
                <div className="text-[10px] text-sand-800 leading-relaxed">
                  {s.link ? (
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="underline">{s.text}</a>
                  ) : s.text}
                  {s.highlight && <span className="text-[8px] bg-warn-light text-warn-dark px-1 rounded ml-1">Important</span>}
                </div>
              </div>
            ))}
          </div>

          {/* IRCC Tracker steps */}
          <div className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-1.5">2. IRCC Tracker</div>
          <div className="space-y-1 mb-3">
            {TRACKER_STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[9px] text-brand-400 mt-0.5 flex-shrink-0">{i + 1}.</span>
                <div className="text-[10px] text-sand-800 leading-relaxed">
                  {s.link ? (
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="underline">{s.text}</a>
                  ) : s.text}
                </div>
              </div>
            ))}
          </div>

          {/* Mark done button */}
          <button onClick={toggleGckey}
            className="w-full text-center text-xs font-semibold text-white bg-brand-500 rounded-lg py-2 hover:bg-brand-600 transition-colors active:scale-[0.98]">
            Mark as Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Collapsible Timeline with inline GCKey after AOR
function TimelineSection({ app, stepsMap, currentIdx, nextStepId, latestCompletedId,
  activeStep, setActiveStep, stepDate, setStepDate, handleSaveStep, handleUndoStep,
  handleEditStep, editingStep, setEditingStep, editDate, setEditDate,
  saving, undoing, visibleSteps, expanded, setExpanded,
}: {
  app: Application; stepsMap: Record<string, string | null>; currentIdx: number;
  nextStepId: string | null; latestCompletedId: string | null;
  activeStep: string | null; setActiveStep: (s: string | null) => void;
  stepDate: string; setStepDate: (s: string) => void;
  handleSaveStep: (stepId: string, date: string) => void;
  handleUndoStep: (stepId: string) => void;
  handleEditStep: (stepId: string, date: string) => void;
  editingStep: string | null; setEditingStep: (s: string | null) => void;
  editDate: string; setEditDate: (s: string) => void;
  saving: boolean; undoing: boolean;
  visibleSteps: StepDefinition[];
  expanded: boolean; setExpanded: (v: boolean) => void;
}) {
  const [gckeyDone, setGckeyDone] = useState(false);
  const hasAor = !!stepsMap.aor;
  const completedCount = visibleSteps.filter(s => stepsMap[s.id]).length;
  const nextStep = nextStepId ? visibleSteps.find(s => s.id === nextStepId) : null;

  useEffect(() => {
    const saved = localStorage.getItem(`gckey-done-${app.id}`);
    if (saved === "true") setGckeyDone(true);
  }, [app.id]);

  const toggleGckey = () => {
    const next = !gckeyDone;
    setGckeyDone(next);
    localStorage.setItem(`gckey-done-${app.id}`, String(next));
  };

  return (
    <div className="border border-sand-200 rounded-xl mb-3 overflow-hidden bg-sand-50/30">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Your Timeline</span>
            <span className="text-[10px] font-bold text-brand-600">{completedCount}/{visibleSteps.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <TimelineExport app={app} />
          </div>
        </div>

        {nextStep && !expanded && (
          <button
            onClick={() => { setExpanded(true); const t = new Date().toISOString().split("T")[0]; setStepDate(t); setTimeout(() => setActiveStep(nextStep.id), 100); }}
            className="w-full flex items-center gap-3 mt-2 px-3 py-2.5 rounded-lg bg-warn-light border border-warn/20 active:scale-[0.98] transition-all">
            <div className="w-2.5 h-2.5 rounded-full bg-warn animate-pulse flex-shrink-0" />
            <span className="text-sm font-medium text-sand-900 flex-1 text-left">{nextStep.label}</span>
            <span className="text-xs bg-warn text-white px-3 py-1 rounded-lg font-medium">Update</span>
          </button>
        )}
        {!nextStep && app.is_complete && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-brand-50 text-center">
            <span className="text-xs font-medium text-brand-600">All steps complete!</span>
          </div>
        )}
      </div>

      {/* Expand/collapse toggle */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 border-t border-sand-100 text-[10px] text-sand-400 font-medium hover:text-sand-600 transition-colors">
        {expanded ? "Hide steps" : "View all steps"}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "transform 0.3s ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>

      {/* Expandable body */}
      <div style={{
        maxHeight: expanded ? "2000px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="px-4 pb-4" style={{
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.25s ease",
          transitionDelay: expanded ? "0.1s" : "0s",
        }}>
          <div className="space-y-1">
            {visibleSteps.map((step, i) => {
              const date = stepsMap[step.id];
              const prevStep = i > 0 ? visibleSteps[i - 1] : null;
              const prevDate = prevStep ? stepsMap[prevStep.id] : null;
              const days = date && prevDate ? daysBetween(prevDate, date) : null;
              const isDone = !!date;
              const isIncomplete = !date && step.id !== "submitted";

              return (
                <div key={step.id}>
                  <div className={`flex items-center gap-3 rounded-lg transition-all ${
                    isDone ? "px-3 py-2 bg-brand-50" : isIncomplete ? "px-3 py-2 bg-white border border-sand-100" : "px-3 py-1"
                  }`}>
                    <div className={`flex-shrink-0 rounded-full ${
                      isDone ? "w-2.5 h-2.5 bg-brand-500" : isIncomplete ? "w-2 h-2 bg-sand-300 border border-sand-400" : "w-1.5 h-1.5 bg-sand-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium ${isDone ? "text-sm text-sand-900" : isIncomplete ? "text-xs text-sand-600" : "text-[11px] text-sand-400"}`}>{step.label}</span>
                      {isIncomplete && <div className="text-[9px] text-sand-400">{step.hint}</div>}
                    </div>

                    {/* Completed: date + edit + undo */}
                    {isDone && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-medium text-sand-700">{formatNice(date!).replace(/, \d{4}/, "")}</div>
                          {days != null && i > 0 && <div className="text-[9px] text-brand-500 font-semibold">{days}d</div>}
                        </div>
                        {step.id !== "submitted" && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => { setEditingStep(step.id); setEditDate(date!); }}
                              className="text-[10px] px-2 py-1 rounded-md bg-sand-100 text-sand-500 font-medium hover:bg-sand-200 transition-colors min-h-[28px]">
                              Edit
                            </button>
                            <button onClick={() => handleUndoStep(step.id)} disabled={undoing}
                              className="text-[10px] px-2 py-1 rounded-md bg-error-light text-error font-medium hover:bg-error/10 transition-colors disabled:opacity-50 min-h-[28px]">
                              {undoing ? "..." : "Undo"}
                            </button>
                          </div>
                        )}
                        {step.id === "submitted" && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17L4 12" />
                          </svg>
                        )}
                      </div>
                    )}

                    {/* Incomplete: Update button */}
                    {isIncomplete && activeStep !== step.id && (
                      <button onClick={() => { const t = new Date().toISOString().split("T")[0]; setStepDate(t); setActiveStep(step.id); }}
                        className="text-[10px] bg-sand-200 text-sand-700 px-2.5 py-1 rounded-lg font-medium hover:bg-sand-300 transition-all active:scale-95">
                        Update
                      </button>
                    )}
                  </div>

                  {/* Add step date picker */}
                  {isIncomplete && activeStep === step.id && (
                    <div className="flex items-center gap-2 px-3 py-2 ml-6 animate-in">
                      <input type="date"
                        className="flex-1 text-sm px-3 py-2 border border-sand-200 rounded-lg bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                        max={new Date().toISOString().split("T")[0]} value={stepDate}
                        onChange={(e) => setStepDate(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && stepDate) handleSaveStep(step.id, stepDate);
                          if (e.key === "Escape") { setActiveStep(null); setStepDate(""); }
                        }} />
                      {stepDate && (
                        <button onClick={() => handleSaveStep(step.id, stepDate)} disabled={saving}
                          className="text-xs bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-600 transition-all active:scale-95 disabled:opacity-50">
                          {saving ? "..." : "Save"}
                        </button>
                      )}
                      <button onClick={() => { setActiveStep(null); setStepDate(""); }}
                        className="text-xs text-sand-400 hover:text-sand-600 px-2 py-2 transition-colors">Cancel</button>
                    </div>
                  )}

                  {/* Edit date picker for completed steps */}
                  {isDone && editingStep === step.id && (
                    <div className="flex items-center gap-2 px-3 py-2 ml-6 animate-in">
                      <input type="date"
                        className="flex-1 text-sm px-3 py-2 border border-sand-200 rounded-lg bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                        max={new Date().toISOString().split("T")[0]} value={editDate}
                        onChange={(e) => setEditDate(e.target.value)} />
                      {editDate && (
                        <button onClick={() => handleEditStep(step.id, editDate)} disabled={saving}
                          className="text-xs bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-600 transition-all active:scale-95 disabled:opacity-50">
                          {saving ? "..." : "Save"}
                        </button>
                      )}
                      <button onClick={() => { setEditingStep(null); setEditDate(""); }}
                        className="text-xs text-sand-400 hover:text-sand-600 px-2 py-2 transition-colors">Cancel</button>
                    </div>
                  )}

                  {/* GCKey inline step — after AOR */}
                  {step.id === "aor" && hasAor && (
                    <GCKeyInlineStep appId={app.id} gckeyDone={gckeyDone} toggleGckey={toggleGckey} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// End of file
