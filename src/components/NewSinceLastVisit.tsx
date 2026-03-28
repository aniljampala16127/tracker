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
    <div className="bg-white border border-brand-200 rounded-xl p-4 mb-4 animate-in relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-sand-400 hover:text-sand-600 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18" /><path d="M6 6L18 18" />
        </svg>
      </button>

      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
        <span className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider">
          While you were away
        </span>
        <span className="text-[10px] text-sand-400">
          {totalUpdates} update{totalUpdates > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-1.5">
        {updates.newAors.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17L4 12" /></svg>
            </div>
            <span className="text-sand-900">
              <span className="font-semibold text-brand-600">{updates.newAors.length} new AOR{updates.newAors.length > 1 ? "s" : ""}</span>
              <span className="text-sand-500"> — {updates.newAors.slice(0, 4).join(", ")}{updates.newAors.length > 4 ? ` +${updates.newAors.length - 4} more` : ""}</span>
            </span>
          </div>
        )}

        {updates.milestones.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-6 h-6 rounded-full bg-warn-light flex items-center justify-center flex-shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9B7420" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" /></svg>
            </div>
            <span className="text-sand-900">
              <span className="font-semibold">{updates.milestones.length} milestone{updates.milestones.length > 1 ? "s" : ""}</span>
              <span className="text-sand-500"> — {updates.milestones.slice(0, 3).map(m => `${m.initials} hit ${m.step}`).join(", ")}</span>
            </span>
          </div>
        )}

        {updates.newEntries.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-6 h-6 rounded-full bg-sand-100 flex items-center justify-center flex-shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#65635D" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5V19M5 12H19" /></svg>
            </div>
            <span className="text-sand-700">
              {updates.newEntries.length} new {updates.newEntries.length === 1 ? "entry" : "entries"} joined
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
