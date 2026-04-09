"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Application } from "@/lib/types";
import { STEPS, getNextStep } from "@/lib/constants";
import { buildStepsMap, daysBetween, formatDate } from "@/lib/utils";
import { getSavedPinHash } from "@/lib/pin";
import { Modal } from "@/components/ui";
import { MeSkeleton } from "@/components/Skeletons";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function getWeekRange(dateStr: string): { start: Date; end: Date; label: string } {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const label = `${fmt(start.toISOString().split("T")[0])} \u2013 ${fmt(end.toISOString().split("T")[0])}, ${end.getFullYear()}`;
  return { start, end, label };
}

function stepLabel(id: string): string {
  return STEPS.find(s => s.id === id)?.label || id;
}

function nextStepLabel(currentStep: string): string {
  const next = getNextStep(currentStep as any);
  return next ? stepLabel(next) : "Complete";
}

interface CohortPerson {
  id: string;
  initials: string;
  country: string;
  stream: string;
  sponsor_status: string;
  submitted: string;
  aorDate: string | null;
  currentStep: string;
  nextStep: string | null;
  completedCount: number;
  daysWaiting: number;
  isMe: boolean;
  isComplete: boolean;
  app: Application;
}

export default function CohortPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewPersonId, setViewPersonId] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .order("created_at", { ascending: true });
    if (data) setApps(data as Application[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const myApp = apps.find(a => a.id === id);
  const mySteps = myApp ? buildStepsMap(myApp.step_events || []) : null;
  const mySubmitted = mySteps?.submitted;

  const week = mySubmitted ? getWeekRange(mySubmitted) : null;

  const cohort: CohortPerson[] = useMemo(() => {
    if (!week || !mySubmitted) return [];
    return apps
      .filter(a => {
        const s = buildStepsMap(a.step_events || []);
        if (!s.submitted) return false;
        const d = new Date(s.submitted + "T00:00:00");
        return d >= week.start && d <= week.end;
      })
      .map(a => {
        const s = buildStepsMap(a.step_events || []);
        const today = new Date().toISOString().split("T")[0];
        const completedCount = STEPS.filter(st => s[st.id]).length;
        const next = getNextStep(a.current_step as any);
        return {
          id: a.id,
          initials: a.initials,
          country: a.country_origin,
          stream: a.stream,
          sponsor_status: a.sponsor_status,
          submitted: s.submitted!,
          aorDate: s.aor || null,
          currentStep: a.current_step,
          nextStep: next,
          completedCount,
          daysWaiting: s.submitted ? daysBetween(s.submitted, s.aor || today) : 0,
          isMe: a.id === id,
          isComplete: a.is_complete || a.current_step === "ecopr",
          app: a,
        };
      })
      .sort((a, b) => a.submitted.localeCompare(b.submitted));
  }, [apps, week, mySubmitted, id]);

  const gotAor = cohort.filter(c => c.aorDate);
  const waiting = cohort.filter(c => !c.aorDate);
  const viewPerson = viewPersonId ? cohort.find(c => c.id === viewPersonId) || null : null;

  // Stage distribution — what step people are WAITING for
  const waitingForDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    cohort.forEach(p => {
      if (p.isComplete) {
        counts["complete"] = (counts["complete"] || 0) + 1;
      } else {
        const waitingFor = p.nextStep || "aor";
        counts[waitingFor] = (counts[waitingFor] || 0) + 1;
      }
    });
    // Build ordered list
    const result: { id: string; label: string; count: number; pct: number }[] = [];
    STEPS.forEach(s => {
      if (counts[s.id]) {
        result.push({
          id: s.id,
          label: `Waiting for ${s.label}`,
          count: counts[s.id],
          pct: cohort.length > 0 ? Math.round((counts[s.id] / cohort.length) * 100) : 0,
        });
      }
    });
    if (counts["complete"]) {
      result.push({
        id: "complete",
        label: "Journey Complete",
        count: counts["complete"],
        pct: cohort.length > 0 ? Math.round((counts["complete"] / cohort.length) * 100) : 0,
      });
    }
    return result;
  }, [cohort]);

  if (loading) return <MeSkeleton />;

  if (!myApp || !mySubmitted || !week) {
    return (
      <div className="py-12 text-center">
        <p className="text-sand-500 mb-4">Application not found</p>
        <button onClick={() => router.push("/dashboard")} className="text-sm text-brand-500 font-medium">Back to My App</button>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <button onClick={() => router.push("/dashboard")}
        className="flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-800 transition-colors mb-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19L5 12L12 5"/></svg>
        Back
      </button>

      {/* Header */}
      <div className="bg-white border border-sand-200 rounded-2xl p-5 mb-4">
        <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-1">Your Submission Week</div>
        <h1 className="text-lg font-bold text-sand-900 mb-1">{week.label}</h1>
        <p className="text-xs text-sand-500 mb-4">
          {cohort.length} {cohort.length === 1 ? "person" : "people"} submitted this week
        </p>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-brand-50 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-brand-600">{gotAor.length}</div>
            <div className="text-[9px] text-brand-500 font-medium">Got AOR</div>
          </div>
          <div className="bg-warn-light rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-warn-dark">{waiting.length}</div>
            <div className="text-[9px] text-warn-dark font-medium">Waiting</div>
          </div>
          <div className="bg-sand-50 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-sand-700">{cohort.length > 0 ? Math.round((gotAor.length / cohort.length) * 100) : 0}%</div>
            <div className="text-[9px] text-sand-500 font-medium">AOR Rate</div>
          </div>
        </div>
      </div>

      {/* Stage Distribution — what step people are waiting for */}
      {waitingForDistribution.length > 0 && (
        <div className="bg-white border border-sand-200 rounded-xl p-4 mb-4">
          <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-3">Where Everyone Is</div>
          <div className="space-y-2">
            {waitingForDistribution.map(stage => (
              <div key={stage.id} className="flex items-center gap-2">
                <div className="w-[88px] text-[10px] text-sand-600 font-medium truncate flex-shrink-0">{stage.label}</div>
                <div className="flex-1 h-5 bg-sand-100 rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(stage.pct, 8)}%`,
                      backgroundColor: stage.id === "complete" ? "#1B4331"
                        : stage.id === "aor" ? "#D4A843"
                        : "#52B788",
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-sand-700">
                    {stage.count} ({stage.pct}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Got AOR */}
      {gotAor.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider mb-2 px-1">
            Got AOR ({gotAor.length})
          </div>
          <div className="space-y-1.5 entries-stagger">
            {gotAor.map(person => (
              <PersonCard key={person.id} person={person} onTap={() => setViewPersonId(person.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Waiting */}
      {waiting.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-semibold text-warn-dark uppercase tracking-wider mb-2 px-1">
            Waiting for AOR ({waiting.length})
          </div>
          <div className="space-y-1.5 entries-stagger">
            {waiting.map(person => (
              <PersonCard key={person.id} person={person} onTap={() => setViewPersonId(person.id)} />
            ))}
          </div>
        </div>
      )}

      <p className="text-[9px] text-sand-400 mt-3 text-center">
        Tap any card to view their timeline
      </p>

      {/* Read-only timeline modal */}
      {viewPerson && (
        <TimelineModal
          person={viewPerson}
          onClose={() => setViewPersonId(null)}
          onGoToTracker={viewPerson.isMe ? () => router.push("/dashboard") : undefined}
        />
      )}
    </div>
  );
}

function PersonCard({ person, onTap }: { person: CohortPerson; onTap: () => void }) {
  const totalSteps = STEPS.length;
  const progressPct = Math.round((person.completedCount / totalSteps) * 100);

  return (
    <div
      onClick={onTap}
      className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
        person.isMe
          ? "bg-brand-50 border-2 border-brand-300"
          : "bg-white border border-sand-200 active:bg-sand-50"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          person.isMe ? "bg-brand-500 text-white" : "bg-sand-100 text-sand-600"
        }`}>
          {person.initials.slice(0, 2).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-sand-900">{person.initials}</span>
            {person.isMe && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-500 text-white font-bold">YOU</span>
            )}
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${
              person.stream === "Outland" ? "bg-brand-100 text-brand-700" : "bg-warn-light text-warn-dark"
            }`}>
              {person.stream}
            </span>
          </div>
          <div className="text-[11px] text-sand-500">
            {person.country} · Sub {fmt(person.submitted)}
          </div>
        </div>

        {/* Current step status */}
        <div className="text-right flex-shrink-0 flex items-center gap-2">
          <div>
            {person.isComplete ? (
              <div className="text-xs font-semibold text-brand-600">Complete ✓</div>
            ) : (
              <>
                <div className={`text-[10px] font-semibold ${person.aorDate ? "text-brand-600" : "text-warn-dark"}`}>
                  Waiting for {person.nextStep ? stepLabel(person.nextStep) : "AOR"}
                </div>
                <div className="text-[9px] text-sand-400">
                  {person.completedCount}/{STEPS.length} · Day {person.daysWaiting}
                </div>
              </>
            )}
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B0ADA6" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18L15 12L9 6" />
          </svg>
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="mt-2 h-1 bg-sand-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progressPct}%`,
            backgroundColor: person.isComplete ? "#1B4331" : person.aorDate ? "#52B788" : "#D4A843",
          }}
        />
      </div>
    </div>
  );
}

function TimelineModal({ person, onClose, onGoToTracker }: {
  person: CohortPerson;
  onClose: () => void;
  onGoToTracker?: () => void;
}) {
  const stepsMap = buildStepsMap(person.app.step_events || []);
  const completedSteps = STEPS.filter(s => stepsMap[s.id]);
  const totalSteps = STEPS.length;
  const progressPct = Math.round((completedSteps.length / totalSteps) * 100);

  return (
    <Modal open={true} onClose={onClose} title={`${person.initials} \u2014 Timeline`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          person.isMe ? "bg-brand-500 text-white" : "bg-sand-100 text-sand-600"
        }`}>
          {person.initials.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-sand-900">{person.initials}</span>
            {person.isMe && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-500 text-white font-bold">YOU</span>
            )}
          </div>
          <div className="text-[11px] text-sand-500">
            {person.country} · {person.stream} · {person.sponsor_status}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-brand-600">{progressPct}%</div>
          <div className="text-[9px] text-sand-400">{completedSteps.length}/{totalSteps} steps</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-sand-100 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Timeline */}
      <div className="space-y-0.5">
        {STEPS.map((step, i) => {
          const date = stepsMap[step.id];
          const prevDate = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
          const days = date && prevDate ? daysBetween(prevDate, date) : null;
          const isDone = !!date;
          const isCurrent = !isDone && i > 0 && !!stepsMap[STEPS[i - 1].id];

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                isDone ? "bg-brand-50/50" : isCurrent ? "bg-warn-light/30" : "opacity-35"
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${
                  isDone ? "bg-brand-500" : isCurrent ? "bg-warn animate-pulse" : "bg-sand-200"
                }`} />
                {i < STEPS.length - 1 && (
                  <div className={`absolute top-3.5 left-[5px] w-px h-3 ${isDone ? "bg-brand-300" : "bg-sand-200"}`} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${isDone ? "text-sand-900" : isCurrent ? "text-warn-dark" : "text-sand-500"}`}>
                  {step.label}
                </div>
                {isDone && (
                  <div className="text-xs text-sand-500">
                    {formatDate(date)}
                    {days != null && i > 0 && (
                      <span className="text-brand-500 font-semibold ml-1">({days}d)</span>
                    )}
                  </div>
                )}
                {isCurrent && (
                  <div className="text-[10px] text-warn-dark font-medium">Waiting...</div>
                )}
              </div>

              {isDone && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M20 6L9 17L4 12"/>
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-sand-100">
        {person.isMe && onGoToTracker ? (
          <button
            onClick={onGoToTracker}
            className="w-full px-4 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-all active:scale-[0.98]"
          >
            Edit on Tracker
          </button>
        ) : (
          <div className="text-center text-[10px] text-sand-400">
            {person.isComplete
              ? "Completed their journey! \uD83C\uDF89"
              : `Currently waiting for: ${nextStepLabel(person.currentStep)}`
            }
          </div>
        )}
      </div>
    </Modal>
  );
}
