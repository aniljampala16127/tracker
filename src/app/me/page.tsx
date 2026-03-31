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
      <h1 className="text-xl font-bold text-sand-900 mb-1">My Application</h1>
      <p className="text-xs text-sand-500 mb-5">Your personal timeline and predictions</p>

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

  // WhatsApp self-reminder
  const reminderText = aorPrediction
    ? `🔔 SponsorTrack Reminder: My AOR is predicted around ${formatNice(aorPrediction)} (${app.stream}, ${app.country_origin}). Check: tracker-lime-five.vercel.app`
    : `🔔 SponsorTrack: Day ${daysSoFar} of my spousal sponsorship application (${app.stream}, ${app.country_origin}). Track at: tracker-lime-five.vercel.app`;
  const whatsappReminderUrl = `https://wa.me/?text=${encodeURIComponent(reminderText)}`;

  return (
    <div className="bg-white border border-sand-200 rounded-2xl p-5 mb-5">
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* 1. Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-lg">
          {app.initials.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-sand-900">{app.initials}</h2>
          <p className="text-xs text-sand-500">
            {app.country_origin} · {app.sponsor_status} · {app.stream}
            {app.visa_country && ` · ${app.visa_country}`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-brand-600">Day {daysSoFar}</div>
          <div className="text-[9px] text-sand-400">{submittedDate ? formatNice(submittedDate) : "—"}</div>
        </div>
      </div>

      {/* 2. AOR Countdown */}
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

      {/* 5. Step timeline */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Your Timeline</div>
          <TimelineExport app={app} />
        </div>
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
                  isDone ? "bg-brand-50 step-done" : isNext ? "bg-warn-light border border-warn/20" : "opacity-30"
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    isDone ? "bg-brand-500 dot-fill" : isNext ? "bg-warn animate-pulse" : "bg-sand-300"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-sand-900">{step.label}</span>
                  </div>

                  {/* Done — show date */}
                  {isDone && (
                    <div className="text-right date-slide">
                      <div className="text-xs font-medium text-sand-700">{formatNice(date!).replace(/, \d{4}/, "")}</div>
                      {days != null && i > 0 && <div className="text-[9px] text-brand-500 font-semibold">{days}d</div>}
                    </div>
                  )}

                  {/* Next step — show Update button or date picker */}
                  {isNext && activeStep !== step.id && (
                    <button
                      onClick={() => setActiveStep(step.id)}
                      className="text-xs bg-warn text-white px-3 py-1.5 rounded-lg font-medium hover:bg-warn-dark transition-all active:scale-95"
                    >
                      Update
                    </button>
                  )}

                  {isDone && (
                    <div className="flex items-center gap-1 flex-shrink-0 check-draw">
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

                {/* Date picker row */}
                {isNext && activeStep === step.id && (
                  <div className="flex items-center gap-2 px-3 py-2 ml-6 animate-in">
                    <input
                      type="date"
                      autoFocus
                      className="flex-1 text-sm px-3 py-2 border border-sand-200 rounded-lg bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                      max={new Date().toISOString().split("T")[0]}
                      value={stepDate}
                      onChange={(e) => setStepDate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && stepDate) handleSaveStep(step.id, stepDate);
                        if (e.key === "Escape") { setActiveStep(null); setStepDate(""); }
                      }}
                    />
                    {stepDate && (
                      <button
                        onClick={() => handleSaveStep(step.id, stepDate)}
                        disabled={saving}
                        className="text-xs bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-600 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {saving ? "..." : "Save"}
                      </button>
                    )}
                    <button
                      onClick={() => { setActiveStep(null); setStepDate(""); }}
                      className="text-xs text-sand-400 hover:text-sand-600 px-2 py-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reminder + Share */}
      <div className="border-t border-sand-100 pt-4 space-y-3">
        {/* WhatsApp self-reminder */}
        <div>
          <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Set a Reminder</div>
          <a
            href={whatsappReminderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] text-xs font-medium hover:bg-[#25D366]/20 transition-colors w-full justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Send myself a WhatsApp reminder
          </a>
          <p className="text-[9px] text-sand-400 mt-1 text-center">Opens WhatsApp with a pre-filled message — send it to yourself or a group</p>
        </div>

        <div>
          <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Share Timeline</div>
          <ShareButtons app={app} />
        </div>
      </div>
    </div>
  );
}

// End of file
