"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Application, StepId } from "@/lib/types";
import { STEPS, getVisibleSteps } from "@/lib/constants";
import { buildStepsMap, daysBetween, getOutlierMax } from "@/lib/utils";
import { getSavedPinHash } from "@/lib/pin";
import { Select } from "@/components/ui";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MO[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function fmtShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MO[d.getMonth()]} ${d.getDate()}`;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ============================================
// Step-by-step timeline row — vertical timeline with state-aware node.
// Five visual states drive everything: done, next, overdue, future, ungrouped.
// ============================================
type TimelineState = "done" | "next" | "overdue" | "future" | "ungrouped";

function TimelineRow({
  state,
  label,
  sublabel,
  date,
  dateMeta,
  isIrccFallback,
}: {
  state: TimelineState;
  label: string;
  sublabel: string | null;
  date: string | null;
  dateMeta: string | null;
  isIrccFallback?: boolean;
}) {
  // Node ring + fill per state. Done is the only solid filled node.
  const nodeClass = {
    done:      "bg-brand-500 shadow-md shadow-brand-500/30",
    next:      "bg-white border-[3px] border-warn",
    overdue:   "bg-white border-[3px] border-brand-500",
    future:    "bg-white border-2 border-sand-300",
    ungrouped: "bg-sand-50 border border-dashed border-sand-300",
  }[state];

  // Inner dot / icon per state.
  const nodeInner = state === "done" ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17L4 12" />
    </svg>
  ) : state === "next" ? (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-warn opacity-70 animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-warn" />
    </span>
  ) : state === "overdue" ? (
    <span className="w-2 h-2 rounded-full bg-brand-500" />
  ) : state === "future" ? (
    <span className="w-1.5 h-1.5 rounded-full bg-sand-300" />
  ) : null;

  // Right-side date pill color
  const dateClass = {
    done:      "text-brand-700",
    next:      "text-warn-dark",
    overdue:   "text-brand-700",
    future:    "text-sand-600",
    ungrouped: "text-sand-400",
  }[state];

  const sublabelClass = {
    done:      "text-brand-600",
    next:      "text-warn-dark/80",
    overdue:   "text-brand-700/80",
    future:    "text-sand-500",
    ungrouped: "text-sand-400",
  }[state];

  return (
    <div className="relative flex items-start gap-3.5 py-2.5">
      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${nodeClass}`}>
        {nodeInner}
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[14px] font-bold ${state === "ungrouped" ? "text-sand-500" : "text-sand-900"}`}>{label}</span>
          {state === "next" && <span className="text-[9px] font-bold text-warn-dark uppercase tracking-wider bg-warn/15 px-1.5 py-0.5 rounded">Next</span>}
          {state === "overdue" && <span className="text-[9px] font-bold text-brand-700 uppercase tracking-wider bg-brand-500/15 px-1.5 py-0.5 rounded">Due soon</span>}
          {isIrccFallback && state !== "done" && state !== "next" && (
            <span className="text-[9px] text-sand-400 italic">IRCC est.</span>
          )}
        </div>
        {sublabel && <p className={`text-[11px] mt-0.5 ${sublabelClass}`}>{sublabel}</p>}
      </div>
      {date && (
        <div className="text-right flex-shrink-0 pt-1">
          <div className={`text-[13px] font-bold leading-none ${dateClass}`}>{date}</div>
          {dateMeta && <div className="text-[10px] text-sand-400 mt-1">{dateMeta}</div>}
        </div>
      )}
    </div>
  );
}

function getTodayStr(): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function CalculatorPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, []);
  const [submittedDate, setSubmittedDate] = useState("");
  const [stream, setStream] = useState("Outland");
  const [country, setCountry] = useState("");
  const [autoDetected, setAutoDetected] = useState(false);
  const [myStepsMap, setMyStepsMap] = useState<Record<StepId, string | null> | null>(null);
  const visibleSteps = useMemo(() => getVisibleSteps(stream as "Outland" | "Inland"), [stream]);

  const fetchApps = useCallback(async () => {
    const res = await fetch("/api/applications");
    const data = await res.json();
    if (Array.isArray(data)) setApps(data as Application[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // Auto-detect user's entry and their completed steps
  useEffect(() => {
    if (apps.length === 0 || autoDetected) return;
    const myEntry = apps.find(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash);
    if (myEntry) {
      const s = buildStepsMap(myEntry.step_events || []);
      if (s.submitted) {
        setSubmittedDate(s.submitted);
        setStream(myEntry.stream);
        setCountry(myEntry.country_origin);
        setMyStepsMap(s);
        setAutoDetected(true);
      }
    }
  }, [apps, autoDetected]);

  // Figure out which steps the user completed and what comes next
  const myProgress = useMemo(() => {
    if (!myStepsMap) return null;
    let latestCompletedIdx = -1;
    for (let i = visibleSteps.length - 1; i >= 0; i--) {
      if (myStepsMap[visibleSteps[i].id]) { latestCompletedIdx = i; break; }
    }
    // Find first incomplete step
    let nextStepIdx: number | null = null;
    for (let i = latestCompletedIdx + 1; i < visibleSteps.length; i++) {
      if (!myStepsMap[visibleSteps[i].id]) { nextStepIdx = i; break; }
    }
    const nextStep = nextStepIdx !== null ? visibleSteps[nextStepIdx] : null;
    const latestStep = latestCompletedIdx >= 0 ? visibleSteps[latestCompletedIdx] : null;
    const latestStepDate = latestStep ? myStepsMap[latestStep.id] : null;
    const hasAor = !!myStepsMap.aor;
    const isComplete = latestCompletedIdx === visibleSteps.length - 1;
    return { latestCompletedIdx, nextStep, nextStepIdx, latestStep, latestStepDate, hasAor, isComplete };
  }, [myStepsMap, visibleSteps]);

  // AOR community data
  const aorData = useMemo(() => {
    const streamApps = apps.filter(a => a.stream === stream);
    const allAorDays: number[] = [];
    const countryAorDays: number[] = [];
    streamApps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      if (s.submitted && s.aor) {
        const d = daysBetween(s.submitted, s.aor);
        if (d < 0 || d > getOutlierMax(a.province)) return;
        allAorDays.push(d);
        if (country && a.country_origin.toLowerCase() === country.toLowerCase()) {
          countryAorDays.push(d);
        }
      }
    });
    allAorDays.sort((a, b) => a - b);
    countryAorDays.sort((a, b) => a - b);
    const avg = allAorDays.length >= 2 ? Math.round(allAorDays.reduce((a, b) => a + b, 0) / allAorDays.length) : null;
    const p25 = allAorDays.length >= 4 ? percentile(allAorDays, 25) : null;
    const p75 = allAorDays.length >= 4 ? percentile(allAorDays, 75) : null;
    const countryAvg = countryAorDays.length >= 2 ? Math.round(countryAorDays.reduce((a, b) => a + b, 0) / countryAorDays.length) : null;
    return { allAorDays, avg, p25, p75, countryAvg, countryCount: countryAorDays.length, totalReports: allAorDays.length };
  }, [apps, stream, country]);

  // Next-step community data (for users past AOR)
  const nextStepData = useMemo(() => {
    if (!myProgress?.nextStep || !myProgress.latestStep || !myProgress.latestStepDate) return null;
    const prevId = myProgress.latestStep.id;
    const nextId = myProgress.nextStep.id;
    const streamApps = apps.filter(a => a.stream === stream);
    const durations: number[] = [];
    streamApps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      if (s[prevId] && s[nextId]) {
        const d = daysBetween(s[prevId]!, s[nextId]!);
        const max = getOutlierMax(a.province); if (d >= 0 && d <= max) durations.push(d);
      }
    });
    durations.sort((a, b) => a - b);
    const avg = durations.length >= 1 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
    const p25 = durations.length >= 4 ? percentile(durations, 25) : null;
    const p75 = durations.length >= 4 ? percentile(durations, 75) : null;
    return { avg, p25, p75, reports: durations.length };
  }, [apps, stream, myProgress]);

  // Queue position (only when AOR pending)
  const queueData = useMemo(() => {
    if (!submittedDate || myProgress?.hasAor) return null;
    const waiting = apps.filter(a => {
      if (a.stream !== stream) return false;
      const s = buildStepsMap(a.step_events || []);
      return s.submitted && !s.aor;
    });
    const aheadOfMe = waiting.filter(a => {
      const s = buildStepsMap(a.step_events || []);
      return s.submitted! < submittedDate;
    });
    return { total: waiting.length, ahead: aheadOfMe.length, position: aheadOfMe.length + 1 };
  }, [apps, stream, submittedDate, myProgress]);

  // Cohort stats (only when AOR pending)
  const cohortData = useMemo(() => {
    if (!submittedDate || myProgress?.hasAor) return null;
    const d = new Date(submittedDate + "T00:00:00");
    const day = d.getDay();
    const start = new Date(d); start.setDate(start.getDate() - day);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const cohort = apps.filter(a => {
      const s = buildStepsMap(a.step_events || []);
      if (!s.submitted) return false;
      const sd = new Date(s.submitted + "T00:00:00");
      return sd >= start && sd <= end;
    });
    const gotAor = cohort.filter(a => { const s = buildStepsMap(a.step_events || []); return !!s.aor; });
    return { total: cohort.length, gotAor: gotAor.length, pct: cohort.length > 0 ? Math.round((gotAor.length / cohort.length) * 100) : 0 };
  }, [apps, submittedDate, myProgress]);

  // Step-by-step estimates — correct base for each step type
  // Applicant-action steps chain from their trigger step
  // IRCC-initiated steps measure from AOR
  const STEP_BASE: Record<string, string> = {
    // Each step's base = the step that immediately precedes it in the chain.
    // The /me Timeline uses the same chained logic — keeping them in sync so
    // "47d from BIL" on /me means the same thing as "47d from BIL" on
    // /calculator.
    aor: "submitted",
    bil: "aor",
    biometrics_given: "bil",
    biometrics_done: "biometrics_given",
    sponsor_eligibility: "aor",
    medical: "aor",
    medicals_attended: "medical",
    medical_passed: "medicals_attended",
    pa_eligibility: "aor",
    pre_arrival: "aor",
    background_started: "aor",
    background: "aor",
    portal1: "aor",
    portal2: "portal1",
    ppr: "aor",
    passport_received: "ppr",
    ecopr: "aor",
  };

  const stepEstimates = useMemo(() => {
    const streamApps = apps.filter(a => a.stream === stream);
    return visibleSteps.slice(1).map((step) => {
      const durations: number[] = [];
      const baseStepId = (STEP_BASE[step.id] || "aor") as StepId;
      streamApps.forEach((a) => {
        const s = buildStepsMap(a.step_events || []);
        if (!s[step.id]) return;
        const baseDate = s[baseStepId] || null;
        if (!baseDate) return;

        const d = daysBetween(baseDate, s[step.id]!);
        const max = getOutlierMax(a.province); if (d >= 0 && d <= max) durations.push(d);
      });
      const rawAvg = durations.length >= 1 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
      const communityAvg = rawAvg !== null && rawAvg <= 900 ? rawAvg : null;
      const weeksRange = stream === "Outland" ? step.avgWeeksOutland : step.avgWeeksInland;
      const irccFallback = weeksRange ? Math.round(((weeksRange[0] + weeksRange[1]) / 2) * 7) : null;
      const avg = communityAvg ?? irccFallback;
      const isIrccFallback = communityAvg === null && irccFallback !== null;
      const isFromAor = baseStepId === "aor" && step.id !== "aor";
      return { step, avg, reports: durations.length, isIrccFallback, isFromAor, baseStepId };
    });
  }, [apps, stream, visibleSteps]);

  // Timeline with actual dates for completed steps
  const timeline = useMemo(() => {
    if (!submittedDate) return null;

    // Build a map of actual + estimated dates for each step
    const dateMap: Record<string, string> = { submitted: submittedDate };
    if (myStepsMap) {
      Object.entries(myStepsMap).forEach(([k, v]) => { if (v) dateMap[k] = v; });
    }

    return stepEstimates.map(({ step, avg, isIrccFallback, isFromAor, baseStepId }) => {
      const actualDate = myStepsMap ? myStepsMap[step.id] : null;
      let estDate: string | null = null;

      if (!actualDate && avg != null) {
        const baseDate = dateMap[baseStepId];
        if (baseDate) {
          estDate = addDays(baseDate, avg);
        }
      }

      // Store actual or estimated date for downstream steps to use
      if (actualDate) {
        dateMap[step.id] = actualDate;
      } else if (estDate) {
        dateMap[step.id] = estDate;
      }

      return {
        id: step.id, label: step.label, shortLabel: step.shortLabel,
        estDate, actualDate, avgDays: avg, isIrccFallback, isFromAor,
        baseStepId,
      };
    });
  }, [submittedDate, stepEstimates, myStepsMap]);

  // AOR prediction (only when AOR NOT completed)
  const aorPrediction = useMemo(() => {
    if (!submittedDate || aorData.avg == null || myProgress?.hasAor) return null;
    const today = getTodayStr();
    const daysSoFar = daysBetween(submittedDate, today);
    const predicted = addDays(submittedDate, aorData.avg);
    const daysRemaining = Math.max(0, aorData.avg - daysSoFar);
    const optimistic = aorData.p25 != null ? addDays(submittedDate, Math.min(aorData.p25, aorData.avg!)) : null;
    const pessimistic = aorData.p75 != null ? addDays(submittedDate, Math.max(aorData.p75, aorData.avg!)) : null;
    const countryPredicted = aorData.countryAvg != null ? addDays(submittedDate, aorData.countryAvg) : null;
    const progressPct = aorData.avg > 0 ? Math.min(Math.round((daysSoFar / aorData.avg) * 100), 100) : 0;
    return { predicted, daysRemaining, daysSoFar, optimistic, pessimistic, countryPredicted, progressPct };
  }, [submittedDate, aorData, myProgress]);

  // Next-step prediction (when AOR is done)
  const nextPrediction = useMemo(() => {
    if (!myProgress?.nextStep || !myProgress.latestStepDate || !nextStepData?.avg || !myProgress.hasAor) return null;
    const prevDate = myProgress.latestStepDate;
    const today = getTodayStr();
    const daysSincePrev = daysBetween(prevDate, today);
    const predicted = addDays(prevDate, nextStepData.avg);
    const daysRemaining = Math.max(0, nextStepData.avg - daysSincePrev);
    const progressPct = nextStepData.avg > 0 ? Math.min(Math.round((daysSincePrev / nextStepData.avg) * 100), 100) : 0;
    const optimistic = nextStepData.p25 != null ? addDays(prevDate, Math.min(nextStepData.p25, nextStepData.avg)) : null;
    const pessimistic = nextStepData.p75 != null ? addDays(prevDate, Math.max(nextStepData.p75, nextStepData.avg)) : null;
    return {
      stepLabel: myProgress.nextStep.label, fromStepLabel: myProgress.latestStep!.label,
      predicted, daysRemaining, daysSincePrev, progressPct, optimistic, pessimistic,
      avgDays: nextStepData.avg, reports: nextStepData.reports,
    };
  }, [myProgress, nextStepData]);

  const prediction = aorPrediction;
  const irccDays = stream === "Outland" ? 456 : 639;
  const irccMonths = stream === "Outland" ? 15 : 21;
  const hasInput = submittedDate.length > 0;
  const isComplete = myProgress?.isComplete ?? false;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-sand-200 rounded-xl p-4 h-32 animate-pulse" />
        <div className="bg-white border border-sand-200 rounded-xl p-4 h-48 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="mb-5">
        <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1">Estimator</p>
        <h1 className="text-2xl font-bold text-sand-900 tracking-tight">When will I finish?</h1>
        <p className="text-[13px] text-sand-500 mt-0.5 leading-relaxed">
          {autoDetected
            ? "Personalized predictions from your application + community data."
            : "Enter your dates to see predictions from community data."}
        </p>
      </div>

      {/* Input form */}
      <div className="bg-white border border-sand-200 rounded-2xl p-4 mb-5 shadow-[0_1px_2px_rgba(26,26,24,0.04)]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">Submission date</label>
            <input
              type="date"
              className="px-3 py-2.5 rounded-lg border border-sand-200 text-sm bg-sand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 focus:bg-white transition-colors nums-tabular"
              value={submittedDate}
              onChange={(e) => setSubmittedDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <Select
            label="Stream"
            value={stream}
            onChange={(e) => setStream(e.target.value)}
            options={[{ value: "Outland", label: "Outland" }, { value: "Inland", label: "Inland" }]}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">Country <span className="font-normal lowercase tracking-normal text-sand-400">(optional)</span></label>
            <input
              type="text"
              className="px-3 py-2.5 rounded-lg border border-sand-200 text-sm bg-sand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 focus:bg-white transition-colors placeholder:text-sand-400"
              placeholder="e.g. India"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>
        {autoDetected && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-brand-600 font-semibold bg-brand-500/10 px-2.5 py-1 rounded-full">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12"/></svg>
            Auto-filled from your entry
          </div>
        )}
      </div>

      {/* COMPLETE STATE */}
      {hasInput && isComplete && (
        <div className="tile-brand text-white rounded-2xl p-6 mb-4 text-center shadow-lg shadow-brand-500/15">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/15 mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12"/></svg>
          </div>
          <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.08em] mb-1">Journey complete</p>
          <div className="text-2xl font-bold mb-1 tracking-tight">eCoPR received</div>
          <p className="text-sm text-white/80">Congratulations — your sponsorship is done.</p>
        </div>
      )}

      {/* AOR PREDICTION (only when AOR is still pending) */}
      {hasInput && !isComplete && prediction && (
        <>
          <div className="tile-brand text-white rounded-2xl p-5 mb-4 shadow-lg shadow-brand-500/15">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/70 mb-1">Predicted AOR date</p>
            <div className="text-[34px] font-bold mb-1 leading-none tracking-tight nums-tabular">{fmtDate(prediction.predicted)}</div>
            <div className="text-[13px] text-white/85 mb-4 nums-tabular">
              {prediction.daysRemaining > 0
                ? <>~<span className="font-bold">{prediction.daysRemaining}</span> days remaining</>
                : "Your AOR could arrive any day now."}
            </div>
            <div className="bg-white/20 rounded-full h-2 overflow-hidden mb-2">
              <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.max(prediction.progressPct, 3)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-white/60 font-semibold nums-tabular">
              <span>Day {prediction.daysSoFar}</span>
              <span>Avg {aorData.avg}d</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white border border-sand-200 rounded-xl p-4">
              <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-2.5">Confidence range</div>
              {prediction.optimistic && prediction.pessimistic ? (
                <>
                  <div className="space-y-1.5 nums-tabular">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-brand-600 font-semibold">Best case</span>
                      <span className="text-[12px] font-bold text-brand-600">{fmtShort(prediction.optimistic)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-sand-600 font-semibold">Average</span>
                      <span className="text-[12px] font-bold text-sand-800">{fmtShort(prediction.predicted)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-warn-dark font-semibold">Conservative</span>
                      <span className="text-[12px] font-bold text-warn-dark">{fmtShort(prediction.pessimistic)}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-sand-400 mt-2">25th–75th percentile</div>
                </>
              ) : (
                <div className="text-[11px] text-sand-400">Need more data</div>
              )}
            </div>
            {queueData && (
              <div className="bg-white border border-sand-200 rounded-xl p-4">
                <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-2.5">Queue position</div>
                <div className="text-3xl font-bold text-sand-900 leading-none nums-tabular">#{queueData.position}</div>
                <div className="text-[11px] text-sand-500 mt-1 nums-tabular">of {queueData.total} waiting</div>
                <div className="text-[10px] text-sand-400 mt-0.5 nums-tabular">{queueData.ahead} submitted before you</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {cohortData && (
              <div className="bg-white border border-sand-200 rounded-xl p-4">
                <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-2.5">Your cohort</div>
                <div className="text-3xl font-bold text-brand-600 leading-none nums-tabular">{cohortData.pct}<span className="text-xl">%</span></div>
                <div className="text-[11px] text-sand-500 mt-1">got AOR</div>
                <div className="text-[10px] text-sand-400 mt-0.5 nums-tabular">{cohortData.gotAor} of {cohortData.total} in your week</div>
              </div>
            )}
            <div className="bg-white border border-sand-200 rounded-xl p-4">
              <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-2.5">
                {country ? `${country} avg` : "Community stats"}
              </div>
              {prediction.countryPredicted && country ? (
                <>
                  <div className="text-2xl font-bold text-sand-900 leading-none nums-tabular">{aorData.countryAvg}<span className="text-base font-semibold">d</span></div>
                  <div className="text-[11px] text-sand-500 mt-1">avg days to AOR</div>
                  <div className="text-[10px] text-sand-400 mt-0.5 nums-tabular">{aorData.countryCount} reports from {country}</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-sand-900 leading-none nums-tabular">{aorData.avg}<span className="text-base font-semibold">d</span></div>
                  <div className="text-[11px] text-sand-500 mt-1">avg days to AOR</div>
                  <div className="text-[10px] text-sand-400 mt-0.5 nums-tabular">{aorData.totalReports} {stream} reports</div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* NEXT STEP PREDICTION (AOR done, predicting next milestone) */}
      {hasInput && !isComplete && !prediction && nextPrediction && (
        <>
          <div className="tile-brand text-white rounded-2xl p-5 mb-4 shadow-lg shadow-brand-500/15">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/70 mb-1">
              Predicted {nextPrediction.stepLabel}
            </p>
            <div className="text-[34px] font-bold mb-1 leading-none tracking-tight nums-tabular">{fmtDate(nextPrediction.predicted)}</div>
            <div className="text-[13px] text-white/85 mb-4 nums-tabular">
              {nextPrediction.daysRemaining > 0
                ? <>~<span className="font-bold">{nextPrediction.daysRemaining}</span> days from {nextPrediction.fromStepLabel}</>
                : `${nextPrediction.stepLabel} could arrive any day now.`}
            </div>
            <div className="bg-white/20 rounded-full h-2 overflow-hidden mb-2">
              <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.max(nextPrediction.progressPct, 3)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-white/60 font-semibold nums-tabular">
              <span>{nextPrediction.daysSincePrev}d since {nextPrediction.fromStepLabel}</span>
              <span>Avg {nextPrediction.avgDays}d</span>
            </div>
          </div>

          {(nextPrediction.optimistic || nextPrediction.pessimistic) && (
            <div className="bg-white border border-sand-200 rounded-xl p-4 mb-4">
              <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-2.5">
                {nextPrediction.stepLabel} confidence range
              </div>
              <div className="space-y-1.5 nums-tabular">
                {nextPrediction.optimistic && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-brand-600 font-semibold">Best case</span>
                    <span className="text-[12px] font-bold text-brand-600">{fmtShort(nextPrediction.optimistic)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-sand-600 font-semibold">Average</span>
                  <span className="text-[12px] font-bold text-sand-800">{fmtShort(nextPrediction.predicted)}</span>
                </div>
                {nextPrediction.pessimistic && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-warn-dark font-semibold">Conservative</span>
                    <span className="text-[12px] font-bold text-warn-dark">{fmtShort(nextPrediction.pessimistic)}</span>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-sand-400 mt-2 nums-tabular">Based on {nextPrediction.reports} reports</div>
            </div>
          )}
        </>
      )}

      {/* STEP-BY-STEP TIMELINE */}
      {hasInput && !isComplete && timeline && (
        <>
          <div className="bg-white border border-sand-200 rounded-2xl p-5 mb-4">
            <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1">Forecast</p>
            <h2 className="text-base font-bold text-sand-900 tracking-tight mb-1">Step-by-step timeline</h2>
            <p className="text-[11px] text-sand-500 mb-5 nums-tabular">Based on {apps.filter(a => a.stream === stream).length} {stream} applications</p>

            {/* Vertical timeline — connector line + node circles. Submitted is
                the anchor at the top; subsequent rows show done / next / overdue
                / future state via the node + a right-aligned date pill. */}
            <div className="relative nums-tabular">
              {/* The connector line sits behind the nodes, from the centre of
                  the first node to the centre of the last. */}
              <div className="absolute left-[19px] top-5 bottom-5 w-[2px] bg-sand-200" aria-hidden="true" />

              <div className="space-y-0">
                {/* Submitted — always done, always first */}
                <TimelineRow
                  state="done"
                  label="Submitted"
                  sublabel="Application filed"
                  date={fmtDate(submittedDate)}
                  dateMeta="Day 0"
                />

                {timeline.map((s) => {
                  const isCompleted = !!s.actualDate;
                  const isNextStep = !!(myProgress && myProgress.nextStep && s.id === myProgress.nextStep.id);
                  const isPastEstimate = !isCompleted && !!s.estDate && new Date(s.estDate + "T00:00:00") <= new Date();

                  // "X days from Y" — uses the same chained base map as /me
                  // so labels are consistent across surfaces.
                  let daysFromBase: number | null = null;
                  let baseLabel = "";
                  if (isCompleted && s.actualDate && myStepsMap) {
                    const baseDate = myStepsMap[s.baseStepId];
                    if (baseDate) {
                      daysFromBase = daysBetween(baseDate, s.actualDate);
                      baseLabel = (
                        s.baseStepId === "submitted" ? "from sub"
                        : s.baseStepId === "aor" ? "from AOR"
                        : s.baseStepId === "bil" ? "from BIL"
                        : s.baseStepId === "biometrics_given" ? "from Bio Given"
                        : s.baseStepId === "medical" ? "from Med Req"
                        : s.baseStepId === "medicals_attended" ? "from Med Attended"
                        : s.baseStepId === "portal1" ? "from Portal 1"
                        : s.baseStepId === "ppr" ? "from PPR"
                        : `from ${s.baseStepId}`
                      );
                    }
                  }

                  const state: TimelineState = isCompleted
                    ? "done"
                    : isNextStep
                    ? "next"
                    : isPastEstimate
                    ? "overdue"
                    : s.estDate
                    ? "future"
                    : "ungrouped";

                  // Right-hand date label
                  let date: string | null = null;
                  let dateMeta: string | null = null;
                  if (isCompleted && s.actualDate) {
                    date = fmtDate(s.actualDate);
                    if (daysFromBase != null) dateMeta = `${daysFromBase}d ${baseLabel}`;
                  } else if (s.estDate) {
                    date = `~ ${fmtDate(s.estDate)}`;
                    if (state === "overdue") dateMeta = "should be soon";
                    else if (state === "next") dateMeta = s.avgDays != null ? `~${s.avgDays}d typical` : "next up";
                    else if (s.isIrccFallback) dateMeta = "IRCC estimate";
                    else if (s.avgDays != null) dateMeta = `~${s.avgDays}d typical`;
                  }

                  // Sublabel for future/estimated steps — pull the same
                  // "from X" phrasing used in the daysFromBase computation
                  // above, derived from baseStepId.
                  const fromLabel = (
                    s.baseStepId === "submitted" ? "from submitted"
                    : s.baseStepId === "aor" ? "from AOR"
                    : s.baseStepId === "bil" ? "from BIL"
                    : s.baseStepId === "biometrics_given" ? "from Bio Given"
                    : s.baseStepId === "medical" ? "from Med Req"
                    : s.baseStepId === "medicals_attended" ? "from Med Attended"
                    : s.baseStepId === "portal1" ? "from Portal 1"
                    : s.baseStepId === "ppr" ? "from PPR"
                    : `from ${s.baseStepId}`
                  );

                  // Left-hand sublabel under the step name
                  let sublabel: string | null = null;
                  if (state === "done" && daysFromBase != null) sublabel = `Took ${daysFromBase}d ${baseLabel}`;
                  else if (state === "next") sublabel = "Next up";
                  else if (state === "overdue") sublabel = "Past the typical window";
                  else if (s.avgDays != null) sublabel = `~${s.avgDays}d ${fromLabel}`;

                  return (
                    <TimelineRow
                      key={s.shortLabel}
                      state={state}
                      label={s.label}
                      sublabel={sublabel}
                      date={date}
                      dateMeta={dateMeta}
                      isIrccFallback={s.isIrccFallback}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-sand-200 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1">Benchmarks</p>
            <h2 className="text-base font-bold text-sand-900 tracking-tight mb-3">Processing estimates</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-sand-200 rounded-xl p-3.5">
                <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1.5">IRCC published</div>
                <div className="text-2xl font-bold text-sand-800 leading-none nums-tabular">{irccMonths}<span className="text-base font-semibold ml-0.5">mo</span></div>
                <div className="text-[10px] text-sand-400 mt-1 nums-tabular">Total to PR ({irccDays}d)</div>
              </div>
              <div className="bg-brand-500/[0.06] rounded-xl p-3.5 border border-brand-500/20">
                <div className="text-[10px] font-bold text-brand-700 uppercase tracking-[0.08em] mb-1.5">Community avg</div>
                <div className="text-2xl font-bold text-brand-600 leading-none nums-tabular">
                  {aorData.avg != null ? <>{aorData.avg}<span className="text-base font-semibold">d</span></> : "\u2014"}
                </div>
                <div className="text-[10px] text-brand-600/80 mt-1 nums-tabular">to AOR ({aorData.totalReports} reports)</div>
              </div>
            </div>
            <div className="text-[10px] text-sand-400 mt-3 text-center">IRCC = total journey to PR · Community = days to AOR only</div>
          </div>

          <p className="text-[11px] text-sand-400 text-center mb-4 leading-relaxed nums-tabular">
            Estimates based on community averages ({aorData.totalReports} reports) and IRCC published times. Actual timelines vary.
          </p>
        </>
      )}

      {!hasInput && (
        <div className="text-center py-16 bg-white border border-sand-200 rounded-2xl">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6V12L16 14" /><circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <p className="text-sand-900 text-base font-bold tracking-tight mb-1">Enter your submission date</p>
          <p className="text-sand-500 text-[13px] max-w-xs mx-auto leading-relaxed">Get predicted AOR date, queue position, and a step-by-step timeline.</p>
        </div>
      )}
    </div>
  );
}
