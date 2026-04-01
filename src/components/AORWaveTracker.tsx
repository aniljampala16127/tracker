"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MO[dt.getMonth()]} ${dt.getDate()}`;
}

function stepLabel(id: string): string {
  return STEPS.find(s => s.id === id)?.label || id;
}

const STEP_COLORS: Record<string, string> = {
  aor: "bg-brand-500",
  bil: "bg-brand-400",
  sponsor_eligibility: "bg-emerald-500",
  medical: "bg-blue-500",
  pa_eligibility: "bg-indigo-500",
  pre_arrival: "bg-purple-500",
  background: "bg-slate-500",
  portal1: "bg-teal-500",
  portal2: "bg-cyan-500",
  ecopr: "bg-yellow-600",
};

interface MilestoneEntry {
  initials: string;
  stepId: string;
  stepDate: string;
  subDate: string;
  stream: string;
  country: string;
}

// Auto-scrolling list using native scrollTop
function AutoScrollList({ children, count }: { children: React.ReactNode; count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (count <= 3) return;
    const el = ref.current;
    if (!el) return;

    const id = setInterval(() => {
      if (paused.current || el.scrollHeight <= el.clientHeight) return;
      el.scrollTop += 1;
      if (el.scrollTop >= el.scrollHeight - el.clientHeight - 1) {
        el.scrollTop = 0;
      }
    }, 50); // 1px every 50ms = 20px/sec

    return () => clearInterval(id);
  }, [count]);

  return (
    <div
      ref={ref}
      className="h-full overflow-y-auto hide-scrollbar overscroll-contain"
      style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      onTouchStart={() => { paused.current = true; clearTimeout(resumeTimer.current); }}
      onTouchEnd={() => { resumeTimer.current = setTimeout(() => { paused.current = false; }, 5000); }}
    >
      {children}
    </div>
  );
}

// Horizontal auto-swipe controller
function AutoSwipeController({ scrollRef, cardCount, pausedRef }: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  cardCount: number;
  pausedRef: React.MutableRefObject<boolean>;
}) {
  const idx = useRef(0);

  useEffect(() => {
    if (cardCount <= 1) return;
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      const el = scrollRef.current;
      if (!el) return;
      idx.current = (idx.current + 1) % cardCount;
      const card = el.children[idx.current] as HTMLElement | undefined;
      if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
    }, 6000);
    return () => clearInterval(interval);
  }, [cardCount, scrollRef, pausedRef]);

  return null;
}

export function AORWaveTracker({ apps }: { apps: Application[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const todayStr = localDate(now);

    const dayOfWeek = now.getDay();
    const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    const thisWeekStartStr = localDate(thisWeekStart);
    const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - 7);
    const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - 1);
    const lastWeekStartStr = localDate(lastWeekStart);
    const lastWeekEndStr = localDate(lastWeekEnd);

    // Collect ALL milestones (not just AOR)
    const allMilestones: MilestoneEntry[] = [];
    apps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      (a.step_events || []).forEach(ev => {
        if (ev.step_id === "submitted") return; // skip submitted
        allMilestones.push({
          initials: a.initials,
          stepId: ev.step_id,
          stepDate: ev.event_date,
          subDate: s.submitted || "",
          stream: a.stream,
          country: a.country_origin,
        });
      });
    });

    // Sort all by date descending (most recent first)
    allMilestones.sort((a, b) => b.stepDate.localeCompare(a.stepDate));

    const todayAll = allMilestones.filter(e => e.stepDate === todayStr);
    const weekAll = allMilestones.filter(e => e.stepDate >= thisWeekStartStr && e.stepDate <= todayStr);
    const lastWeekAll = allMilestones.filter(e => e.stepDate >= lastWeekStartStr && e.stepDate <= lastWeekEndStr);

    // AOR-specific stats for header
    const aorCount = allMilestones.filter(e => e.stepId === "aor").length;
    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;

    return { todayAll, weekAll, lastWeekAll, totalMilestones: allMilestones.length, aorCount, waiting, todayStr };
  }, [apps]);

  const [expanded, setExpanded] = useState(true);
  const [userToggled, setUserToggled] = useState(false);
  const lastScrollY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const touchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Scroll-to-collapse
  useEffect(() => {
    if (typeof window === "undefined") return;
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (!userToggled && y > 100 && y > lastScrollY.current && expanded) setExpanded(false);
        if (y < 10 && !expanded) { setExpanded(true); setUserToggled(false); }
        lastScrollY.current = y;
        rafId = null;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => { window.removeEventListener("scroll", handleScroll); if (rafId) cancelAnimationFrame(rafId); };
  }, [expanded, userToggled]);

  useEffect(() => {
    if (!userToggled) return;
    const t = setTimeout(() => setUserToggled(false), 5000);
    return () => clearTimeout(t);
  }, [userToggled]);

  const handleToggle = () => { setExpanded(prev => !prev); setUserToggled(true); };
  const handleTouchStart = () => { pausedRef.current = true; };
  const handleTouchEnd = () => {
    clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => { pausedRef.current = false; }, 10000);
  };

  if (data.totalMilestones === 0) return null;

  const hasActivity = data.weekAll.length > 0;
  const hasTodayActivity = data.todayAll.length > 0;

  const cards = hasTodayActivity
    ? [
        { label: "Today", entries: data.todayAll },
        { label: "This Week", entries: data.weekAll },
        { label: "Last Week", entries: data.lastWeekAll },
      ]
    : [
        { label: "This Week", entries: data.weekAll },
        { label: "Last Week", entries: data.lastWeekAll },
        { label: "Today", entries: data.todayAll },
      ];

  return (
    <div
      className={`rounded-xl mb-4 border ${
        hasActivity
          ? "bg-gradient-to-r from-brand-50 to-brand-100 border-brand-200"
          : "bg-white border-sand-200"
      } ${!expanded ? "shadow-sm" : ""}`}
      style={{ transition: "box-shadow 0.3s ease" }}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:scale-[0.99] transition-transform duration-150"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasActivity ? "bg-brand-500 animate-pulse" : "bg-sand-400"}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-sand-900">
            {hasTodayActivity
              ? `${data.todayAll.length} update${data.todayAll.length > 1 ? "s" : ""} today`
              : hasActivity
              ? `${data.weekAll.length} update${data.weekAll.length > 1 ? "s" : ""} this week`
              : "No updates this week"}
          </div>
          <div className="text-[10px] text-sand-400">{data.aorCount} AORs · {data.waiting} waiting</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-2 text-center">
            <div>
              <div className="text-sm font-bold text-brand-600">{data.weekAll.length}</div>
              <div className="text-[8px] text-sand-400">Week</div>
            </div>
            <div>
              <div className="text-sm font-bold text-warn-dark">{data.waiting}</div>
              <div className="text-[8px] text-sand-400">Wait</div>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0ADA6" strokeWidth="2" strokeLinecap="round"
            style={{ transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
            <path d="M6 9L12 15L18 9" />
          </svg>
        </div>
      </button>

      {/* Body */}
      <div style={{
        maxHeight: expanded ? "260px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="px-4 pb-4" style={{
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.25s ease",
          transitionDelay: expanded ? "0.1s" : "0s",
        }}>
          <AutoSwipeController scrollRef={scrollRef} cardCount={cards.length} pausedRef={pausedRef} />
          <div
            ref={scrollRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x snap-mandatory scroll-smooth"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {cards.map((card) => (
              <div key={card.label} className="flex-shrink-0 w-[78vw] max-w-[300px] bg-white/80 rounded-xl border border-sand-100 overflow-hidden snap-start">
                <div className="px-3 py-2 border-b border-sand-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sand-900">{card.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    card.entries.length > 0 ? "bg-brand-100 text-brand-700" : "bg-sand-100 text-sand-400"
                  }`}>{card.entries.length}</span>
                </div>

                {card.entries.length === 0 ? (
                  <div className="px-3 py-5 text-center">
                    <div className="text-[11px] text-sand-400">No updates {card.label.toLowerCase()}</div>
                  </div>
                ) : (
                  <div className="h-[140px] relative">
                    <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-white/90 to-transparent z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-white/90 to-transparent z-10 pointer-events-none" />
                    <AutoScrollList count={card.entries.length}>
                      {card.entries.slice(0, 20).map((a, i) => (
                        <div key={`${a.initials}-${a.stepId}-${i}`} className="flex items-center gap-2 px-3 py-1.5">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 ${
                            STEP_COLORS[a.stepId] || "bg-sand-400"
                          }`}>
                            {a.initials.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-semibold text-sand-900 truncate">{a.initials}</span>
                              <span className={`px-1 py-px rounded text-[7px] font-semibold flex-shrink-0 ${
                                STEP_COLORS[a.stepId] ? "bg-brand-100 text-brand-700" : "bg-sand-100 text-sand-500"
                              }`}>{stepLabel(a.stepId)}</span>
                            </div>
                            <div className="text-[9px] text-sand-400">{a.country} · {a.stream}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] font-bold text-sand-700">{fmtDate(a.stepDate)}</div>
                          </div>
                        </div>
                      ))}
                    </AutoScrollList>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
