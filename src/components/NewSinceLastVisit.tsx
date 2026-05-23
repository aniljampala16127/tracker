"use client";

import { useMemo, useState, useEffect } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap } from "@/lib/utils";

const LAST_VISIT_KEY = "sponsortrack-last-visit";

function getLastVisit(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(LAST_VISIT_KEY) || "0", 10);
}

function setLastVisit() {
  localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
}

interface NewSinceLastVisitProps {
  apps: Application[];
}

export function NewSinceLastVisit({ apps }: NewSinceLastVisitProps) {
  const [lastVisit, setLV] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const lv = getLastVisit();
    setLV(lv);
    // Update last visit after a delay so the banner shows first
    const t = setTimeout(() => setLastVisit(), 3000);
    return () => clearTimeout(t);
  }, []);

  const updates = useMemo(() => {
    if (!lastVisit || lastVisit === 0) return null;

    // New AORs since last visit
    const newAors: string[] = [];
    const newEntries: string[] = [];
    const milestones: { initials: string; step: string }[] = [];

    apps.forEach(a => {
      // New entries
      if (new Date(a.created_at).getTime() > lastVisit) {
        newEntries.push(a.initials);
      }

      // Step milestones
      (a.step_events || []).forEach(e => {
        if (e.step_id === "submitted") return;
        if (new Date(e.created_at).getTime() > lastVisit) {
          if (e.step_id === "aor") {
            newAors.push(a.initials);
          } else {
            const label = STEPS.find(s => s.id === e.step_id)?.label || e.step_id;
            milestones.push({ initials: a.initials, step: label });
          }
        }
      });
    });

    if (newAors.length === 0 && newEntries.length === 0 && milestones.length === 0) return null;

    return { newAors, newEntries, milestones };
  }, [apps, lastVisit]);

  if (!updates || dismissed) return null;

  const totalUpdates = updates.newAors.length + updates.newEntries.length + updates.milestones.length;

  return (
    <div className="bg-white border border-sand-200 rounded-2xl p-4 mb-4 animate-in relative shadow-[0_1px_2px_rgba(26,26,24,0.04)]">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-md flex items-center justify-center text-sand-400 hover:text-sand-700 hover:bg-sand-100 transition-colors"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18" /><path d="M6 6L18 18" />
        </svg>
      </button>

      <div className="flex items-center gap-2 mb-3 pr-7">
        <div className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
        </div>
        <span className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">
          While you were away
        </span>
        <span className="text-[10px] text-sand-400 nums-tabular ml-auto">
          {totalUpdates} update{totalUpdates > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-1.5 nums-tabular">
        {updates.newAors.length > 0 && (
          <div className="flex items-center gap-2.5 text-[13px]">
            <div className="w-7 h-7 rounded-full bg-brand-500/15 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600"><path d="M20 6L9 17L4 12" /></svg>
            </div>
            <span className="text-sand-700 truncate flex-1 min-w-0">
              <span className="font-bold text-brand-700">{updates.newAors.length} new AOR{updates.newAors.length > 1 ? "s" : ""}</span>
              <span className="text-sand-500"> — {updates.newAors.slice(0, 4).join(", ")}{updates.newAors.length > 4 ? ` +${updates.newAors.length - 4} more` : ""}</span>
            </span>
          </div>
        )}

        {updates.milestones.length > 0 && (
          <div className="flex items-center gap-2.5 text-[13px]">
            <div className="w-7 h-7 rounded-full bg-warn/15 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-warn-dark"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" /></svg>
            </div>
            <span className="text-sand-700 truncate flex-1 min-w-0">
              <span className="font-bold text-warn-dark">{updates.milestones.length} milestone{updates.milestones.length > 1 ? "s" : ""}</span>
              <span className="text-sand-500"> — {updates.milestones.slice(0, 3).map(m => `${m.initials} hit ${m.step}`).join(", ")}</span>
            </span>
          </div>
        )}

        {updates.newEntries.length > 0 && (
          <div className="flex items-center gap-2.5 text-[13px]">
            <div className="w-7 h-7 rounded-full bg-sand-100 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-sand-600"><path d="M12 5V19M5 12H19" /></svg>
            </div>
            <span className="text-sand-700">
              <span className="font-bold">{updates.newEntries.length} new {updates.newEntries.length === 1 ? "entry" : "entries"}</span>
              <span className="text-sand-500"> joined</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
