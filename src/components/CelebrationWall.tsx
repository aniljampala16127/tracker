"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

interface CelebrationWallProps {
  apps: Application[];
}

export function CelebrationWall({ apps }: CelebrationWallProps) {
  const celebrations = useMemo(() => {
    const now = Date.now();
    const recentPRs: { initials: string; country: string; stream: string; ecoprDate: string; totalDays: number; createdAt: string }[] = [];

    apps.forEach(a => {
      const ecoprEvent = (a.step_events || []).find(e => e.step_id === "ecopr");
      if (!ecoprEvent) return;

      // Show for 7 days after eCoPR reported
      if (now - new Date(ecoprEvent.created_at).getTime() > 7 * 24 * 60 * 60 * 1000) return;

      const s = buildStepsMap(a.step_events || []);
      const totalDays = s.submitted && s.ecopr ? daysBetween(s.submitted, s.ecopr) : 0;

      recentPRs.push({
        initials: a.initials,
        country: a.country_origin,
        stream: a.stream,
        ecoprDate: ecoprEvent.event_date,
        totalDays,
        createdAt: ecoprEvent.created_at,
      });
    });

    recentPRs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return recentPRs;
  }, [apps]);

  if (celebrations.length === 0) return null;

  return (
    <div className="mb-4">
      {celebrations.map((pr, i) => (
        <div key={i} className="bg-gradient-to-r from-warn-light via-warn-light/50 to-brand-50 border border-warn/30 rounded-xl p-4 mb-2 relative overflow-hidden">
          {/* Sparkle decorations */}
          <div className="absolute top-2 right-3 text-warn opacity-40 text-lg">*</div>
          <div className="absolute top-4 right-8 text-brand-400 opacity-30 text-sm">*</div>
          <div className="absolute bottom-2 right-5 text-warn opacity-30 text-base">*</div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warn to-warn-dark flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-warn/30">
              {pr.initials.slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-sand-900">{pr.initials}</span>
                <span className="text-sm">became a PR!</span>
                <span className="text-base">&#127809;</span>
              </div>
              <div className="text-[10px] text-sand-500 mt-0.5">
                {pr.country} · {pr.stream} · {pr.totalDays > 0 ? `${pr.totalDays} days total` : ""} · eCoPR {fmtDate(pr.ecoprDate)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
