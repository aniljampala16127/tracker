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
        <div
          key={i}
          className="bg-white border border-warn/30 rounded-2xl p-4 mb-2 relative overflow-hidden shadow-[0_1px_2px_rgba(212,160,60,0.08)]"
          style={{
            backgroundImage:
              "radial-gradient(80% 100% at 0% 50%, rgba(212,160,60,0.10), transparent 70%), radial-gradient(80% 100% at 100% 50%, rgba(45,106,79,0.06), transparent 70%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warn to-warn-dark flex items-center justify-center text-white font-bold text-sm shadow-md shadow-warn/40 flex-shrink-0">
              {pr.initials.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-warn-dark uppercase tracking-[0.08em]">New PR</span>
                <span className="text-[14px] font-bold text-sand-900">{pr.initials}</span>
                <span className="text-[13px] text-sand-700">became a PR.</span>
              </div>
              <div className="text-[11px] text-sand-500 mt-0.5 truncate nums-tabular">
                {pr.country} · {pr.stream}{pr.totalDays > 0 ? ` · ${pr.totalDays} days total` : ""} · eCoPR {fmtDate(pr.ecoprDate)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
