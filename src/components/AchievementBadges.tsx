"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap } from "@/lib/utils";

interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
  color: string;
}

export function AchievementBadges({ app }: { app: Application }) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  // Measure content height
  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, []);

  const handleToggle = () => {
    setExpanded(prev => !prev);
  };

  const badges = useMemo(() => {
    const stepsMap = buildStepsMap(app.step_events || []);
    const submittedDate = stepsMap.submitted;
    if (!submittedDate) return [];

    const completedSteps = STEPS.filter(s => stepsMap[s.id]).length;
    const totalSteps = STEPS.length;

    return [
      { id: "aor", label: "AOR", icon: "M9 12L11 14L15 10M3 3H21V21H3Z", earned: !!stepsMap.aor, color: "text-brand-700 bg-brand-500/15" },
      { id: "halfway", label: "Halfway", icon: "M18 20V10M12 20V4M6 20V14", earned: completedSteps >= Math.ceil(totalSteps / 2), color: "text-warn-dark bg-warn/15" },
      { id: "medical", label: "Medical", icon: "M12 4V20M4 12H20", earned: !!stepsMap.medical, color: "text-brand-600 bg-brand-500/10" },
      { id: "background", label: "Background", icon: "M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z", earned: !!stepsMap.background, color: "text-brand-600 bg-brand-500/10" },
      { id: "ecopr", label: "eCoPR", icon: "M3 21H21M5 21V7L12 3L19 7V21", earned: !!stepsMap.ecopr, color: "text-warn-dark bg-warn/20" },
    ] as Badge[];
  }, [app]);

  if (badges.length === 0) return null;
  const earned = badges.filter(b => b.earned).length;

  return (
    <div ref={containerRef} className="bg-white border border-sand-200 rounded-2xl mb-3 overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          expanded ? "bg-sand-50/60 border-b border-sand-100" : "hover:bg-sand-50/60"
        }`}
      >
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <span className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">Milestones</span>
          <span className="text-[11px] font-bold text-brand-600 nums-tabular">{earned}<span className="text-sand-400 font-medium">/{badges.length}</span></span>
        </div>

        {/* Mini dots when collapsed */}
        <div className="flex gap-1 flex-shrink-0" style={{ opacity: expanded ? 0 : 1, transition: "opacity 0.2s ease" }}>
          {badges.map((b) => (
            <div key={b.id} className={`w-5 h-5 rounded-full flex items-center justify-center ${b.earned ? b.color : "bg-sand-100"}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={b.earned ? "" : "opacity-25"}>
                <path d={b.icon} />
              </svg>
            </div>
          ))}
        </div>

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0 text-sand-400"
          style={{ transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>

      {/* Body */}
      <div ref={contentRef} style={{
        maxHeight: expanded ? (height ? `${height}px` : "200px") : "0px",
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="px-4 pt-3 pb-4" style={{
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.2s ease",
          transitionDelay: expanded ? "0.08s" : "0s",
        }}>
          <div className="flex justify-between gap-2">
            {badges.map((b) => (
              <div key={b.id} className={`flex flex-col items-center gap-1.5 flex-1 py-2.5 rounded-xl transition-all border ${
                b.earned ? `${b.color} border-transparent` : "bg-white border-sand-200 text-sand-400"
              }`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${b.earned ? "bg-white/60" : "bg-sand-100"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={b.earned ? "" : "opacity-30"}>
                    <path d={b.icon} />
                  </svg>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${b.earned ? "" : "text-sand-400"}`}>{b.label}</span>
                {!b.earned && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sand-300 -mt-0.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
