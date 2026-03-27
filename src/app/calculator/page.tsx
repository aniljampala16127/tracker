"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";
import { Button, Select } from "@/components/ui";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateNice(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function CalculatorPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittedDate, setSubmittedDate] = useState("");
  const [stream, setStream] = useState("Outland");
  const [country, setCountry] = useState("");
  const [calculated, setCalculated] = useState(false);
  const supabase = createClient();

  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .order("created_at", { ascending: true });
    if (data) setApps(data as Application[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // Compute community averages per step pair, filtered by stream
  const stepEstimates = useMemo(() => {
    const streamApps = apps.filter(a => a.stream === stream);
    return STEPS.slice(1).map((step) => {
      const prev = STEPS[STEPS.indexOf(step) - 1];
      const durations: number[] = [];

      streamApps.forEach((a) => {
        const s = buildStepsMap(a.step_events || []);
        if (s[prev.id] && s[step.id]) {
          durations.push(daysBetween(s[prev.id]!, s[step.id]!));
        }
      });

      const avg = durations.length >= 2
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;
      const min = durations.length >= 2 ? Math.min(...durations) : null;
      const max = durations.length >= 2 ? Math.max(...durations) : null;

      return { step, avg, min, max, reports: durations.length };
    });
  }, [apps, stream]);

  // IRCC official total days
  const irccDays = stream === "Outland" ? 456 : 639;
  const irccMonths = stream === "Outland" ? 15 : 21;

  // Compute cumulative estimate
  const timeline = useMemo(() => {
    if (!submittedDate) return null;

    const steps: { label: string; shortLabel: string; estDate: string | null; avgDays: number | null; cumDays: number }[] = [];
    let cumDays = 0;

    stepEstimates.forEach(({ step, avg }) => {
      // Use community avg if available, otherwise IRCC-proportional estimate
      const daysForStep = avg != null ? avg : null;
      if (daysForStep != null) cumDays += daysForStep;

      steps.push({
        label: step.label,
        shortLabel: step.shortLabel,
        estDate: daysForStep != null ? addDays(submittedDate, cumDays) : null,
        avgDays: daysForStep,
        cumDays,
      });
    });

    // IRCC-based completion estimate
    const irccCompletion = addDays(submittedDate, irccDays);
    const communityCompletion = cumDays > 0 ? addDays(submittedDate, cumDays) : null;

    // Days since submission
    const today = new Date().toISOString().split("T")[0];
    const daysSoFar = daysBetween(submittedDate, today);
    const irccPct = Math.min(Math.round((daysSoFar / irccDays) * 100), 100);

    return { steps, irccCompletion, communityCompletion, daysSoFar, irccPct };
  }, [submittedDate, stepEstimates, irccDays]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-sand-900">Completion Estimator</h1>
        <p className="text-xs text-sand-500 mt-0.5">
          Enter your dates to see where you stand and when you might reach each step
        </p>
      </div>

      {/* Input form */}
      <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">Submission Date</label>
            <input
              type="date"
              className="px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
              value={submittedDate}
              onChange={(e) => { setSubmittedDate(e.target.value); setCalculated(true); }}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <Select
            label="Stream"
            value={stream}
            onChange={(e) => setStream(e.target.value)}
            options={[{ value: "Outland", label: "Outland" }, { value: "Inland", label: "Inland" }]}
          />
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">Country (optional)</label>
            <input
              type="text"
              className="px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 placeholder:text-sand-400"
              placeholder="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {calculated && submittedDate && timeline && (
        <>
          {/* Progress bar */}
          <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-sand-900">Your Progress</span>
              <span className="text-xs text-sand-500">{timeline.daysSoFar} days since submission</span>
            </div>
            <div className="bg-sand-200 rounded-full h-4 overflow-hidden mb-2">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                style={{ width: `${Math.max(timeline.irccPct, 5)}%` }}
              >
                {timeline.irccPct >= 15 && (
                  <span className="text-[9px] font-bold text-white">{timeline.irccPct}%</span>
                )}
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-sand-400">
              <span>Submitted {formatDateNice(submittedDate)}</span>
              <span>IRCC est. {formatDateNice(timeline.irccCompletion)} (~{irccMonths}mo)</span>
            </div>
          </div>

          {/* Estimated timeline */}
          <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
            <h2 className="text-sm font-bold text-sand-900 mb-1">Estimated Timeline</h2>
            <p className="text-[11px] text-sand-400 mb-3">Based on community data from {apps.filter(a => a.stream === stream).length} {stream} applications</p>

            <div className="space-y-2">
              {/* Submitted */}
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-brand-500 text-white">
                <div className="w-3 h-3 rounded-full bg-white flex-shrink-0" />
                <div className="flex-1 text-sm font-medium">Submitted</div>
                <div className="text-xs font-semibold">{formatDateNice(submittedDate)}</div>
              </div>

              {timeline.steps.map((s, i) => {
                const isPast = s.estDate && new Date(s.estDate + "T00:00:00") <= new Date();
                return (
                  <div key={s.shortLabel} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                    isPast ? "bg-brand-50/70" : s.estDate ? "bg-white border border-sand-100" : "bg-sand-50 opacity-50"
                  }`}>
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isPast ? "bg-brand-500" : s.estDate ? "bg-sand-300" : "bg-sand-200"}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-sand-900">{s.label}</div>
                      {s.avgDays != null && (
                        <div className="text-[10px] text-sand-400">~{s.avgDays} days from previous step</div>
                      )}
                    </div>
                    <div className="text-right">
                      {s.estDate ? (
                        <div className="text-xs font-semibold text-sand-700">{formatDateNice(s.estDate)}</div>
                      ) : (
                        <div className="text-[10px] text-sand-400">Awaiting data</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* IRCC comparison */}
          <div className="bg-white border border-sand-200 rounded-xl p-4">
            <h2 className="text-sm font-bold text-sand-900 mb-3">Completion Estimates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-sand-50 rounded-xl p-4 text-center">
                <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">IRCC Official ({irccMonths}mo)</div>
                <div className="text-xl font-bold text-sand-700 mt-1">{formatDateNice(timeline.irccCompletion)}</div>
                <div className="text-[10px] text-sand-400 mt-0.5">{irccDays - timeline.daysSoFar > 0 ? `${irccDays - timeline.daysSoFar} days remaining` : "Past IRCC estimate"}</div>
              </div>
              {timeline.communityCompletion && (
                <div className="bg-brand-50 rounded-xl p-4 text-center">
                  <div className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider">Community Estimate</div>
                  <div className="text-xl font-bold text-brand-600 mt-1">{formatDateNice(timeline.communityCompletion)}</div>
                  <div className="text-[10px] text-brand-500 mt-0.5">Based on reported step durations</div>
                </div>
              )}
            </div>
          </div>

          <p className="text-[9px] text-sand-400 mt-4 text-center">
            Estimates are based on community-reported averages and IRCC published times (March 2026). Actual timelines vary by case.
          </p>
        </>
      )}

      {!calculated && (
        <div className="text-center py-16 bg-white border border-sand-200 rounded-xl">
          <p className="text-sand-500 text-sm mb-1">Enter your submission date to get started</p>
          <p className="text-sand-400 text-xs">We&apos;ll estimate when you might reach each step based on community data</p>
        </div>
      )}
    </div>
  );
}
