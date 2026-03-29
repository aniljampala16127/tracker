"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";
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

export default function CalculatorPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittedDate, setSubmittedDate] = useState("");
  const [stream, setStream] = useState("Outland");
  const [country, setCountry] = useState("");
  const [autoDetected, setAutoDetected] = useState(false);
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

  // Auto-detect user's entry
  useEffect(() => {
    if (apps.length === 0 || autoDetected) return;
    const myEntry = apps.find(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash);
    if (myEntry) {
      const s = buildStepsMap(myEntry.step_events || []);
      if (s.submitted) {
        setSubmittedDate(s.submitted);
        setStream(myEntry.stream);
        setCountry(myEntry.country_origin);
        setAutoDetected(true);
      }
    }
  }, [apps, autoDetected]);

  // Compute AOR days for the selected stream
  const aorData = useMemo(() => {
    const streamApps = apps.filter(a => a.stream === stream);
    const allAorDays: number[] = [];
    const countryAorDays: number[] = [];

    streamApps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      if (s.submitted && s.aor) {
        const d = daysBetween(s.submitted, s.aor);
        allAorDays.push(d);
        if (country && a.country_origin.toLowerCase() === country.toLowerCase()) {
          countryAorDays.push(d);
        }
      }
    });

    allAorDays.sort((a, b) => a - b);
    countryAorDays.sort((a, b) => a - b);

    const avg = allAorDays.length >= 2
      ? Math.round(allAorDays.reduce((a, b) => a + b, 0) / allAorDays.length) : null;
    const p25 = allAorDays.length >= 4 ? percentile(allAorDays, 25) : null;
    const p75 = allAorDays.length >= 4 ? percentile(allAorDays, 75) : null;
    const median = allAorDays.length >= 2 ? percentile(allAorDays, 50) : null;
    const min = allAorDays.length >= 2 ? allAorDays[0] : null;
    const max = allAorDays.length >= 2 ? allAorDays[allAorDays.length - 1] : null;

    const countryAvg = countryAorDays.length >= 2
      ? Math.round(countryAorDays.reduce((a, b) => a + b, 0) / countryAorDays.length) : null;

    return { allAorDays, avg, p25, p75, median, min, max, countryAvg, countryCount: countryAorDays.length, totalReports: allAorDays.length };
  }, [apps, stream, country]);

  // Queue position
  const queueData = useMemo(() => {
    if (!submittedDate) return null;
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
  }, [apps, stream, submittedDate]);

  // Cohort stats (same submission week)
  const cohortData = useMemo(() => {
    if (!submittedDate) return null;
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

    const gotAor = cohort.filter(a => {
      const s = buildStepsMap(a.step_events || []);
      return !!s.aor;
    });

    return { total: cohort.length, gotAor: gotAor.length, pct: cohort.length > 0 ? Math.round((gotAor.length / cohort.length) * 100) : 0 };
  }, [apps, submittedDate]);

  // Step-by-step timeline estimates
  const stepEstimates = useMemo(() => {
    const streamApps = apps.filter(a => a.stream === stream);
    return STEPS.slice(1).map((step) => {
      const prev = STEPS[STEPS.indexOf(step) - 1];
      const durations: number[] = [];
      streamApps.forEach((a) => {
        const s = buildStepsMap(a.step_events || []);
        if (s[prev.id] && s[step.id]) durations.push(daysBetween(s[prev.id]!, s[step.id]!));
      });
      const avg = durations.length >= 2
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
      return { step, avg, reports: durations.length };
    });
  }, [apps, stream]);

  // Timeline from step estimates
  const timeline = useMemo(() => {
    if (!submittedDate) return null;
    let cumDays = 0;
    const steps = stepEstimates.map(({ step, avg }) => {
      if (avg != null) cumDays += avg;
      return {
        label: step.label, shortLabel: step.shortLabel,
        estDate: avg != null ? addDays(submittedDate, cumDays) : null,
        avgDays: avg, cumDays,
      };
    });
    return steps;
  }, [submittedDate, stepEstimates]);

  // Predicted AOR date + countdown
  const prediction = useMemo(() => {
    if (!submittedDate || aorData.avg == null) return null;
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const daysSoFar = daysBetween(submittedDate, todayStr);

    const predicted = addDays(submittedDate, aorData.avg);
    const daysRemaining = Math.max(0, aorData.avg - daysSoFar);

    const optimistic = aorData.p25 != null ? addDays(submittedDate, aorData.p25) : null;
    const pessimistic = aorData.p75 != null ? addDays(submittedDate, aorData.p75) : null;
    const countryPredicted = aorData.countryAvg != null ? addDays(submittedDate, aorData.countryAvg) : null;
    const progressPct = aorData.avg > 0 ? Math.min(Math.round((daysSoFar / aorData.avg) * 100), 100) : 0;

    return { predicted, daysRemaining, daysSoFar, optimistic, pessimistic, countryPredicted, progressPct };
  }, [submittedDate, aorData]);

  const irccDays = stream === "Outland" ? 456 : 639;
  const irccMonths = stream === "Outland" ? 15 : 21;
  const hasInput = submittedDate.length > 0;

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
        <h1 className="text-xl font-bold text-sand-900">Completion Estimator</h1>
        <p className="text-xs text-sand-500 mt-0.5">
          {autoDetected
            ? "Personalized predictions based on your application and community data"
            : "Enter your dates to see predictions based on community data"}
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
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">Country (optional)</label>
            <input
              type="text"
              className="px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 placeholder:text-sand-400"
              placeholder="e.g. India"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>
        {autoDetected && (
          <div className="mt-2 text-[10px] text-brand-600 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17L4 12"/></svg>
            Auto-filled from your entry
          </div>
        )}
      </div>

      {hasInput && prediction && (
        <>
          {/* BIG PREDICTION CARD */}
          <div className="bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-xl p-5 mb-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60 mb-1">Predicted AOR Date</div>
            <div className="text-3xl font-bold mb-1">{fmtDate(prediction.predicted)}</div>
            <div className="text-sm text-white/80 mb-4">
              {prediction.daysRemaining > 0
                ? `~${prediction.daysRemaining} days remaining`
                : "Your AOR could arrive any day now! 🎉"}
            </div>

            {/* Progress bar */}
            <div className="bg-white/20 rounded-full h-2.5 overflow-hidden mb-2">
              <div
                className="h-full bg-white rounded-full transition-all duration-1000"
                style={{ width: `${Math.max(prediction.progressPct, 3)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-white/50">
              <span>Day {prediction.daysSoFar}</span>
              <span>Avg {aorData.avg}d</span>
            </div>
          </div>

          {/* Confidence range + Queue position */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Confidence range */}
            <div className="bg-white border border-sand-200 rounded-xl p-3.5">
              <div className="text-[9px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Confidence Range</div>
              {prediction.optimistic && prediction.pessimistic ? (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-brand-600 font-medium">Best case</span>
                      <span className="text-[11px] font-bold text-brand-600">{fmtShort(prediction.optimistic)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-sand-600 font-medium">Average</span>
                      <span className="text-[11px] font-bold text-sand-800">{fmtShort(prediction.predicted)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-warn-dark font-medium">Conservative</span>
                      <span className="text-[11px] font-bold text-warn-dark">{fmtShort(prediction.pessimistic)}</span>
                    </div>
                  </div>
                  <div className="text-[8px] text-sand-400 mt-2">25th–75th percentile</div>
                </>
              ) : (
                <div className="text-[11px] text-sand-400">Need more data</div>
              )}
            </div>

            {/* Queue position */}
            {queueData && (
              <div className="bg-white border border-sand-200 rounded-xl p-3.5">
                <div className="text-[9px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Queue Position</div>
                <div className="text-2xl font-bold text-sand-900">#{queueData.position}</div>
                <div className="text-[10px] text-sand-500">of {queueData.total} waiting</div>
                <div className="text-[10px] text-sand-400 mt-1">{queueData.ahead} submitted before you</div>
              </div>
            )}
          </div>

          {/* Cohort + Country */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {cohortData && (
              <div className="bg-white border border-sand-200 rounded-xl p-3.5">
                <div className="text-[9px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Your Cohort</div>
                <div className="text-2xl font-bold text-brand-600">{cohortData.pct}%</div>
                <div className="text-[10px] text-sand-500">got AOR</div>
                <div className="text-[10px] text-sand-400 mt-1">{cohortData.gotAor} of {cohortData.total} in your week</div>
              </div>
            )}

            <div className="bg-white border border-sand-200 rounded-xl p-3.5">
              <div className="text-[9px] font-semibold text-sand-500 uppercase tracking-wider mb-2">
                {country ? `${country} Avg` : "Community Stats"}
              </div>
              {prediction.countryPredicted && country ? (
                <>
                  <div className="text-lg font-bold text-sand-900">{aorData.countryAvg}d</div>
                  <div className="text-[10px] text-sand-500">avg days to AOR</div>
                  <div className="text-[10px] text-sand-400 mt-1">{aorData.countryCount} reports from {country}</div>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold text-sand-900">{aorData.avg}d</div>
                  <div className="text-[10px] text-sand-500">avg days to AOR</div>
                  <div className="text-[10px] text-sand-400 mt-1">{aorData.totalReports} {stream} reports</div>
                </>
              )}
            </div>
          </div>

          {/* Step-by-step timeline */}
          {timeline && (
            <div className="bg-white border border-sand-200 rounded-xl p-4 mb-4">
              <h2 className="text-sm font-bold text-sand-900 mb-1">Step-by-Step Timeline</h2>
              <p className="text-[10px] text-sand-400 mb-3">Based on {apps.filter(a => a.stream === stream).length} {stream} applications</p>

              <div className="space-y-1.5">
                {/* Submitted */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-brand-500 text-white">
                  <div className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0" />
                  <div className="flex-1 text-xs font-medium">Submitted</div>
                  <div className="text-[11px] font-semibold">{fmtDate(submittedDate)}</div>
                </div>

                {timeline.map((s) => {
                  const isPast = s.estDate && new Date(s.estDate + "T00:00:00") <= new Date();
                  return (
                    <div key={s.shortLabel} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                      isPast ? "bg-brand-50/70" : s.estDate ? "bg-white border border-sand-100" : "bg-sand-50/50"
                    }`}>
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPast ? "bg-brand-500" : s.estDate ? "bg-sand-300" : "bg-sand-200"}`} />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-sand-900">{s.label}</div>
                        {s.avgDays != null && (
                          <div className="text-[9px] text-sand-400">~{s.avgDays}d from previous</div>
                        )}
                      </div>
                      <div className="text-right">
                        {s.estDate ? (
                          <div className={`text-[11px] font-semibold ${isPast ? "text-brand-600" : "text-sand-700"}`}>{fmtDate(s.estDate)}</div>
                        ) : (
                          <div className="text-[9px] text-sand-400">Awaiting data</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* IRCC comparison */}
          <div className="bg-white border border-sand-200 rounded-xl p-4 mb-4">
            <h2 className="text-sm font-bold text-sand-900 mb-3">IRCC vs Community</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-sand-50 rounded-xl p-3.5 text-center">
                <div className="text-[9px] font-semibold text-sand-500 uppercase tracking-wider">IRCC ({irccMonths}mo)</div>
                <div className="text-lg font-bold text-sand-700 mt-1">{fmtShort(addDays(submittedDate, irccDays))}</div>
                <div className="text-[9px] text-sand-400 mt-0.5">{irccDays}d total</div>
              </div>
              <div className="bg-brand-50 rounded-xl p-3.5 text-center border border-brand-200">
                <div className="text-[9px] font-semibold text-brand-700 uppercase tracking-wider">Community</div>
                <div className="text-lg font-bold text-brand-600 mt-1">{fmtShort(prediction.predicted)}</div>
                <div className="text-[9px] text-brand-500 mt-0.5">{aorData.avg}d avg</div>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-sand-400 text-center mb-4">
            Estimates based on community averages ({aorData.totalReports} reports) and IRCC published times. Actual timelines vary.
          </p>
        </>
      )}

      {!hasInput && (
        <div className="text-center py-16 bg-white border border-sand-200 rounded-xl">
          <div className="text-3xl mb-3">📊</div>
          <p className="text-sand-600 text-sm font-medium mb-1">Enter your submission date</p>
          <p className="text-sand-400 text-xs">Get predicted AOR date, queue position, and step-by-step timeline</p>
        </div>
      )}
    </div>
  );
}
