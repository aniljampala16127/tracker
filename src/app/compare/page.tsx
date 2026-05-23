"use client";

import { useEffect, useState, useCallback } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { formatDate, daysBetween, buildStepsMap } from "@/lib/utils";

export default function ComparePage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [appA, setAppA] = useState<string>("");
  const [appB, setAppB] = useState<string>("");

  const fetchApps = useCallback(async () => {
    const res = await fetch("/api/applications");
    const data = await res.json();
    if (Array.isArray(data)) setApps(data as Application[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const entryA = apps.find(a => a.id === appA);
  const entryB = apps.find(a => a.id === appB);
  const stepsA = entryA ? buildStepsMap(entryA.step_events || []) : null;
  const stepsB = entryB ? buildStepsMap(entryB.step_events || []) : null;

  if (loading) return <div className="py-20 text-center text-sand-400 text-sm">Loading...</div>;

  return (
    <div>
      <div className="mb-5">
        <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1">Side-by-side</p>
        <h1 className="text-2xl font-bold text-sand-900 tracking-tight">Compare timelines</h1>
        <p className="text-[13px] text-sand-500 mt-0.5">Select two entries to compare step-by-step.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">Entry A</label>
          <select
            className="px-3 py-2.5 rounded-lg border border-sand-200 text-sm bg-sand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 focus:bg-white transition-colors"
            value={appA} onChange={(e) => setAppA(e.target.value)}
          >
            <option value="">Select…</option>
            {apps.map(a => (
              <option key={a.id} value={a.id}>{a.initials} — {a.country_origin} ({a.stream})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">Entry B</label>
          <select
            className="px-3 py-2.5 rounded-lg border border-sand-200 text-sm bg-sand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 focus:bg-white transition-colors"
            value={appB} onChange={(e) => setAppB(e.target.value)}
          >
            <option value="">Select…</option>
            {apps.filter(a => a.id !== appA).map(a => (
              <option key={a.id} value={a.id}>{a.initials} — {a.country_origin} ({a.stream})</option>
            ))}
          </select>
        </div>
      </div>

      {entryA && entryB && stepsA && stepsB ? (
        <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm nums-tabular">
            <thead>
              <tr className="bg-sand-50 text-[10px] font-bold text-sand-500 uppercase tracking-[0.06em]">
                <th className="text-left px-3 py-3">Step</th>
                <th className="text-center px-2 py-3">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-brand-600 text-[12px] font-bold normal-case">{entryA.initials}</span>
                    <span className="text-[9px] text-sand-400 normal-case font-medium">{entryA.country_origin} · {entryA.stream}</span>
                  </div>
                </th>
                <th className="text-center px-2 py-3">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-warn-dark text-[12px] font-bold normal-case">{entryB.initials}</span>
                    <span className="text-[9px] text-sand-400 normal-case font-medium">{entryB.country_origin} · {entryB.stream}</span>
                  </div>
                </th>
                <th className="text-center px-2 py-3">Diff</th>
              </tr>
            </thead>
            <tbody>
              {STEPS.map((step, i) => {
                const dateA = stepsA[step.id];
                const dateB = stepsB[step.id];
                const prevStep = i > 0 ? STEPS[i - 1] : null;
                const daysA = dateA && prevStep && stepsA[prevStep.id] ? daysBetween(stepsA[prevStep.id]!, dateA) : null;
                const daysB = dateB && prevStep && stepsB[prevStep.id] ? daysBetween(stepsB[prevStep.id]!, dateB) : null;
                const diff = daysA != null && daysB != null ? daysA - daysB : null;

                return (
                  <tr key={step.id} className="border-t border-sand-100 hover:bg-sand-50/60 transition-colors">
                    <td className="px-3 py-2.5 font-semibold text-sand-900">{step.label}</td>
                    <td className="px-2 py-2.5 text-center">
                      {dateA ? (
                        <div>
                          <div className="text-[12px] font-bold text-brand-600">{formatDate(dateA).replace(/, \d{4}/, "")}</div>
                          {daysA != null && <div className="text-[10px] text-sand-400">{daysA}d</div>}
                        </div>
                      ) : <span className="text-sand-300">·</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {dateB ? (
                        <div>
                          <div className="text-[12px] font-bold text-warn-dark">{formatDate(dateB).replace(/, \d{4}/, "")}</div>
                          {daysB != null && <div className="text-[10px] text-sand-400">{daysB}d</div>}
                        </div>
                      ) : <span className="text-sand-300">·</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {diff != null ? (
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                          diff < 0 ? "bg-brand-500/10 text-brand-700"
                          : diff > 0 ? "bg-error/10 text-error"
                          : "bg-sand-100 text-sand-500"
                        }`}>
                          {diff > 0 ? `+${diff}d` : diff < 0 ? `${diff}d` : "same"}
                        </span>
                      ) : <span className="text-sand-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-sand-200 rounded-2xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="M8 6l-5 6 5 6"/><path d="M16 6l5 6-5 6"/></svg>
          </div>
          <p className="text-sand-900 text-base font-bold tracking-tight mb-1">Pick two entries</p>
          <p className="text-sand-500 text-[13px]">Then we'll line their timelines up side-by-side.</p>
        </div>
      )}
    </div>
  );
}
