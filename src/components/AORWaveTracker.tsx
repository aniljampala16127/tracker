"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d: string) { const dt = new Date(d + "T00:00:00"); return `${MO[dt.getMonth()]} ${dt.getDate()}`; }

const STEP_COLORS: Record<string, string> = {
  aor: "bg-brand-500", bil: "bg-brand-400", sponsor_eligibility: "bg-emerald-500",
  medical: "bg-blue-500", pa_eligibility: "bg-indigo-500", pre_arrival: "bg-purple-500",
  background: "bg-slate-500", portal1: "bg-teal-500", portal2: "bg-cyan-500", ecopr: "bg-yellow-600",
};

interface MilestoneEntry {
  initials: string; stepDate: string; subDate: string; stream: string; country: string; days: number;
}
interface MilestoneCard {
  stepId: string; label: string; entries: MilestoneEntry[]; thisWeek: number;
}

/* ─── 60fps butter-smooth vertical auto-scroll ─── */
function SmoothScroll({ children, count }: { children: React.ReactNode; count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const acc = useRef(0);
  const resume = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (count <= 3) return;
    let raf: number;
    let prev = 0;

    const tick = (t: number) => {
      const el = ref.current;
      if (el && !paused.current && el.scrollHeight > el.clientHeight) {
        const dt = prev ? (t - prev) / 1000 : 0;
        acc.current += 18 * dt; // 18 px/sec
        if (acc.current >= 1) {
          const px = Math.floor(acc.current);
          acc.current -= px;
          el.scrollTop += px;
          if (el.scrollTop >= el.scrollHeight - el.clientHeight - 1) el.scrollTop = 0;
        }
      }
      prev = t;
      raf = requestAnimationFrame(tick);
    };

    const delay = setTimeout(() => { raf = requestAnimationFrame(tick); }, 600);
    return () => { clearTimeout(delay); cancelAnimationFrame(raf); };
  }, [count]);

  return (
    <div ref={ref} className="h-full overflow-y-auto hide-scrollbar overscroll-contain"
      style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      onTouchStart={() => { paused.current = true; acc.current = 0; clearTimeout(resume.current); }}
      onTouchEnd={() => { resume.current = setTimeout(() => { paused.current = false; }, 4000); }}>
      {children}
    </div>
  );
}

/* ─── Main component ─── */
export function AORWaveTracker({ apps }: { apps: Application[] }) {

  /* ── Data ── */
  const data = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ld = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const wkStart = ld(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()));

    const byStep: Record<string, MilestoneEntry[]> = {};
    const wk: Record<string, number> = {};

    apps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      (a.step_events || []).forEach(ev => {
        if (ev.step_id === "submitted") return;
        if (!byStep[ev.step_id]) { byStep[ev.step_id] = []; wk[ev.step_id] = 0; }
        const pi = STEPS.findIndex(st => st.id === ev.step_id) - 1;
        const pd = pi >= 0 ? s[STEPS[pi].id] : s.submitted;
        byStep[ev.step_id].push({
          initials: a.initials, stepDate: ev.event_date, subDate: s.submitted || "", stream: a.stream,
          country: a.country_origin, days: pd ? daysBetween(pd, ev.event_date) : 0,
        });
        if (ev.event_date >= wkStart) wk[ev.step_id]++;
      });
    });

    Object.values(byStep).forEach(a => a.sort((x, y) => y.stepDate.localeCompare(x.stepDate)));

    const cards: MilestoneCard[] = STEPS
      .filter(s => s.id !== "submitted" && byStep[s.id]?.length > 0)
      .map(s => ({ stepId: s.id, label: s.label, entries: byStep[s.id], thisWeek: wk[s.id] || 0 }))
      .sort((a, b) => (b.entries[0]?.stepDate || "").localeCompare(a.entries[0]?.stepDate || ""));

    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;
    const weekTotal = Object.values(wk).reduce((s, n) => s + n, 0);
    return { cards, waiting, weekTotal };
  }, [apps]);

  /* ── Expand / collapse state ── */
  const [expanded, setExpanded] = useState(true);
  const [userToggled, setUserToggled] = useState(false);
  const initialized = useRef(false);
  const lastY = useRef(0);
  const scrollDelta = useRef(0);

  // Smart scroll: only collapse after sustained 150px downward scroll
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize to current scroll so we don't insta-collapse
    lastY.current = window.scrollY;
    initialized.current = true;

    let raf: number | null = null;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;

        if (!userToggled) {
          if (dy > 0) {
            // Scrolling down — accumulate delta
            scrollDelta.current += dy;
            if (scrollDelta.current > 150 && expanded) setExpanded(false);
          } else {
            // Scrolling up — reset delta
            scrollDelta.current = 0;
          }
          // Re-expand when near top
          if (y < 20 && !expanded) { setExpanded(true); scrollDelta.current = 0; }
        }

        lastY.current = y;
        raf = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [expanded, userToggled]);

  // Reset manual override after 6s
  useEffect(() => {
    if (!userToggled) return;
    const t = setTimeout(() => { setUserToggled(false); scrollDelta.current = 0; }, 6000);
    return () => clearTimeout(t);
  }, [userToggled]);

  if (data.cards.length === 0) return null;

  return (
    <div className="rounded-xl mb-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf3 50%, #f0f9f0 100%)",
        border: "1px solid #c6e7d4",
        boxShadow: expanded ? "0 1px 3px rgba(45,106,79,0.08)" : "0 1px 2px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.4s ease",
      }}>

      {/* ── Header ── */}
      <button
        onClick={() => { setExpanded(p => !p); setUserToggled(true); scrollDelta.current = 0; }}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-brand-500 animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-sand-900">{data.weekTotal} updates this week</div>
          <div className="text-[10px] text-sand-500">{data.cards.reduce((s, c) => s + c.entries.length, 0)} milestones · {data.waiting} waiting</div>
        </div>

        {/* Collapsed: mini step dots */}
        <div className="flex gap-1 flex-shrink-0"
          style={{ opacity: expanded ? 0 : 1, transform: expanded ? "scale(0.8)" : "scale(1)",
            transition: "opacity 0.3s ease, transform 0.3s ease" }}>
          {data.cards.slice(0, 5).map(c => (
            <div key={c.stepId} className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm ${STEP_COLORS[c.stepId] || "bg-sand-400"}`}>
              {c.thisWeek || c.entries.length}
            </div>
          ))}
        </div>

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8880" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0"
          style={{ transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>

      {/* ── Cards body ── */}
      <div style={{
        maxHeight: expanded ? "320px" : "0px",
        opacity: expanded ? 1 : 0,
        transition: "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease",
        transitionDelay: expanded ? "0s, 0.05s" : "0s, 0s",
        overflow: "hidden",
      }}>
        <div className="px-3 pb-3">
          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth pb-1"
            style={{ WebkitOverflowScrolling: "touch", paddingLeft: 2, paddingRight: 2 }}>
            {data.cards.map((card) => (
              <div key={card.stepId}
                className="flex-shrink-0 w-[68vw] max-w-[255px] rounded-xl overflow-hidden snap-start"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 0.5px 1px rgba(0,0,0,0.06)",
                }}>

                {/* Card header */}
                <div className="px-3 py-2 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", background: "rgba(250,250,248,0.5)" }}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${STEP_COLORS[card.stepId] || "bg-sand-400"}`}
                      style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.8)" }} />
                    <span className="text-[12px] font-bold text-sand-900">{card.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {card.thisWeek > 0 && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-700">+{card.thisWeek}</span>
                    )}
                    <span className="text-[10px] font-medium text-sand-400">{card.entries.length}</span>
                  </div>
                </div>

                {/* Entries */}
                <div className="h-[168px] relative">
                  <div className="absolute top-0 left-0 right-0 h-5 z-10 pointer-events-none"
                    style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.95), transparent)" }} />
                  <div className="absolute bottom-0 left-0 right-0 h-5 z-10 pointer-events-none"
                    style={{ background: "linear-gradient(to top, rgba(255,255,255,0.95), transparent)" }} />

                  <SmoothScroll count={card.entries.length}>
                    <div className="py-1.5">
                      {card.entries.slice(0, 25).map((a, i) => (
                        <div key={`${a.initials}-${i}`}
                          className="flex items-center gap-2 px-3 py-[6px] mx-1 rounded-lg"
                          style={{ transition: "background 0.15s ease" }}>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${
                            a.stream === "Outland" ? "bg-brand-500" : "bg-warn"
                          }`} style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
                            {a.initials.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold text-sand-900 truncate leading-tight">{a.initials}</div>
                            <div className="text-[9px] text-sand-400 leading-tight">{a.country} · Sub {fmtDate(a.subDate)} · {a.days}d</div>
                          </div>
                          <div className="text-[10px] font-semibold text-sand-600 flex-shrink-0 tabular-nums">{fmtDate(a.stepDate)}</div>
                        </div>
                      ))}
                    </div>
                  </SmoothScroll>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
