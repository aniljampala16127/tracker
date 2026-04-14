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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-sand-900">Compare Timelines</h1>
        <p className="text-xs text-sand-500 mt-0.5">Select two entries to compare side-by-side</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">Entry A</label>
          <select
            className="px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            value={appA} onChange={(e) => setAppA(e.target.value)}
          >
            <option value="">Select...</option>
            {apps.map(a => (
              <option key={a.id} value={a.id}>{a.initials} — {a.country_origin} ({a.stream})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">Entry B</label>
          <select
            className="px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            value={appB} onChange={(e) => setAppB(e.target.value)}
          >
            <option value="">Select...</option>
            {apps.filter(a => a.id !== appA).map(a => (
              <option key={a.id} value={a.id}>{a.initials} — {a.country_origin} ({a.stream})</option>
            ))}
          </select>
        </div>
      </div>

      {entryA && entryB && stepsA && stepsB ? (
        <div className="bg-white border border-sand-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand-50 text-[9px] font-semibold text-sand-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2">Step</th>
                <th className="text-center px-2 py-2">
                  <div className="flex flex-col items-center">
                    <span className="text-brand-600 text-xs font-bold">{entryA.initials}</span>
                    <span className="text-[8px] text-sand-400 normal-case">{entryA.country_origin} · {entryA.stream}</span>
                  </div>
                </th>
                <th className="text-center px-2 py-2">
                  <div className="flex flex-col items-center">
                    <span className="text-warn-dark text-xs font-bold">{entryB.initials}</span>
                    <span className="text-[8px] text-sand-400 normal-case">{entryB.country_origin} · {entryB.stream}</span>
                  </div>
                </th>
                <th className="text-center px-2 py-2">Diff</th>
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
                  <tr key={step.id} className="border-t border-sand-100">
                    <td className="px-3 py-2.5 font-medium text-sand-900">{step.label}</td>
                    <td className="px-2 py-2.5 text-center">
                      {dateA ? (
                        <div>
                          <div className="text-xs font-semibold text-brand-600">{formatDate(dateA).replace(/, \d{4}/, "")}</div>
                          {daysA != null && <div className="text-[9px] text-sand-400">{daysA}d</div>}
                        </div>
                      ) : <span className="text-sand-300">·</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {dateB ? (
                        <div>
                          <div className="text-xs font-semibold text-warn-dark">{formatDate(dateB).replace(/, \d{4}/, "")}</div>
                          {daysB != null && <div className="text-[9px] text-sand-400">{daysB}d</div>}
                        </div>
                      ) : <span className="text-sand-300">·</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {diff != null ? (
                        <span className={`text-xs font-semibold ${diff < 0 ? "text-brand-600" : diff > 0 ? "text-error" : "text-sand-500"}`}>
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
        <div className="text-center py-16 bg-white border border-sand-200 rounded-xl">
          <p className="text-sand-500 text-sm">Select two entries above to compare their timelines</p>
        </div>
      )}
    </div>
  );
}
