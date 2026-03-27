"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Application, StepId } from "@/lib/types";
import { STEPS, getStepIndex } from "@/lib/constants";
import { formatDate, daysBetween, buildStepsMap } from "@/lib/utils";
import { getSavedPinHash } from "@/lib/pin";
import { InsightsPanel } from "@/components/InsightsPanel";
import { ShareButtons } from "@/components/ShareButtons";
import { Reactions } from "@/components/Reactions";
import { Confetti } from "@/components/Confetti";
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

  if (loading) return <div className="py-20 text-center text-sand-400 text-sm">Loading...</div>;

  if (myApps.length === 0) {
    return (
      <div className="py-12">
        <div className="text-center bg-white dark:bg-[#141413] border border-sand-200 dark:border-[#1E1E1C] rounded-2xl p-8 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
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
    <div>
      <h1 className="text-xl font-bold text-sand-900 mb-1">My Application</h1>
      <p className="text-xs text-sand-500 mb-5">Your personal timeline and predictions</p>

      {myApps.map((app) => (
        <MyAppCard key={app.id} app={app} allApps={apps} onRefresh={fetchApps} />
      ))}
    </div>
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
  const supabase = createClient();

  // What's the next step to complete?
  const nextStepId = currentIdx < STEPS.length - 1 ? STEPS[currentIdx + 1].id : null;

  const handleSaveStep = async (stepId: string, date: string) => {
    setSaving(true);
    await supabase.from("step_events").insert({ application_id: app.id, step_id: stepId, event_date: date });
    await supabase.from("applications").update({ current_step: stepId, is_complete: stepId === "ecopr" }).eq("id", app.id);
    setShowConfetti(true);
    setActiveStep(null);
    setStepDate("");
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
  const irccDays = app.stream === "Outland" ? 456 : 639;
  const pct = Math.min(Math.round((daysSoFar / irccDays) * 100), 100);

  // WhatsApp self-reminder
  const reminderText = aorPrediction
    ? `🔔 SponsorTrack Reminder: My AOR is predicted around ${formatNice(aorPrediction)} (${app.stream}, ${app.country_origin}). Check: tracker-lime-five.vercel.app`
    : `🔔 SponsorTrack: Day ${daysSoFar} of my spousal sponsorship application (${app.stream}, ${app.country_origin}). Track at: tracker-lime-five.vercel.app`;
  const whatsappReminderUrl = `https://wa.me/?text=${encodeURIComponent(reminderText)}`;

  return (
    <div className="bg-white dark:bg-[#141413] border border-sand-200 dark:border-[#1E1E1C] rounded-2xl p-5 mb-5">
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-lg">
          {app.initials.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold text-sand-900">{app.initials}</h2>
          <p className="text-xs text-sand-500">
            {app.country_origin} · {app.sponsor_status} · {app.stream}
            {app.visa_country && ` · ${app.visa_country}`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Progress</span>
          <span className="text-xs font-bold text-brand-600">Day {daysSoFar}</span>
        </div>
        <div className="bg-sand-200 dark:bg-[#1E1E1C] rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-1000"
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </div>
        <div className="mt-1">
          <span className="text-[9px] text-sand-400">Submitted {submittedDate ? formatNice(submittedDate) : "—"}</span>
        </div>
      </div>

      {/* Daily Pulse */}
      <DailyPulse app={app} allApps={allApps} />

      {/* Insights */}
      <InsightsPanel app={app} allApps={allApps} />

      {/* Step timeline */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Your Timeline</div>
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
                  isDone ? "bg-brand-50 dark:bg-brand-500/10" : isNext ? "bg-warn-light dark:bg-warn-light/30 border border-warn/20 dark:border-warn/10" : "opacity-30"
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    isDone ? "bg-brand-500" : isNext ? "bg-warn animate-pulse" : "bg-sand-300 dark:bg-sand-600"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-sand-900">{step.label}</span>
                  </div>

                  {/* Done — show date */}
                  {isDone && (
                    <div className="text-right">
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
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Reactions applicationId={app.id} stepId={step.id} compact />
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17L4 12" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Date picker row */}
                {isNext && activeStep === step.id && (
                  <div className="flex items-center gap-2 px-3 py-2 ml-6 animate-in">
                    <input
                      type="date"
                      autoFocus
                      className="flex-1 text-sm px-3 py-2 border border-sand-200 dark:border-[#2A2A27] rounded-lg bg-white dark:bg-[#1A1A18] text-sand-900 dark:text-sand-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
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
      <div className="border-t border-sand-100 dark:border-[#1E1E1C] pt-4 space-y-3">
        {/* WhatsApp self-reminder */}
        <div>
          <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Set a Reminder</div>
          <a
            href={whatsappReminderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366]/10 dark:bg-[#25D366]/5 text-[#25D366] text-xs font-medium hover:bg-[#25D366]/20 transition-colors w-full justify-center"
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

// ============================================
// Daily Pulse — changes every day to create return habit
// ============================================
function DailyPulse({ app, allApps }: { app: Application; allApps: Application[] }) {
  const stepsMap = buildStepsMap(app.step_events || []);
  const submittedDate = stepsMap.submitted;
  if (!submittedDate) return null;

  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];

  // Same stream apps
  const streamApps = allApps.filter(a => a.stream === app.stream);

  // AORs received in last 7 days (same stream)
  const recentAors = streamApps.filter(a => {
    const ev = (a.step_events || []).find(e => e.step_id === "aor");
    if (!ev) return false;
    return now - new Date(ev.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  });

  // AORs today
  const todayAors = streamApps.filter(a => {
    const ev = (a.step_events || []).find(e => e.step_id === "aor");
    if (!ev) return false;
    return ev.event_date === today || ev.created_at.startsWith(today);
  });

  // New entries this week
  const newThisWeek = allApps.filter(a => now - new Date(a.created_at).getTime() < 7 * 24 * 60 * 60 * 1000);

  // Same week cohort progress
  const subDate = new Date(submittedDate + "T00:00:00");
  const cohort = allApps.filter(a => {
    if (a.id === app.id) return false;
    const s = buildStepsMap(a.step_events || []);
    if (!s.submitted) return false;
    return Math.abs(new Date(s.submitted + "T00:00:00").getTime() - subDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });
  const cohortWithAor = cohort.filter(a => a.step_events?.some(e => e.step_id === "aor"));

  // Days until predicted AOR
  const aorDays: number[] = [];
  streamApps.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (s.submitted && s.aor) aorDays.push(daysBetween(s.submitted, s.aor));
  });
  const avgAor = aorDays.length ? Math.round(aorDays.reduce((a, b) => a + b, 0) / aorDays.length) : null;
  const daysSoFar = daysBetween(submittedDate, today);
  const daysUntilAor = avgAor ? avgAor - daysSoFar : null;
  const hasAor = !!stepsMap.aor;

  // Build pulse items
  const items: { icon: string; text: string; color: string }[] = [];

  if (todayAors.length > 0) {
    items.push({ icon: "M13 2L3 14H12L11 22L21 10H12L13 2Z", text: `${todayAors.length} ${app.stream} AOR${todayAors.length > 1 ? "s" : ""} received today!`, color: "text-brand-600" });
  } else if (recentAors.length > 0) {
    items.push({ icon: "M13 2L3 14H12L11 22L21 10H12L13 2Z", text: `${recentAors.length} ${app.stream} AOR${recentAors.length > 1 ? "s" : ""} this week`, color: "text-brand-600" });
  }

  if (!hasAor && daysUntilAor != null && daysUntilAor > 0) {
    items.push({ icon: "M12 6V12L16 14", text: `~${daysUntilAor} days until your predicted AOR`, color: "text-warn-dark" });
  } else if (!hasAor && daysUntilAor != null && daysUntilAor <= 0) {
    items.push({ icon: "M12 6V12L16 14", text: `Your AOR could arrive any day now!`, color: "text-brand-600" });
  }

  if (cohortWithAor.length > 0) {
    items.push({ icon: "M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21", text: `${cohortWithAor.length} of ${cohort.length} in your cohort have AOR`, color: "text-sand-700" });
  }

  if (newThisWeek.length > 0) {
    items.push({ icon: "M12 5V19M5 12H19", text: `${newThisWeek.length} new entries joined this week`, color: "text-sand-600" });
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-brand-50 to-warn-light dark:from-brand-500/5 dark:to-warn/5 rounded-xl p-3.5 mb-4 border border-brand-200/30 dark:border-brand-500/10">
      <div className="text-[9px] font-semibold text-sand-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
        Today&apos;s Pulse
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-white/60 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={item.color}>
                <path d={item.icon} />
              </svg>
            </div>
            <span className={`text-xs font-medium ${item.color}`}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
