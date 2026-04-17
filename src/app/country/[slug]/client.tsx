"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";
import { MeSkeleton } from "@/components/Skeletons";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return `${MO[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

export default function CountryPageClient({ slug, country }: { slug: string; country: string | null }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = useCallback(async () => {
    const res = await fetch("/api/applications");
    const data = await res.json();
    if (Array.isArray(data)) setApps(data as Application[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const countryApps = useMemo(() => {
    if (!country) return [];
    return apps.filter(a => a.country_origin === country);
  }, [apps, country]);

  const stats = useMemo(() => {
    const outland = countryApps.filter(a => a.stream === "Outland");
    const inland = countryApps.filter(a => a.stream === "Inland");

    const outDays: number[] = [];
    const inDays: number[] = [];
    let latestAor = "";
    let earliestSub = "9999";

    countryApps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      if (s.submitted && s.submitted < earliestSub) earliestSub = s.submitted;
      if (s.submitted && s.aor) {
        const d = daysBetween(s.submitted, s.aor);
        if (a.stream === "Outland") outDays.push(d);
        else inDays.push(d);
        if (s.aor > latestAor) latestAor = s.aor;
      }
    });

    // Per-step averages for this country
    const stepAvgs: { step: string; avg: number | null; count: number }[] = [];
    const aorIdx = STEPS.findIndex(s => s.id === "aor");
    STEPS.forEach((step, i) => {
      if (i === 0) return; // skip submitted
      const isPostAor = i > aorIdx;
      const diffs: number[] = [];
      countryApps.forEach(a => {
        const s = buildStepsMap(a.step_events || []);
        if (!s[step.id]) return;
        let baseDate: string | null = null;
        if (step.id === "aor") {
          baseDate = s.submitted || null;
        } else if (step.id === "biometrics_given") {
          baseDate = s.bil || null;
        } else if (step.id === "biometrics_done") {
          baseDate = s.biometrics_given || s.bil || null;
        } else if (step.id === "medicals_attended") {
          baseDate = s.medical || null;
        } else if (step.id === "medical_passed") {
          baseDate = s.medicals_attended || s.medical || null;
        } else if (isPostAor) {
          baseDate = s.aor || null;
        } else {
          baseDate = s.submitted || null;
        }
        if (baseDate) diffs.push(daysBetween(baseDate, s[step.id]!));
      });

      let fromLabel = "";
      if (step.id === "aor") fromLabel = "";
      else if (step.id === "biometrics_given") fromLabel = " (from BIL)";
      else if (step.id === "biometrics_done") fromLabel = " (from Bio Given)";
      else if (step.id === "medicals_attended") fromLabel = " (from Med Req)";
      else if (step.id === "medical_passed") fromLabel = " (from Med Attended)";
      else if (isPostAor) fromLabel = " (from AOR)";

      stepAvgs.push({
        step: step.label + fromLabel,
        avg: diffs.length ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : null,
        count: diffs.length,
      });
    });

    return {
      total: countryApps.length,
      outlandCount: outland.length,
      inlandCount: inland.length,
      outlandAvg: outDays.length ? Math.round(outDays.reduce((a, b) => a + b, 0) / outDays.length) : null,
      inlandAvg: inDays.length ? Math.round(inDays.reduce((a, b) => a + b, 0) / inDays.length) : null,
      outlandAor: outDays.length,
      inlandAor: inDays.length,
      totalAor: outDays.length + inDays.length,
      latestAor,
      earliestSub: earliestSub === "9999" ? "" : earliestSub,
      stepAvgs,
    };
  }, [countryApps]);

  // All-community averages for comparison
  const communityAvg = useMemo(() => {
    const outDays: number[] = [];
    const inDays: number[] = [];
    apps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      if (s.submitted && s.aor) {
        const d = daysBetween(s.submitted, s.aor);
        if (a.stream === "Outland") outDays.push(d);
        else inDays.push(d);
      }
    });
    return {
      outland: outDays.length ? Math.round(outDays.reduce((a, b) => a + b, 0) / outDays.length) : null,
      inland: inDays.length ? Math.round(inDays.reduce((a, b) => a + b, 0) / inDays.length) : null,
    };
  }, [apps]);

  if (loading) return <MeSkeleton />;

  if (!country) {
    return (
      <div className="py-12 text-center">
        <p className="text-sand-500 mb-4">Country not found</p>
        <a href="/stats" className="text-sm text-brand-500 font-medium">View all stats</a>
      </div>
    );
  }

  if (countryApps.length === 0) {
    return (
      <div className="py-12">
        <h1 className="text-xl font-bold text-sand-900 mb-2">{country}</h1>
        <p className="text-sm text-sand-500 mb-4">No applications tracked from {country} yet.</p>
        <a href="/dashboard" className="text-sm text-brand-500 font-medium">Add yours on the Tracker</a>
      </div>
    );
  }

  const outlandDiff = stats.outlandAvg && communityAvg.outland ? stats.outlandAvg - communityAvg.outland : null;
  const inlandDiff = stats.inlandAvg && communityAvg.inland ? stats.inlandAvg - communityAvg.inland : null;

  return (
    <div>
      {/* Back */}
      <a href="/stats" className="flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-800 transition-colors mb-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19L5 12L12 5"/></svg>
        Stats
      </a>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-sand-900">{country}</h1>
        <p className="text-xs text-sand-500 mt-0.5">
          Spousal sponsorship processing times · {stats.total} applications tracked
        </p>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-sand-200 rounded-xl p-3 text-center">
          <div className="text-[10px] text-sand-500 uppercase tracking-wider font-semibold">Total</div>
          <div className="text-2xl font-bold text-sand-900">{stats.total}</div>
        </div>
        <div className="bg-white border border-sand-200 rounded-xl p-3 text-center">
          <div className="text-[10px] text-sand-500 uppercase tracking-wider font-semibold">Outland</div>
          <div className="text-2xl font-bold text-brand-600">{stats.outlandCount}</div>
        </div>
        <div className="bg-white border border-sand-200 rounded-xl p-3 text-center">
          <div className="text-[10px] text-sand-500 uppercase tracking-wider font-semibold">Inland</div>
          <div className="text-2xl font-bold text-warn">{stats.inlandCount}</div>
        </div>
      </div>

      {/* AOR Averages */}
      <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold text-sand-900 mb-3">Average Days to AOR</h2>

        {stats.outlandAvg != null && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                <span className="text-xs font-semibold text-sand-900">Outland</span>
                <span className="text-[10px] text-sand-400">{stats.outlandAor} got AOR</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-brand-600">{stats.outlandAvg}d</span>
                {outlandDiff != null && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    outlandDiff <= -3 ? "bg-brand-100 text-brand-700" :
                    outlandDiff >= 3 ? "bg-red-50 text-red-600" :
                    "bg-sand-100 text-sand-500"
                  }`}>
                    {outlandDiff > 0 ? "+" : ""}{outlandDiff}d vs avg
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 bg-sand-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.min((stats.outlandAvg / 120) * 100, 100)}%` }} />
            </div>
          </div>
        )}

        {stats.inlandAvg != null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-warn" />
                <span className="text-xs font-semibold text-sand-900">Inland</span>
                <span className="text-[10px] text-sand-400">{stats.inlandAor} got AOR</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-warn">{stats.inlandAvg}d</span>
                {inlandDiff != null && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    inlandDiff <= -3 ? "bg-brand-100 text-brand-700" :
                    inlandDiff >= 3 ? "bg-red-50 text-red-600" :
                    "bg-sand-100 text-sand-500"
                  }`}>
                    {inlandDiff > 0 ? "+" : ""}{inlandDiff}d vs avg
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 bg-sand-100 rounded-full overflow-hidden">
              <div className="h-full bg-warn rounded-full transition-all" style={{ width: `${Math.min((stats.inlandAvg / 120) * 100, 100)}%` }} />
            </div>
          </div>
        )}

        {stats.totalAor === 0 && (
          <p className="text-xs text-sand-400 italic">No AOR data yet for {country}</p>
        )}
      </div>

      {/* Per-step breakdown */}
      {stats.stepAvgs.some(s => s.avg != null) && (
        <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
          <h2 className="text-sm font-bold text-sand-900 mb-1">Days per Step</h2>
          <p className="text-[11px] text-sand-400 mb-3">Average wait between each milestone for {country}</p>
          <div className="space-y-1.5">
            {stats.stepAvgs.filter(s => s.avg != null).map(s => (
              <div key={s.step} className="flex items-center gap-2">
                <span className="text-[11px] text-sand-600 w-20 flex-shrink-0">{s.step}</span>
                <div className="flex-1 h-3 bg-sand-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-400 rounded-full"
                    style={{ width: `${Math.min((s.avg! / 120) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-sand-700 w-8 text-right">{s.avg}d</span>
                <span className="text-[9px] text-sand-400 w-4 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent entries from this country */}
      <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold text-sand-900 mb-3">
          Applications from {country}
          <span className="text-sand-400 font-normal ml-1">({stats.total})</span>
        </h2>
        <div className="space-y-1">
          {countryApps.slice(0, 20).map(a => {
            const s = buildStepsMap(a.step_events || []);
            const hasAor = !!s.aor;
            const stepLabel = STEPS.find(st => st.id === a.current_step)?.label || a.current_step;
            return (
              <div key={a.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sand-50">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  hasAor ? "bg-brand-100 text-brand-700" : "bg-sand-100 text-sand-600"
                }`}>
                  {a.initials.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-sand-900">{a.initials}</div>
                  <div className="text-[10px] text-sand-400">
                    {a.stream} · {s.submitted ? `Sub ${fmt(s.submitted).replace(/, \d{4}/, "")}` : ""}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-[10px] font-semibold ${hasAor ? "text-brand-600" : "text-sand-400"}`}>
                    {hasAor ? "Got AOR" : stepLabel}
                  </div>
                  {hasAor && s.submitted && s.aor && (
                    <div className="text-[9px] text-brand-500">{daysBetween(s.submitted, s.aor)}d</div>
                  )}
                </div>
              </div>
            );
          })}
          {countryApps.length > 20 && (
            <p className="text-[10px] text-sand-400 text-center pt-2">+{countryApps.length - 20} more</p>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center mb-5">
        <p className="text-sm font-semibold text-brand-700 mb-1">Are you from {country}?</p>
        <p className="text-xs text-brand-600 mb-3">Add your application and track alongside {stats.total} others</p>
        <a href="/dashboard" className="inline-block px-5 py-2 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-600 transition-all active:scale-[0.98]">
          Add My Application
        </a>
      </div>

      {/* SEO text */}
      <div className="text-[10px] text-sand-400 leading-relaxed mb-4">
        <p>
          SponsorTrack provides community-reported processing times for Canadian spousal sponsorship
          applications from {country}. The average AOR wait time shown above is based on {stats.totalAor} real
          applications. Processing times vary by case and are not guaranteed.
        </p>
      </div>
    </div>
  );
}
