"use client";

import { useMemo } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
  color: string;
}

export function AchievementBadges({ app }: { app: Application }) {
  const badges = useMemo(() => {
    const stepsMap = buildStepsMap(app.step_events || []);
    const submittedDate = stepsMap.submitted;
    if (!submittedDate) return [];

    const today = new Date().toISOString().split("T")[0];
    const daysSoFar = daysBetween(submittedDate, today);
    const completedSteps = STEPS.filter(s => stepsMap[s.id]).length;
    const totalSteps = STEPS.length;

    const list: Badge[] = [
      {
        id: "day1",
        label: "Day 1",
        icon: "M13 2L3 14H12L11 22L21 10H12L13 2Z",
        earned: true,
        earnedDate: submittedDate,
        color: "text-brand-600 bg-brand-100",
      },
      {
        id: "week1",
        label: "1 Week",
        icon: "M12 6V12L16 14",
        earned: daysSoFar >= 7,
        color: "text-brand-600 bg-brand-100",
      },
      {
        id: "month1",
        label: "1 Month",
        icon: "M3 3H21V21H3Z",
        earned: daysSoFar >= 30,
        color: "text-brand-600 bg-brand-100",
      },
      {
        id: "aor",
        label: "AOR",
        icon: "M9 12L11 14L15 10M3 3H21V21H3Z",
        earned: !!stepsMap.aor,
        earnedDate: stepsMap.aor || undefined,
        color: "text-brand-700 bg-brand-200",
      },
      {
        id: "halfway",
        label: "Halfway",
        icon: "M18 20V10M12 20V4M6 20V14",
        earned: completedSteps >= Math.ceil(totalSteps / 2),
        color: "text-warn-dark bg-warn-light",
      },
      {
        id: "medical",
        label: "Medical",
        icon: "M12 4V20M4 12H20",
        earned: !!stepsMap.medical,
        earnedDate: stepsMap.medical || undefined,
        color: "text-brand-600 bg-brand-100",
      },
      {
        id: "background",
        label: "Background",
        icon: "M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z",
        earned: !!stepsMap.background,
        earnedDate: stepsMap.background || undefined,
        color: "text-brand-600 bg-brand-100",
      },
      {
        id: "ecopr",
        label: "eCoPR",
        icon: "M3 21H21M5 21V7L12 3L19 7V21",
        earned: !!stepsMap.ecopr,
        earnedDate: stepsMap.ecopr || undefined,
        color: "text-warn-dark bg-yellow-100",
      },
    ];

    return list;
  }, [app]);

  if (badges.length === 0) return null;

  const earned = badges.filter(b => b.earned).length;

  return (
    <div className="bg-white border border-sand-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Achievements</span>
        <span className="text-[10px] font-bold text-brand-600">{earned}/{badges.length}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-all ${
              b.earned ? b.color : "bg-sand-50 text-sand-300"
            }`}
            title={b.earned ? `Earned: ${b.label}` : `Locked: ${b.label}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              b.earned ? "bg-white/60" : "bg-sand-100"
            }`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={b.earned ? "" : "opacity-30"}>
                <path d={b.icon} />
              </svg>
            </div>
            <span className={`text-[8px] font-semibold ${b.earned ? "" : "text-sand-300"}`}>
              {b.label}
            </span>
            {!b.earned && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-sand-300">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
