"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Application, StepId, StepDefinition } from "@/lib/types";
import { STEPS, getStepIndex, getVisibleSteps } from "@/lib/constants";
import { formatDate, daysBetween, buildStepsMap } from "@/lib/utils";
import { getSavedPinHash, hashPin, removeSavedPin, savePinForApp } from "@/lib/pin";
import { toast } from "@/lib/toast";
import { Confetti } from "@/components/Confetti";
import { PositionRunway } from "@/components/PositionRunway";
import { playMilestoneSound } from "@/lib/sounds";
import { TimelineExport } from "@/components/TimelineExport";
import { MeSkeleton } from "@/components/Skeletons";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Button } from "@/components/ui";
import { AvatarIcon, AVATAR_OPTIONS, isAvatarKey } from "@/components/AvatarIcons";
import { FindRepresentativeCard } from "@/components/FindRepresentativeCard";

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

  const [claimPin, setClaimPin] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  const handleClaim = async () => {
    if (claimPin.length !== 4) return;
    setClaiming(true);
    setClaimError("");
    const pinHash = await hashPin(claimPin);
    const matched = apps.filter(a => a.pin_hash === pinHash);
    if (matched.length === 0) {
      setClaimError("No entries found with this PIN");
      setClaiming(false);
      return;
    }
    matched.forEach(a => savePinForApp(a.id, pinHash));
    setClaiming(false);
    toast.success(`Reconnected ${matched.length} ${matched.length === 1 ? "entry" : "entries"}`);
    fetchApps();
  };

  if (loading) return <MeSkeleton />;

  if (myApps.length === 0) {
    return (
      <div className="py-8 hero-glow">
        <div className="bg-white border border-sand-200 rounded-2xl p-6 sm:p-8 max-w-md mx-auto shadow-[0_1px_2px_rgba(26,26,24,0.04)]">
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-500/20">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1.5">My application</p>
            <h2 className="text-xl font-bold text-sand-900 tracking-tight mb-1.5">No entries linked here</h2>
            <p className="text-[13px] text-sand-500 leading-relaxed">
              Reconnect with your 4-digit PIN, or add a new application.
            </p>
          </div>

          {/* PIN reconnect */}
          <div className="bg-white border border-sand-200 rounded-xl p-4 mb-3">
            <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-2.5 text-center">Enter your PIN</div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={claimPin}
              onChange={(e) => { setClaimPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setClaimError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter" && claimPin.length === 4) handleClaim(); }}
              className={`w-full px-4 py-3 text-2xl text-center rounded-lg border bg-sand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 tracking-[0.45em] font-mono font-bold mb-2.5 transition-colors ${
                claimError ? "border-error shake" : "border-sand-200"
              }`}
            />
            <button
              onClick={handleClaim}
              disabled={claimPin.length !== 4 || claiming}
              className="w-full py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(45,106,79,0.15)]"
            >
              {claiming ? "Reconnecting…" : claimPin.length === 4 ? "Reconnect my entry" : `Enter ${4 - claimPin.length} more digit${4 - claimPin.length === 1 ? "" : "s"}`}
            </button>
            {claimError && <p className="text-[11px] text-error mt-2 text-center font-medium">{claimError}</p>}
          </div>

          <div className="flex items-center gap-2 my-4 text-[10px] text-sand-400 font-semibold uppercase tracking-wider">
            <span className="flex-1 h-px bg-sand-200" />
            <span>or</span>
            <span className="flex-1 h-px bg-sand-200" />
          </div>

          <a href="/dashboard" className="block w-full py-2.5 text-center rounded-lg border border-sand-200 bg-white hover:bg-sand-50 text-sm font-semibold text-sand-700 transition-colors">
            Add new application <span aria-hidden>→</span>
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
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "resources">("timeline");

  // Brute-force reveal PIN from hash (only 9000 possibilities, instant)
  const revealPin = async () => {
    const savedHash = getSavedPinHash(app.id);
    if (!savedHash) return;
    for (let i = 1000; i <= 9999; i++) {
      const pin = String(i);
      const h = await hashPin(pin);
      if (h === savedHash) { setRevealedPin(pin); return; }
    }
  };

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
      toast.error(err.error || "Failed to save step");
      setSaving(false);
      return;
    }
    const stepLabel = STEPS.find(s => s.id === stepId)?.label || stepId;
    toast.success(`Marked ${stepLabel} · ${formatNice(date).replace(/, \d{4}/, "")}`);
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
        toast.error(err.error || "Failed to undo step");
      } else {
        const stepLabel = STEPS.find(s => s.id === stepId)?.label || stepId;
        toast.success(`Removed ${stepLabel}`);
      }
    } catch {
      toast.error("Network error — try again");
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
      toast.error(err.error || "Failed to edit step");
    } else {
      toast.success("Date updated");
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
    emoji: app.emoji || "",
    is_anonymous: app.is_anonymous || false,
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
        province: editForm.province, emoji: editForm.emoji || null,
        is_anonymous: editForm.is_anonymous,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Failed to save");
    } else {
      toast.success("Profile saved");
    }
    setSaving(false);
    setEditing(false);
    onRefresh();
  };

  return (
    <div className="bg-white border border-sand-200 rounded-2xl p-5 mb-5 shadow-[0_1px_2px_rgba(26,26,24,0.04)]">
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* 1. Header */}
      <div className="flex items-start gap-3.5 mb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          app.emoji
            ? "bg-brand-50 border border-brand-200 text-brand-600"
            : "bg-brand-500 text-white font-bold text-lg shadow-lg shadow-brand-500/20"
        }`}>
          {app.emoji && isAvatarKey(app.emoji)
            ? <AvatarIcon icon={app.emoji} size={32} />
            : app.emoji
              ? <span className="text-2xl">{app.emoji}</span>
              : (app._real_initials || app.initials).slice(0, 2).toUpperCase()
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-0.5">My application</p>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-xl font-bold text-sand-900 tracking-tight leading-none">{app._real_initials || app.initials}</h2>
            {app.is_anonymous && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sand-200 text-sand-600 uppercase tracking-wider leading-none">Hidden</span>
            )}
          </div>
          <p className="text-[12px] text-sand-500 nums-tabular truncate">
            {app.country_origin} · {app.sponsor_status} · {app.stream}
            {app.province === "Quebec" ? " · Quebec" : ""}
          </p>
          {/* PIN + action chips */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {revealedPin ? (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-700 font-mono font-bold tracking-[0.25em] leading-none">
                <span className="opacity-60 not-italic font-sans">PIN</span>
                {revealedPin}
              </span>
            ) : (
              <button
                onClick={revealPin}
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border border-sand-200 text-sand-600 hover:text-brand-600 hover:border-brand-300 transition-colors"
              >
                Show PIN
              </button>
            )}
            <button
              onClick={() => { setEditing(!editing); if (!editing) setTimelineExpanded(false); }}
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border transition-colors ${
                editing
                  ? "border-brand-300 bg-brand-500/10 text-brand-700"
                  : "border-sand-200 text-sand-600 hover:text-brand-600 hover:border-brand-300"
              }`}
            >
              {editing ? "Cancel" : "Edit"}
            </button>
            <button
              onClick={() => {
                if (confirm("Disconnect this entry from your device? You can reconnect later with your PIN.")) {
                  removeSavedPin(app.id);
                  onRefresh();
                }
              }}
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border border-sand-200 text-sand-500 hover:text-error hover:border-error/40 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
        {/* Day counter — bigger, tabular */}
        <div className="text-right flex-shrink-0 pl-2">
          <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-0.5">Day</p>
          <p className="text-3xl font-bold text-brand-600 leading-none nums-tabular">{daysSoFar}</p>
          <p className="text-[10px] text-sand-400 nums-tabular mt-1">{submittedDate ? formatNice(submittedDate) : "—"}</p>
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
              <label className="text-[10px] text-sand-500 font-medium mb-1.5 block">Avatar</label>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_OPTIONS.map(({ key, label }) => (
                  <button key={key} type="button" title={label}
                    onClick={() => setEditForm(p => ({ ...p, emoji: key }))}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                      editForm.emoji === key
                        ? "bg-brand-100 border-2 border-brand-500 scale-110 text-brand-600"
                        : "bg-white border border-sand-200 hover:border-sand-300 text-sand-500"
                    }`}>
                    {key ? <AvatarIcon icon={key} size={20} /> : <span className="text-[9px] text-sand-400">None</span>}
                  </button>
                ))}
              </div>
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
            {/* Anonymous toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-[10px] text-sand-500 font-medium">Hide my name</div>
                <div className="text-[9px] text-sand-400">Others will see "Anonymous" instead of your name</div>
              </div>
              <button
                type="button"
                onClick={() => setEditForm(p => ({ ...p, is_anonymous: !p.is_anonymous }))}
                className={`relative w-10 h-[22px] rounded-full transition-colors ${
                  editForm.is_anonymous ? "bg-brand-500" : "bg-sand-300"
                }`}>
                <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
                  editForm.is_anonymous ? "translate-x-[20px]" : "translate-x-[2px]"
                }`} />
              </button>
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

      {/* Tabs strip — Timeline / Resources. Splits the long stack into
          two scannable sections. SupportCard remains pinned at the bottom. */}
      <div className="mb-4 flex gap-1 p-1 rounded-xl bg-sand-100 border border-sand-200">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
            activeTab === "timeline"
              ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
              : "text-sand-600 hover:text-sand-900"
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setActiveTab("resources")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
            activeTab === "resources"
              ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
              : "text-sand-600 hover:text-sand-900"
          }`}
        >
          Resources
        </button>
      </div>

      {activeTab === "timeline" && <>
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
          <a
            href={`/cohort/${app.id}`}
            className="block bg-white border border-sand-200 rounded-xl px-3.5 py-3 mb-3 hover:border-brand-300 hover:shadow-[0_4px_12px_rgba(26,26,24,0.06)] transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21V19C23 17.5 22 16.2 20.6 15.8"/><path d="M16.5 3.1C17.9 3.6 19 5 19 6.5C19 8 17.9 9.4 16.5 9.9"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">Your submission week</p>
                <p className="text-sm font-bold text-sand-900 truncate">
                  <span className="nums-tabular">{sameWeek.length}</span> {sameWeek.length === 1 ? "other" : "others"} submitted the same week
                </p>
                <p className="text-[10px] text-sand-400 truncate nums-tabular">
                  {withAor.length > 0 ? <><span className="font-semibold text-brand-600">{withAor.length}</span> have AOR</> : "None have AOR yet"}
                  {" · "}
                  {sameWeek.slice(0, 4).map(a => a.initials).join(", ")}{sameWeek.length > 4 ? "…" : ""}
                </p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-sand-300">
                <path d="M9 18L15 12L9 6"/>
              </svg>
            </div>
          </a>
        );
      })()}

      </>}

      {activeTab === "resources" && <>
        {/* Visitor Visa Documentation Guide */}
        <VisitorVisaChecklist />

        {/* Find a Representative */}
        <FindRepresentativeCard />
      </>}

      {/* Support card — always pinned at the bottom, regardless of tab */}
      <SupportCard isIndian={app.country_origin === "India"} />
    </div>
  );
}

// Support Card — Buy Me a Coffee + UPI (India only)
function SupportCard({ isIndian }: { isIndian: boolean }) {
  const [showUpi, setShowUpi] = useState(false);
  const [copied, setCopied] = useState(false);
  const upiId = "8639938484-k29b@ybl";
  const upiLink = `upi://pay?pa=${upiId}&pn=Anil%20Jampala&tn=Support%20SponsorTrack&cu=INR`;
  const qrUrl = "/upi-qr.png";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const handleUpiClick = () => {
    setShowUpi(true);
  };

  return (
    <>
      <div className="border border-sand-200 rounded-xl p-4 mt-1" style={{ background: "var(--surface-card)" }}>
        <div className="text-center">
          <div className="text-sm font-semibold text-sand-800 mb-1">Built for the sponsorship community</div>
          <p className="text-[11px] text-sand-500 mb-3 leading-relaxed">
            SponsorTrack is free and always will be. If it helped ease your wait, consider supporting its development.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {!isIndian && (
              <a
                href="https://buymeacoffee.com/aniljampala"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-sm"
                style={{ backgroundColor: "#FFDD00", color: "#1A1A18" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                Buy me a coffee
              </a>
            )}
            {isIndian && (
              <button
                onClick={handleUpiClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-sm border border-sand-200"
                style={{ background: "var(--surface-card)", color: "var(--sand-800)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 4l5 16" stroke="#097939"/>
                  <path d="M12 4l5 16" stroke="#F47920"/>
                  <path d="M17 4l-5 8" stroke="#097939"/>
                </svg>
                Pay via UPI
              </button>
            )}
          </div>
        </div>
      </div>

      {/* UPI QR Modal */}
      {showUpi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowUpi(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xs rounded-2xl p-5 shadow-2xl"
            style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowUpi(false)} className="absolute top-3 right-3 text-sand-400 hover:text-sand-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>

            <div className="text-center">
              <div className="text-sm font-bold text-sand-900 mb-1">Support via UPI</div>
              <p className="text-[10px] text-sand-500 mb-4">Scan with any UPI app or copy the ID below</p>

              {/* QR Code */}
              <div className="bg-white rounded-xl p-3 inline-block mb-4 shadow-sm">
                <img src={qrUrl} alt="UPI QR Code" width={180} height={180} className="rounded-lg" />
              </div>

              {/* UPI ID + Copy */}
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-3" style={{ background: "var(--surface-input, #f5f3ef)", border: "1px solid var(--surface-card-border)" }}>
                <span className="flex-1 text-xs font-mono text-sand-700 truncate">{upiId}</span>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 px-3 py-1 rounded-md text-[10px] font-bold transition-all active:scale-[0.95]"
                  style={{
                    background: copied ? "#2D6A4F" : "#E8F5EC",
                    color: copied ? "white" : "#2D6A4F",
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <p className="text-[9px] text-sand-400">Scan with PhonePe · Google Pay · Paytm · any UPI app</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Visitor Visa Documentation Checklist for PA
function VisitorVisaChecklist() {
  const [open, setOpen] = useState(false);
  const items = [
    { title: "Cover / Letter of Explanation (Dual Intent)", desc: "Explains the purpose of the visit and that PR is in process." },
    { title: "Invitation Letter (From Sponsor)", desc: "Sponsor invites the PA to visit Canada." },
    { title: "Sponsor PR Card", desc: "Copy of sponsor's PR card (both sides)." },
    { title: "Sponsor Employment Letter", desc: "Confirms sponsor's job, position, and salary." },
    { title: "Sponsor Pay Stubs", desc: "Last 3 pay stubs from sponsor's employer." },
    { title: "Sponsor Bank Statements", desc: "Recent bank statements showing financial stability." },
    { title: "IRCC Sponsor Eligibility Letter", desc: "Proof that sponsor eligibility was approved." },
    { title: "PR Application Status / Tracker", desc: "Screenshot or printout showing PR application is in progress." },
    { title: "Marriage Certificate", desc: "Official marriage certificate (translated if not in English/French)." },
    { title: "Wedding Photos", desc: "A few photos as proof of genuine relationship." },
    { title: "Applicant Employment Letter", desc: "Shows ties to home country. If unemployed, any letter from a business or self-employment proof works — IRCC wants to see you'll return." },
    { title: "Applicant Bank Statements", desc: "Recent statements showing applicant's financial situation." },
    { title: "Travel Plan (Optional)", desc: "Round-trip itinerary showing intent to return." },
  ];

  return (
    <div className="border border-sand-200 rounded-xl overflow-hidden mt-1" style={{ background: "var(--surface-card)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-sand-50/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
          </div>
          <div>
            <span className="text-sm font-bold text-sand-900">Visitor Visa Documents</span>
            <p className="text-[10px] text-sand-500">Documentation for PA's visitor visa application</p>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`text-sand-400 transition-transform ${open ? "rotate-180" : ""}`}><path d="M6 9L12 15L18 9"/></svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-[10px] text-sand-500 mb-2 leading-relaxed">
            Checklist for Principal Applicant applying for a visitor visa while spousal sponsorship PR is in process (dual intent).
          </p>
          {items.map((item, i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <span className="text-[10px] font-bold text-brand-600 mt-0.5 w-5 flex-shrink-0 text-right">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-sand-900">{item.title}</span>
                <p className="text-[10px] text-sand-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
          <div className="mt-3 pt-2 border-t border-sand-100">
            <p className="text-[10px] text-sand-500 leading-relaxed">
              <span className="font-semibold text-sand-700">Tip:</span> If the applicant is currently unemployed, a letter from any business confirming work or self-employment activity can help. IRCC wants to see the applicant has ties to their home country and will return after the visit.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Next Step Estimate — works for ALL steps, not just AOR
function NextStepEstimate({ app, allApps }: { app: Application; allApps: Application[] }) {
  const data = useMemo(() => {
    const stepsMap = buildStepsMap(app.step_events || []);
    if (app.is_complete) return null;

    const visSteps = getVisibleSteps(app.stream);
    const aorIdx = visSteps.findIndex(s => s.id === "aor");

    // Find the FIRST incomplete step by position (skipping submitted)
    let nextIdx = -1;
    for (let i = 1; i < visSteps.length; i++) {
      if (!stepsMap[visSteps[i].id]) { nextIdx = i; break; }
    }
    if (nextIdx < 0) return null;

    const nextStep = visSteps[nextIdx];

    // Determine correct base step for this next step
    const STEP_BASE: Record<string, string> = {
      aor: "submitted", bil: "aor",
      biometrics_given: "bil", biometrics_done: "biometrics_given",
      sponsor_eligibility: "aor", medical: "aor",
      medicals_attended: "medical", medical_passed: "medicals_attended",
      pa_eligibility: "aor", pre_arrival: "aor",
      background_started: "aor", background: "aor",
      portal1: "aor", portal2: "portal1",
      ppr: "aor", passport_received: "ppr", ecopr: "aor",
    };

    const baseStepId = (STEP_BASE[nextStep.id] || "aor") as StepId;
    let baseDate: string | null = stepsMap[baseStepId as StepId] || null;
    let baseLabel = "";

    if (baseStepId === "submitted") baseLabel = "Submitted";
    else if (baseStepId === "aor") baseLabel = "AOR";
    else if (baseStepId === "bil") baseLabel = "BIL";
    else if (baseStepId === "biometrics_given") baseLabel = "Bio Given";
    else if (baseStepId === "medical") baseLabel = "Med Req";
    else if (baseStepId === "medicals_attended") baseLabel = "Med Attended";
    else if (baseStepId === "portal1") baseLabel = "Portal 1";
    else if (baseStepId === "ppr") baseLabel = "PPR";
    else baseLabel = visSteps.find(s => s.id === baseStepId as StepId)?.label || baseStepId;

    if (!baseDate) return null;

    const today = new Date().toISOString().split("T")[0];
    const daysSinceCurrent = daysBetween(baseDate, today);

    // Calculate community average using same base step
    const durations: number[] = [];
    allApps.forEach(a => {
      if (a.stream !== app.stream) return;
      const s = buildStepsMap(a.step_events || []);
      if (!s[nextStep.id]) return;

      const communityBase = s[baseStepId as StepId] || null;
      if (!communityBase) return;

      const d = daysBetween(communityBase, s[nextStep.id]!);
      if (d >= 0 && d <= 200) durations.push(d);
    });

    if (durations.length < 1) return null;

    const avgDays = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const daysLeft = avgDays - daysSinceCurrent;
    const predictedDate = new Date(baseDate + "T00:00:00");
    predictedDate.setDate(predictedDate.getDate() + avgDays);
    const predictedStr = predictedDate.toISOString().split("T")[0];

    return {
      currentStep: baseLabel,
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
    { text: "Create an account with PA or representative's email" },
    { text: "Complete all security questions" },
    { text: "Click \"Link Application\" in the table" },
    { text: "Select \"Application number and family name\"" },
    { text: "Enter PA's family name with a space in front", highlight: true },
    { text: "Enter application number and other details" },
    { text: "Enter 2 for \"number of people\"" },
    { text: "Submit → should show \"account found\" → Link" },
  ];

  const TRACKER_STEPS = [
    { text: "Go to IRCC Tracker registration", link: "https://ircc-tracker-suivi.apps.cic.gc.ca/en/register" },
    { text: "Enter PA's UCI (from your GCKey account)" },
    { text: "Enter Application Number" },
    { text: "Enter PA's names and Date of Birth exactly as in application" },
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
    <div className="border border-sand-200 rounded-2xl mb-3 overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">Your timeline</span>
            <span className="text-[11px] font-bold text-brand-600 nums-tabular">{completedCount}<span className="text-sand-400 font-medium">/{visibleSteps.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <TimelineExport app={app} />
          </div>
        </div>

        {nextStep && !expanded && (
          <button
            onClick={() => { setExpanded(true); const t = new Date().toISOString().split("T")[0]; setStepDate(t); setTimeout(() => setActiveStep(nextStep.id), 100); }}
            className="w-full flex items-center gap-3 mt-2 px-3.5 py-3 rounded-xl bg-warn/12 border border-warn/30 hover:bg-warn/20 active:scale-[0.98] transition-all">
            <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-warn opacity-60 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warn" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[10px] font-bold text-warn-dark uppercase tracking-[0.08em]">Next step</div>
              <div className="text-sm font-bold text-sand-900 truncate">{nextStep.label}</div>
            </div>
            <span className="text-[11px] bg-warn text-white px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 shadow-sm">Update <span aria-hidden>→</span></span>
          </button>
        )}
        {!nextStep && app.is_complete && (
          <div className="mt-2 px-3 py-2.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-center">
            <span className="text-[12px] font-bold text-brand-700 inline-flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12"/></svg>
              All steps complete
            </span>
          </div>
        )}
      </div>

      {/* Expand/collapse toggle */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-sand-100 text-[10px] text-sand-500 font-bold uppercase tracking-wider hover:text-brand-600 hover:bg-sand-50/60 transition-colors">
        {expanded ? "Hide steps" : "View all steps"}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
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
              const aorDate = stepsMap.aor;
              // AOR and before: days from previous step. After AOR: days from AOR
              const isPostAor = aorDate && step.id !== "submitted" && step.id !== "aor" && STEPS.findIndex(s => s.id === step.id) > STEPS.findIndex(s => s.id === "aor");
              let days: number | null = null;
              let daysLabel = "";
              if (date && step.id === "aor" && stepsMap.submitted) {
                days = daysBetween(stepsMap.submitted, date);
              } else if (date && step.id === "biometrics_given" && stepsMap.bil) {
                days = daysBetween(stepsMap.bil, date);
                daysLabel = " from BIL";
              } else if (date && step.id === "biometrics_done" && stepsMap.biometrics_given) {
                days = daysBetween(stepsMap.biometrics_given, date);
                daysLabel = " from Bio Given";
              } else if (date && step.id === "medicals_attended" && stepsMap.medical) {
                days = daysBetween(stepsMap.medical, date);
                daysLabel = " from Med Req";
              } else if (date && step.id === "medical_passed" && stepsMap.medicals_attended) {
                days = daysBetween(stepsMap.medicals_attended, date);
                daysLabel = " from Med Attended";
              } else if (date && isPostAor && aorDate) {
                days = daysBetween(aorDate, date);
                daysLabel = " from AOR";
              }
              const isDone = !!date;
              const isIncomplete = !date && step.id !== "submitted";

              return (
                <div key={step.id}>
                  <div className={`flex items-center gap-3 rounded-lg transition-all nums-tabular ${
                    isDone ? "px-3 py-2 bg-brand-500/10 border border-brand-500/20"
                    : isIncomplete ? "px-3 py-2 bg-white border border-sand-200"
                    : "px-3 py-1.5"
                  }`}>
                    <div className={`flex-shrink-0 rounded-full ${
                      isDone ? "w-2.5 h-2.5 bg-brand-500" : isIncomplete ? "w-2 h-2 bg-sand-300 border border-sand-400" : "w-1.5 h-1.5 bg-sand-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold ${isDone ? "text-sm text-sand-900" : isIncomplete ? "text-[13px] text-sand-700" : "text-[11px] text-sand-400"}`}>{step.label}</span>
                      {isIncomplete && <div className="text-[10px] text-sand-500 mt-0.5">{step.hint}</div>}
                    </div>

                    {/* Completed: date + edit + undo */}
                    {isDone && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-[12px] font-bold text-sand-800">{formatNice(date!).replace(/, \d{4}/, "")}</div>
                          {days != null && i > 0 && <div className="text-[10px] text-brand-600 font-bold">{days}d{daysLabel}</div>}
                        </div>
                        {step.id !== "submitted" && (
                          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                            <button onClick={() => { setEditingStep(step.id); setEditDate(date!); }}
                              className="text-[10px] px-2 py-1.5 rounded-md text-sand-500 hover:text-brand-600 hover:bg-sand-100 font-bold uppercase tracking-wider transition-colors min-h-[28px]">
                              Edit
                            </button>
                            <button onClick={() => handleUndoStep(step.id)} disabled={undoing}
                              className="text-[10px] px-2 py-1.5 rounded-md text-sand-500 hover:text-error hover:bg-error/10 font-bold uppercase tracking-wider transition-colors disabled:opacity-50 min-h-[28px]">
                              {undoing ? "…" : "Undo"}
                            </button>
                          </div>
                        )}
                        {step.id === "submitted" && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600">
                            <path d="M20 6L9 17L4 12" />
                          </svg>
                        )}
                      </div>
                    )}

                    {/* Incomplete: Update button */}
                    {isIncomplete && activeStep !== step.id && (
                      <button onClick={() => { const t = new Date().toISOString().split("T")[0]; setStepDate(t); setActiveStep(step.id); }}
                        className="text-[11px] bg-brand-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-brand-600 transition-all active:scale-95 shadow-sm">
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
