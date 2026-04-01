"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Application, StepId } from "@/lib/types";
import { STEPS, getStepIndex } from "@/lib/constants";
import { formatDate, daysBetween, buildStepsMap } from "@/lib/utils";
import { getSavedPinHash } from "@/lib/pin";
import { ShareButtons } from "@/components/ShareButtons";
import { Reactions } from "@/components/Reactions";
import { Confetti } from "@/components/Confetti";
import { PositionRunway } from "@/components/PositionRunway";
import { AORCountdown } from "@/components/AORCountdown";
import { AchievementBadges } from "@/components/AchievementBadges";
import { playMilestoneSound } from "@/lib/sounds";
import { TimelineExport } from "@/components/TimelineExport";
import { FindRepresentativeCard } from "@/components/FindRepresentativeCard";
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
  const supabase = createClient();

  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .order("created_at", { ascending: true });
    if (data) {
      const all = data as Application[];
      setApps(all);
      // Find entries that belong to this browser (PIN saved in localStorage)
      const mine = all.filter(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash);
      setMyApps(mine);
    }
    setLoading(false);
  }, [supabase]);

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
  const currentIdx = getStepIndex(app.current_step);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [stepDate, setStepDate] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const supabase = createClient();

  // What's the next step to complete?
  const nextStepId = currentIdx < STEPS.length - 1 ? STEPS[currentIdx + 1].id : null;

  // Latest completed step (for undo button)
  const completedStepIds = STEPS.filter(s => stepsMap[s.id]).map(s => s.id);
  const latestCompletedId = completedStepIds.length > 0 ? completedStepIds[completedStepIds.length - 1] : null;

  const handleSaveStep = async (stepId: string, date: string) => {
    setSaving(true);
    if (navigator.vibrate) navigator.vibrate(12);
    playMilestoneSound();
    await supabase.from("step_events").insert({ application_id: app.id, step_id: stepId, event_date: date });
    await supabase.from("applications").update({ current_step: stepId, is_complete: stepId === "ecopr" }).eq("id", app.id);
    setShowConfetti(true);
    setActiveStep(null);
    setStepDate("");
    setSaving(false);
    onRefresh();
  };

  const handleUndoStep = async (stepId: string) => {
    if (!confirm("Remove this step? This will revert your progress.")) return;
    setUndoing(true);
    const pinHash = getSavedPinHash(app.id);
    await fetch(`/api/steps?application_id=${app.id}&step_id=${stepId}&pin_hash=${pinHash || ""}`, { method: "DELETE" });
    setUndoing(false);
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
    await supabase.from("applications").update({
      initials: editForm.initials.trim(), country_origin: editForm.country_origin,
      stream: editForm.stream, sponsor_status: editForm.sponsor_status,
      province: editForm.province,
    }).eq("id", app.id);
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
            <button onClick={() => setEditing(!editing)}
              className="text-[10px] text-brand-500 font-medium px-2 py-0.5 rounded-full border border-brand-200 hover:bg-brand-50 transition-colors">
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>
          <p className="text-xs text-sand-500">
            {app.country_origin} · {app.sponsor_status} · {app.stream}
            {app.province === "Quebec" ? " · Quebec" : ""}
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
        handleUndoStep={handleUndoStep} saving={saving} undoing={undoing} />

      {/* 3. AOR Countdown */}
      <AORCountdown app={app} allApps={allApps} />

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

      {/* 4. Achievement Badges */}
      <AchievementBadges app={app} />

      {/* 5. Find a Representative */}
      <FindRepresentativeCard />

      {/* Reminder + Share */}
      <div className="border-t border-sand-100 pt-4 space-y-3">
        <div>
          <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Share Timeline</div>
          <ShareButtons app={app} />
        </div>
      </div>
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
  activeStep, setActiveStep, stepDate, setStepDate, handleSaveStep, handleUndoStep, saving, undoing,
}: {
  app: Application; stepsMap: Record<string, string | null>; currentIdx: number;
  nextStepId: string | null; latestCompletedId: string | null;
  activeStep: string | null; setActiveStep: (s: string | null) => void;
  stepDate: string; setStepDate: (s: string) => void;
  handleSaveStep: (stepId: string, date: string) => void;
  handleUndoStep: (stepId: string) => void; saving: boolean; undoing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [gckeyDone, setGckeyDone] = useState(false);
  const hasAor = !!stepsMap.aor;
  const completedCount = STEPS.filter(s => stepsMap[s.id]).length;
  const nextStep = nextStepId ? STEPS.find(s => s.id === nextStepId) : null;

  // Load GCKey done state from localStorage
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
      {/* Header — always visible with Update button */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Your Timeline</span>
            <span className="text-[10px] font-bold text-brand-600">{completedCount}/{STEPS.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <TimelineExport app={app} />
          </div>
        </div>

        {/* Next step — tap to expand and update */}
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
        maxHeight: expanded ? "1200px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="px-4 pb-4" style={{
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.25s ease",
          transitionDelay: expanded ? "0.1s" : "0s",
        }}>
          <div className="space-y-1">
            {STEPS.map((step, i) => {
              const date = stepsMap[step.id];
              const prevDate = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
              const days = date && prevDate ? daysBetween(prevDate, date) : null;
              const isDone = i <= currentIdx && date;
              const isNext = step.id === nextStepId;

              return (
                <div key={step.id}>
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    isDone ? "bg-brand-50" : isNext ? "bg-warn-light border border-warn/20" : "opacity-30"
                  }`}>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      isDone ? "bg-brand-500" : isNext ? "bg-warn animate-pulse" : "bg-sand-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-sand-900">{step.label}</span>
                    </div>
                    {isDone && (
                      <div className="text-right">
                        <div className="text-xs font-medium text-sand-700">{formatNice(date!).replace(/, \d{4}/, "")}</div>
                        {days != null && i > 0 && <div className="text-[9px] text-brand-500 font-semibold">{days}d</div>}
                      </div>
                    )}
                    {isNext && activeStep !== step.id && (
                      <button onClick={() => { const t = new Date().toISOString().split("T")[0]; setStepDate(t); setActiveStep(step.id); }}
                        className="text-xs bg-warn text-white px-3 py-1.5 rounded-lg font-medium hover:bg-warn-dark transition-all active:scale-95">
                        Update
                      </button>
                    )}
                    {isDone && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Reactions applicationId={app.id} stepId={step.id} compact />
                        {step.id !== "submitted" && step.id === latestCompletedId ? (
                          <button onClick={() => handleUndoStep(step.id)} disabled={undoing}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-error-light text-error font-medium hover:bg-error/10 transition-colors disabled:opacity-50">
                            {undoing ? "..." : "Undo"}
                          </button>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17L4 12" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Date picker */}
                  {isNext && activeStep === step.id && (
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
