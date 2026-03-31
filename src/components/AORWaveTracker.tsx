"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${MO[dt.getMonth()]} ${dt.getDate()}`;
}

interface AorEntry {
  initials: string;
  aorDate: string;
  subDate: string;
  stream: string;
  days: number;
  country: string;
}

function AutoSwipeController({ scrollRef, cards, pausedRef, expanded }: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  cards: { entries: { initials: string }[] }[];
  pausedRef: React.MutableRefObject<boolean>;
  expanded: boolean;
}) {
  const cardIdx = useRef(0);

  const getDwellTime = useCallback((idx: number): number => {
    const count = Math.min(cards[idx]?.entries.length || 0, 8);
    if (count === 0) return 3000;
    if (count <= 3) return 5000;
    return count * 2500;
  }, [cards]);

  const scrollToCard = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardEl = el.children[idx] as HTMLElement | undefined;
    if (!cardEl) return;
    const targetScroll = cardEl.offsetLeft - el.offsetLeft - 8;
    const startScroll = el.scrollLeft;
    const diff = targetScroll - startScroll;
    if (Math.abs(diff) < 2) return;
    let start: number | null = null;
    const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      el.scrollLeft = startScroll + diff * ease(p);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [scrollRef]);

  useEffect(() => {
    if (!expanded) return;
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const dwell = getDwellTime(cardIdx.current);
      timeout = setTimeout(() => {
        if (!pausedRef.current) {
          cardIdx.current = (cardIdx.current + 1) % 3;
          scrollToCard(cardIdx.current);
        }
        scheduleNext();
      }, dwell);
    };
    scheduleNext();
    return () => clearTimeout(timeout);
  }, [expanded, getDwellTime, scrollToCard, pausedRef]);

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

    const allAors: AorEntry[] = [];
    apps.forEach(a => {
      const ev = (a.step_events || []).find(e => e.step_id === "aor");
      if (!ev) return;
      const s = buildStepsMap(a.step_events || []);
      const days = s.submitted && s.aor ? daysBetween(s.submitted, s.aor) : 0;
      allAors.push({
        initials: a.initials, aorDate: ev.event_date, subDate: s.submitted || "",
        stream: a.stream, days, country: a.country_origin,
      });
    });

    allAors.sort((a, b) => b.aorDate.localeCompare(a.aorDate));

    const todayAors = allAors.filter(e => e.aorDate === todayStr);
    const lastWeekAors = allAors.filter(e => e.aorDate >= lastWeekStartStr && e.aorDate <= lastWeekEndStr);
    const weekAors = allAors.filter(e => e.aorDate >= thisWeekStartStr);
    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;
    const latestAorDate = allAors.length > 0 ? allAors[0].aorDate : "";
    const daysSinceLast = latestAorDate ? daysBetween(latestAorDate, todayStr) : 0;

    return { todayAors, lastWeekAors, weekAors, waiting, totalAor: allAors.length, daysSinceLast, latestAorDate };
  }, [apps]);

  const [expanded, setExpanded] = useState(true);
  const [userToggled, setUserToggled] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const lastScrollY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const touchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Measure content height on mount and resize
  useEffect(() => {
    const measure = () => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight);
      }
    };
    measure();
    // Re-measure after a tick (fonts/images may load)
    const t = setTimeout(measure, 100);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [data]);

  // Scroll-to-collapse
  useEffect(() => {
    if (typeof window === "undefined") return;
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;

        if (!userToggled) {
          if (y > 100 && y > lastScrollY.current && expanded) {
            setExpanded(false);
          }
        }

        if (y < 10 && !expanded) {
          setExpanded(true);
          setUserToggled(false);
        }

        lastScrollY.current = y;
        rafId = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [expanded, userToggled]);

  // Reset manual toggle
  useEffect(() => {
    if (!userToggled) return;
    const t = setTimeout(() => setUserToggled(false), 5000);
    return () => clearTimeout(t);
  }, [userToggled]);

  const handleToggle = () => {
    // Re-measure before expanding
    if (!expanded && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
    setExpanded(prev => !prev);
    setUserToggled(true);
  };

  if (data.totalAor === 0) return null;

  const hasWeekActivity = data.weekAors.length > 0;
  const hasTodayAors = data.todayAors.length > 0;

  const cards = hasTodayAors
    ? [
        { label: "Today", entries: data.todayAors },
        { label: "This Week", entries: data.weekAors },
        { label: "Last Week", entries: data.lastWeekAors },
      ]
    : [
        { label: "This Week", entries: data.weekAors },
        { label: "Last Week", entries: data.lastWeekAors },
        { label: "Today", entries: data.todayAors },
      ];

  const handleTouchStart = () => { pausedRef.current = true; };
  const handleTouchEnd = () => {
    clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => { pausedRef.current = false; }, 10000);
  };

  return (
    <div
      className={`rounded-xl mb-4 border ${
        hasWeekActivity
          ? "bg-gradient-to-r from-brand-50 to-brand-100 border-brand-200"
          : "bg-white border-sand-200"
      }`}
    >
      {/* Tappable header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasWeekActivity ? "bg-brand-500 animate-pulse" : "bg-sand-400"}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-sand-900">
            {hasTodayAors
              ? `${data.todayAors.length} AOR${data.todayAors.length > 1 ? "s" : ""} today`
              : hasWeekActivity
              ? `${data.weekAors.length} AOR${data.weekAors.length > 1 ? "s" : ""} this week`
              : `${data.daysSinceLast}d since last AOR`}
          </div>
          <div className="text-[10px] text-sand-400">{data.totalAor} total · {data.waiting} waiting</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-2 text-center">
            <div>
              <div className="text-sm font-bold text-brand-600">{data.weekAors.length}</div>
              <div className="text-[8px] text-sand-400">Week</div>
            </div>
            <div>
              <div className="text-sm font-bold text-warn-dark">{data.waiting}</div>
              <div className="text-[8px] text-sand-400">Wait</div>
            </div>
          </div>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0ADA6" strokeWidth="2" strokeLinecap="round"
            className="flex-shrink-0"
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
          >
            <path d="M6 9L12 15L18 9" />
          </svg>
        </div>
      </button>

      {/* Collapsible body — measured height approach */}
      <div
        style={{
          height: expanded ? `${contentHeight}px` : "0px",
          overflow: "hidden",
          transition: "height 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        <div
          ref={contentRef}
          className="px-4 pb-4"
          style={{
            opacity: expanded ? 1 : 0,
            transition: "opacity 0.25s ease",
            transitionDelay: expanded ? "0.08s" : "0s",
          }}
        >
          <AutoSwipeController scrollRef={scrollRef} cards={cards} pausedRef={pausedRef} expanded={expanded} />
          <div
            ref={scrollRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="flex gap-3 overflow-x-auto hide-scrollbar pb-1"
          >
            {cards.map((card) => (
              <div
                key={card.label}
                className="flex-shrink-0 w-[78vw] max-w-[300px] bg-white/80 rounded-xl border border-sand-100 overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-sand-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sand-900">{card.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    card.entries.length > 0 ? "bg-brand-100 text-brand-700" : "bg-sand-100 text-sand-400"
                  }`}>{card.entries.length}</span>
                </div>

                {card.entries.length === 0 ? (
                  <div className="px-3 py-5 text-center">
                    <div className="text-[11px] text-sand-400">No AORs {card.label.toLowerCase()}</div>
                  </div>
                ) : (
                  <div className="overflow-hidden h-[120px] relative">
                    <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-white/90 to-transparent z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-white/90 to-transparent z-10 pointer-events-none" />
                    <div
                      className={card.entries.length > 3 ? "aor-vertical-scroll" : ""}
                      style={card.entries.length > 3 ? { animationDuration: `${Math.min(card.entries.length, 8) * 2.5}s` } : { paddingTop: 4 }}
                    >
                      {(card.entries.length > 3
                        ? [...card.entries.slice(0, 8), ...card.entries.slice(0, 8)]
                        : card.entries
                      ).map((a, i) => (
                        <div key={`${a.initials}-${i}`} className="flex items-center gap-2.5 px-3 py-1.5">
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
                            <div className="text-[9px] text-sand-400">{a.country} · Sub {fmtDate(a.subDate)}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[11px] font-bold text-brand-600">{a.days}d</div>
                            <div className="text-[8px] text-sand-400">{fmtDate(a.aorDate)}</div>
                          </div>
                        </div>
                      ))}
                      {card.entries.length > 8 && (
                        <div className="text-center text-[9px] text-sand-400 py-1">+{card.entries.length - 8} more</div>
                      )}
                    </div>
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
