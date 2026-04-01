"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d: string) { const dt = new Date(d + "T00:00:00"); return `${MO[dt.getMonth()]} ${dt.getDate()}`; }
function stepLabel(id: string) { return STEPS.find(s => s.id === id)?.label || id; }

const STEP_COLORS: Record<string, string> = {
  aor: "bg-brand-500", bil: "bg-brand-400", sponsor_eligibility: "bg-emerald-500",
  medical: "bg-blue-500", pa_eligibility: "bg-indigo-500", pre_arrival: "bg-purple-500",
  background: "bg-slate-500", portal1: "bg-teal-500", portal2: "bg-cyan-500", ecopr: "bg-yellow-600",
};

interface MilestoneEntry {
  initials: string; stepDate: string; stream: string; country: string; days: number;
}

interface MilestoneCard {
  stepId: string; label: string; entries: MilestoneEntry[]; thisWeek: number;
}

// Native scrollTop auto-scroll
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
      if (el.scrollTop >= el.scrollHeight - el.clientHeight - 1) el.scrollTop = 0;
    }, 50);
    return () => clearInterval(id);
  }, [count]);

  return (
    <div ref={ref} className="h-full overflow-y-auto hide-scrollbar overscroll-contain"
      style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      onTouchStart={() => { paused.current = true; clearTimeout(resumeTimer.current); }}
      onTouchEnd={() => { resumeTimer.current = setTimeout(() => { paused.current = false; }, 5000); }}>
      {children}
    </div>
  );
}

export function AORWaveTracker({ apps }: { apps: Application[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const todayStr = localDate(now);
    const dayOfWeek = now.getDay();
    const thisWeekStart = localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek));

    // Collect milestones grouped by step
    const byStep: Record<string, MilestoneEntry[]> = {};
    const weekCountByStep: Record<string, number> = {};

    apps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      (a.step_events || []).forEach(ev => {
        if (ev.step_id === "submitted") return;
        if (!byStep[ev.step_id]) { byStep[ev.step_id] = []; weekCountByStep[ev.step_id] = 0; }
        const prevStepIdx = STEPS.findIndex(st => st.id === ev.step_id) - 1;
        const prevDate = prevStepIdx >= 0 ? s[STEPS[prevStepIdx].id] : s.submitted;
        byStep[ev.step_id].push({
          initials: a.initials, stepDate: ev.event_date, stream: a.stream,
          country: a.country_origin, days: prevDate ? daysBetween(prevDate, ev.event_date) : 0,
        });
        if (ev.event_date >= thisWeekStart) weekCountByStep[ev.step_id]++;
      });
    });

    // Sort each step's entries by most recent first
    Object.values(byStep).forEach(arr => arr.sort((a, b) => b.stepDate.localeCompare(a.stepDate)));

    // Build cards — only steps that have entries, sorted by most recent activity
    const cards: MilestoneCard[] = STEPS.filter(s => s.id !== "submitted" && byStep[s.id]?.length > 0)
      .map(s => ({
        stepId: s.id, label: s.label,
        entries: byStep[s.id], thisWeek: weekCountByStep[s.id] || 0,
      }))
      .sort((a, b) => {
        // Sort by most recent entry date
        const aDate = a.entries[0]?.stepDate || "";
        const bDate = b.entries[0]?.stepDate || "";
        return bDate.localeCompare(aDate);
      });

    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;
    const totalMilestones = Object.values(byStep).reduce((sum, arr) => sum + arr.length, 0);
    const weekTotal = Object.values(weekCountByStep).reduce((sum, n) => sum + n, 0);

    return { cards, waiting, totalMilestones, weekTotal };
  }, [apps]);

  const [expanded, setExpanded] = useState(true);
  const [userToggled, setUserToggled] = useState(false);
  const lastScrollY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  if (data.cards.length === 0) return null;

  return (
    <div className={`rounded-xl mb-4 border bg-gradient-to-r from-brand-50 to-brand-100 border-brand-200 ${!expanded ? "shadow-sm" : ""}`}
      style={{ transition: "box-shadow 0.3s ease" }}>
      {/* Header */}
      <button onClick={handleToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:scale-[0.99] transition-transform duration-150">
        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-brand-500 animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-sand-900">{data.weekTotal} updates this week</div>
          <div className="text-[10px] text-sand-400">{data.totalMilestones} total milestones · {data.waiting} waiting for AOR</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mini step pills when collapsed */}
          {!expanded && (
            <div className="flex gap-1">
              {data.cards.slice(0, 4).map(c => (
                <div key={c.stepId} className={`px-1.5 py-0.5 rounded text-[7px] font-bold text-white ${STEP_COLORS[c.stepId] || "bg-sand-400"}`}>
                  {c.thisWeek}
                </div>
              ))}
            </div>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0ADA6" strokeWidth="2" strokeLinecap="round"
            style={{ transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
            <path d="M6 9L12 15L18 9" />
          </svg>
        </div>
      </button>

      {/* Body */}
      <div style={{
        maxHeight: expanded ? "280px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="px-4 pb-4" style={{
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.25s ease",
          transitionDelay: expanded ? "0.1s" : "0s",
        }}>
          <div ref={scrollRef}
            className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x snap-mandatory scroll-smooth"
            style={{ WebkitOverflowScrolling: "touch" }}>
            {data.cards.map((card) => (
              <div key={card.stepId} className="flex-shrink-0 w-[72vw] max-w-[280px] bg-white/80 rounded-xl border border-sand-100 overflow-hidden snap-start">
                {/* Card header */}
                <div className="px-3 py-2 border-b border-sand-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${STEP_COLORS[card.stepId] || "bg-sand-400"}`} />
                    <span className="text-[11px] font-bold text-sand-900">{card.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {card.thisWeek > 0 && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">+{card.thisWeek} this week</span>
                    )}
                    <span className="text-[10px] font-bold text-sand-400">{card.entries.length}</span>
                  </div>
                </div>

                {/* Entries */}
                <div className="h-[150px] relative">
                  <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-white/90 to-transparent z-10 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-white/90 to-transparent z-10 pointer-events-none" />
                  <AutoScrollList count={card.entries.length}>
                    {card.entries.slice(0, 20).map((a, i) => (
                      <div key={`${a.initials}-${i}`} className="flex items-center gap-2 px-3 py-1.5">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 ${
                          a.stream === "Outland" ? "bg-brand-500" : "bg-warn"
                        }`}>
                          {a.initials.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-semibold text-sand-900 truncate">{a.initials}</span>
                            <span className={`px-1 py-px rounded text-[7px] font-semibold flex-shrink-0 ${
                              a.stream === "Outland" ? "bg-brand-100 text-brand-700" : "bg-warn-light text-warn-dark"
                            }`}>{a.stream}</span>
                          </div>
                          <div className="text-[9px] text-sand-400">{a.country} · {a.days}d</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[10px] font-bold text-sand-700">{fmtDate(a.stepDate)}</div>
                        </div>
                      </div>
                    ))}
                  </AutoScrollList>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
