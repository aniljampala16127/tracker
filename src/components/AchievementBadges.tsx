"use client";

import { useMemo, useState } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
  color: string;
}

export function AchievementBadges({ app }: { app: Application }) {
  const [expanded, setExpanded] = useState(false);

  const badges = useMemo(() => {
    const stepsMap = buildStepsMap(app.step_events || []);
    const submittedDate = stepsMap.submitted;
    if (!submittedDate) return [];

    const completedSteps = STEPS.filter(s => stepsMap[s.id]).length;
    const totalSteps = STEPS.length;

    const list: Badge[] = [
      {
        id: "aor",
        label: "AOR",
        icon: "M9 12L11 14L15 10M3 3H21V21H3Z",
        earned: !!stepsMap.aor,
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
        color: "text-brand-600 bg-brand-100",
      },
      {
        id: "background",
        label: "Background",
        icon: "M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z",
        earned: !!stepsMap.background,
        color: "text-brand-600 bg-brand-100",
      },
      {
        id: "ecopr",
        label: "eCoPR",
        icon: "M3 21H21M5 21V7L12 3L19 7V21",
        earned: !!stepsMap.ecopr,
        color: "text-warn-dark bg-yellow-100",
      },
    ];

    return list;
  }, [app]);

  if (badges.length === 0) return null;

  const earned = badges.filter(b => b.earned).length;

  return (
    <div className="bg-white border border-sand-200 rounded-xl mb-3 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:scale-[0.99] transition-transform"
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Achievements</span>
          <span className="text-[10px] font-bold text-brand-600">{earned}/{badges.length}</span>
        </div>

        {/* Mini badge row preview when collapsed */}
        {!expanded && (
          <div className="flex gap-1 flex-shrink-0">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  b.earned ? b.color : "bg-sand-100"
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={b.earned ? "" : "opacity-20"}>
                  <path d={b.icon} />
                </svg>
              </div>
            ))}
          </div>
        )}

        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8880" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "transform 0.3s ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>

      {/* Expandable body */}
      <div
        className="grid"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: "grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="overflow-hidden">
          <div
            className="px-4 pb-4"
            style={{
              opacity: expanded ? 1 : 0,
              transition: "opacity 0.25s ease",
              transitionDelay: expanded ? "0.1s" : "0s",
            }}
          >
            <div className="flex justify-between gap-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className={`flex flex-col items-center gap-1.5 flex-1 py-2.5 rounded-xl transition-all ${
                    b.earned ? b.color : "bg-sand-50 text-sand-300"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    b.earned ? "bg-white/60" : "bg-sand-100"
                  }`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={b.earned ? "" : "opacity-25"}>
                      <path d={b.icon} />
                    </svg>
                  </div>
                  <span className={`text-[9px] font-semibold ${b.earned ? "" : "text-sand-300"}`}>
                    {b.label}
                  </span>
                  {!b.earned && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-sand-300 -mt-0.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
