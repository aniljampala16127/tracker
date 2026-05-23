"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Application, ApplicationFormData, StepId } from "@/lib/types";
import { STEPS, COMMON_COUNTRIES, APPLICATION_SUBCATEGORIES, STREAMS, SPONSOR_STATUSES, MEI_TYPES, getNextStep, getVisibleSteps } from "@/lib/constants";
import { formatDate, daysBetween, buildStepsMap } from "@/lib/utils";
import { hashPin, isValidPin, savePinForApp, getSavedPinHash, removeSavedPin } from "@/lib/pin";
import { PlusIcon } from "@/components/icons";
import { Button, Modal, Input, Select, SearchableSelect } from "@/components/ui";
import { PinModal, PinInput } from "@/components/PinModal";
import { ClaimPinModal } from "@/components/ClaimPinModal";
import { AvatarIcon, isAvatarKey } from "@/components/AvatarIcons";
import { CommentsSection } from "@/components/CommentsSection";
import dynamic from "next/dynamic";
import { FilterBar, Filters, EMPTY_FILTERS } from "@/components/FilterBar";
const StepChart = dynamic(() => import("@/components/StepChart").then(m => ({ default: m.StepChart })), {
  loading: () => <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5 h-[300px] animate-pulse bg-sand-50" />,
  ssr: false,
});
import { Reactions, ReactionsBadge } from "@/components/Reactions";

import { Confetti } from "@/components/Confetti";
import { AORWaveTracker } from "@/components/AORWaveTracker";
import { NewSinceLastVisit } from "@/components/NewSinceLastVisit";
import { CelebrationWall } from "@/components/CelebrationWall";
import { CohortAORAlert } from "@/components/CohortAORAlert";
import { DashboardSkeleton } from "@/components/Skeleton";
import { PullToRefresh } from "@/components/PullToRefresh";
import { playMilestoneSound } from "@/lib/sounds";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Local timezone today — prevents UTC date mismatch after 8 PM EDT
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Buttery smooth scroll for any element or window — works on iOS Safari
function smoothScroll(target: HTMLElement | Window, to: number, duration = 600) {
  const isWindow = target === window;
  const startPos = isWindow ? window.scrollY : (target as HTMLElement).scrollTop;
  const diff = to - startPos;
  if (Math.abs(diff) < 2) return;
  let startTime: number | null = null;
  const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = (ts: number) => {
    if (!startTime) startTime = ts;
    const progress = Math.min((ts - startTime) / duration, 1);
    const val = startPos + diff * ease(progress);
    if (isWindow) window.scrollTo(0, val);
    else (target as HTMLElement).scrollTop = val;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function CollapsibleChart({ apps }: { apps: Application[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-sand-200 rounded-xl mb-4 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-sand-50 transition-colors">
        <div>
          <div className="text-sm font-bold text-sand-900">Average Days per Step</div>
          <div className="text-[11px] text-sand-400">Outland vs Inland — community data</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>
      <div style={{
        maxHeight: open ? "500px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div style={{ opacity: open ? 1 : 0, transition: "opacity 0.25s ease", transitionDelay: open ? "0.1s" : "0s" }}>
          <StepChart apps={apps} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showIntent, setShowIntent] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [celebrateApp, setCelebrateApp] = useState<Application | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  // PIN state
  const [pinTarget, setPinTarget] = useState<Application | null>(null);
  const [claimTarget, setClaimTarget] = useState<Application | null>(null);

  // Always scroll to top on mount — aggressive for iOS Safari
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const forceTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    forceTop();
    requestAnimationFrame(forceTop);
    const t1 = setTimeout(forceTop, 0);
    const t2 = setTimeout(forceTop, 50);
    const t3 = setTimeout(forceTop, 150);
    const t4 = setTimeout(forceTop, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const fetchApps = useCallback(async () => {
    const res = await fetch("/api/applications");
    const data = await res.json();
    if (Array.isArray(data)) {
      const sorted = (data as Application[]).sort((a, b) => {
        const aD = a.step_events?.find(e => e.step_id === "submitted")?.event_date || "";
        const bD = b.step_events?.find(e => e.step_id === "submitted")?.event_date || "";
        return aD.localeCompare(bD);
      });
      setApps(sorted);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // Scroll to top on mount
  const topRef = useRef<HTMLDivElement>(null);
const submittingRef = useRef(false); // synchronous lock against double-clicks
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    // Immediate
    topRef.current?.scrollIntoView();
    // After data loads and DOM settles
    const t1 = setTimeout(() => topRef.current?.scrollIntoView(), 100);
    const t2 = setTimeout(() => topRef.current?.scrollIntoView(), 300);
    const t3 = setTimeout(() => topRef.current?.scrollIntoView(), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Filtered apps
  const filteredApps = useMemo(() => {
    return apps.filter((a) => {
      if (filters.stream && a.stream !== filters.stream) return false;
      if (filters.country && a.country_origin !== filters.country) return false;
      if (filters.sponsor_status && a.sponsor_status !== filters.sponsor_status) return false;
      if (filters.subcategory && a.subcategory !== filters.subcategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!a.initials.toLowerCase().includes(q) && !a.country_origin.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [apps, filters, searchQuery]);

  // Unique values for filter dropdowns (from actual data)
  const availableCountries = useMemo(() => Array.from(new Set(apps.map(a => a.country_origin))).sort(), [apps]);

  const handleAdd = async (form: ApplicationFormData & { pin: string }) => {
  // Sync lock — engages before React re-renders, defeats panic-clicks and Enter-key spam
  if (submittingRef.current) return;
  submittingRef.current = true;

  if (form.submitted_date > localToday()) {
    alert("Submission date cannot be in the future");
    submittingRef.current = false;
    return;
  }

  setSubmitting(true);

  try {
    const pinHash = await hashPin(form.pin);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initials: form.initials.trim(),
        sponsor_status: form.sponsor_status,
        stream: form.stream,
        country_origin: form.country_origin,
        subcategory: form.subcategory || null,
        visa_country: form.visa_country || null,
        mei_type: form.mei_type || null,
        province: form.province,
        notes: form.notes || null,
        pin_hash: pinHash,
        submitted_date: form.submitted_date,
      }),
    });

    if (res.ok) {
      const app = await res.json();
      savePinForApp(app.id, pinHash);
      setShowAdd(false);
      fetchApps();
      // Fetch full app for celebration
      const appsRes = await fetch("/api/applications");
      const allApps = await appsRes.json();
      const fullApp = allApps.find((a: Application) => a.id === app.id);
      if (fullApp) setCelebrateApp(fullApp);
    } else {
      const err = await res.json();
      alert(
        err.pin_exists
          ? "This PIN is already taken. Please choose a different 4-digit PIN."
          : (err.error || "Failed to add")
      );
    }
  } catch (e) {
    alert("Network error — please check your connection and try again.");
  } finally {
    submittingRef.current = false;
    setSubmitting(false);
  }
};

  /** Row click - always open detail view. PIN only for editing. */
  const handleRowClick = (app: Application) => {
    setEditApp(app);
  };

  const handleMarkStep = async (appId: string, stepId: StepId, date: string) => {
    const pinHash = getSavedPinHash(appId);
    await fetch("/api/steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: appId, step_id: stepId, event_date: date, pin_hash: pinHash || "" }),
    });
    fetchApps();
    // Refresh edit app if open
    const appsRes = await fetch("/api/applications");
    const allApps = await appsRes.json();
    const updated = allApps.find((a: Application) => a.id === appId);
    if (updated) setEditApp(updated);
  };

  const handleDelete = async (appId: string) => {
    if (!confirm("Delete this entry?")) return;
    const pinHash = getSavedPinHash(appId);
    await fetch(`/api/applications?id=${appId}&pin_hash=${pinHash || ""}`, { method: "DELETE" });
    removeSavedPin(appId);
    setEditApp(null); fetchApps();
  };


  // Group filtered apps by month
  const monthGroups: Record<string, Application[]> = {};
  filteredApps.forEach((app) => {
    const sub = app.step_events?.find(e => e.step_id === "submitted");
    if (!sub) return;
    const d = new Date(sub.event_date + "T00:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(app);
  });
  const sortedMonths = Object.keys(monthGroups).sort();

  // Find user's own entry
  const myEntry = useMemo(() => {
    return apps.find(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash) || null;
  }, [apps]);

  // Find which month the user's entry is in
  const myEntryMonth = useMemo(() => {
    if (!myEntry) return "";
    const sub = myEntry.step_events?.find(e => e.step_id === "submitted");
    if (!sub) return "";
    const d = new Date(sub.event_date + "T00:00:00");
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [myEntry]);

  const hasScrolled = useRef(false);

  // Auto-select user's month on first load, fall back to latest month
  useEffect(() => {
    if (sortedMonths.length > 0 && !selectedMonth) {
      if (myEntryMonth && monthGroups[myEntryMonth]) {
        setSelectedMonth(myEntryMonth);
      } else {
        setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
      }
    }
  }, [sortedMonths, selectedMonth, myEntryMonth]);

  // Auto-scroll active month pill into view
  useEffect(() => {
    if (!selectedMonth) return;
    requestAnimationFrame(() => {
      const btn = document.querySelector(`[data-month="${selectedMonth}"]`) as HTMLElement | null;
      btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  }, [selectedMonth]);

  // Auto-scroll to user's entry after render
  useEffect(() => {
    if (!myEntry || selectedMonth !== myEntryMonth || hasScrolled.current) return;
    const tryScroll = () => {
      const el = document.querySelector('[data-my-entry="true"]') as HTMLElement | null;
      if (!el) return;
      hasScrolled.current = true;

      // Find the scrollable container (#mobile-entries on mobile, table wrapper on desktop)
      const container = document.getElementById("mobile-entries") || el.closest('.overflow-auto') as HTMLElement | null;
      if (container) {
        // Calculate position relative to the container
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = elRect.top - containerRect.top + container.scrollTop;
        const targetScroll = relativeTop - container.clientHeight / 3;
        smoothScroll(container, Math.max(0, targetScroll), 800);
      }
    };
    const t1 = setTimeout(tryScroll, 700);
    const t2 = setTimeout(tryScroll, 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [selectedMonth, myEntry, myEntryMonth]);

  if (loading) return <DashboardSkeleton />;

  const isFiltered = Object.values(filters).some(Boolean);
  const hasMyEntry = apps.some(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash);

  // Compute teaser stats
  const aorDaysAll: number[] = [];
  apps.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (s.submitted && s.aor) aorDaysAll.push(daysBetween(s.submitted, s.aor));
  });
  const avgAorAll = aorDaysAll.length ? Math.round(aorDaysAll.reduce((a, b) => a + b, 0) / aorDaysAll.length) : null;
  const waitingForAor = apps.filter(a => !a.step_events?.some(e => e.step_id === "aor")).length;

  // Selected month group data
  const selectedGroupRaw = selectedMonth ? monthGroups[selectedMonth] || [] : [];
  // Always put user's own entry at the top
  const selectedGroup = myEntry && selectedGroupRaw.some(a => a.id === myEntry.id)
    ? [selectedGroupRaw.find(a => a.id === myEntry.id)!, ...selectedGroupRaw.filter(a => a.id !== myEntry.id)]
    : selectedGroupRaw;
  const selectedOutland = selectedGroup.filter(a => a.stream === "Outland").length;
  const selectedInland = selectedGroup.filter(a => a.stream === "Inland").length;
  const selectedMonthParts = selectedMonth ? selectedMonth.split("-") : [];
  const selectedMonthLabel = selectedMonthParts.length === 2 ? `${MO[parseInt(selectedMonthParts[1]) - 1]} ${selectedMonthParts[0]}` : "";

  // Show 5 entries by default, expand on click. Always include user's own entry.
  // When collapsed, prioritize entries submitted closest to user's date (same-week cohort).
  const INITIAL_VISIBLE = 5;
  const isMonthExpanded = expandedMonths.has(selectedMonth);
  const visibleGroup = (() => {
    if (isMonthExpanded || selectedGroup.length <= INITIAL_VISIBLE) return selectedGroup;

    // If user has an entry in this group, show it first + 4 closest by submission date
    if (myEntry && selectedGroup.some(a => a.id === myEntry.id)) {
      const mySubEvent = myEntry.step_events?.find(e => e.step_id === "submitted");
      const mySubTime = mySubEvent ? new Date(mySubEvent.event_date).getTime() : 0;
      const others = selectedGroup.filter(a => a.id !== myEntry.id);

      if (mySubTime > 0) {
        const ONE_DAY = 86400000;
        // Tiered sort: 1) same date, 2) same week (±3d), 3) rest — then by proximity
        others.sort((a, b) => {
          const aSub = a.step_events?.find(e => e.step_id === "submitted");
          const bSub = b.step_events?.find(e => e.step_id === "submitted");
          const aDays = aSub ? Math.round(Math.abs(new Date(aSub.event_date).getTime() - mySubTime) / ONE_DAY) : 999;
          const bDays = bSub ? Math.round(Math.abs(new Date(bSub.event_date).getTime() - mySubTime) / ONE_DAY) : 999;
          // Tier: 0 = same date, 1 = same week, 2 = rest
          const aTier = aDays === 0 ? 0 : aDays <= 3 ? 1 : 2;
          const bTier = bDays === 0 ? 0 : bDays <= 3 ? 1 : 2;
          if (aTier !== bTier) return aTier - bTier;
          return aDays - bDays;
        });
      }
      return [myEntry, ...others.slice(0, INITIAL_VISIBLE - 1)];
    }

    return selectedGroup.slice(0, INITIAL_VISIBLE);
  })();
  const hiddenCount = selectedGroup.length - visibleGroup.length;
  const toggleMonthExpand = () => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(selectedMonth)) next.delete(selectedMonth);
      else next.add(selectedMonth);
      return next;
    });
  };

  return (
    <>
    <div ref={topRef} />
    <PullToRefresh onRefresh={async () => { await fetchApps(); }}>
    <div className="page-enter">
      {/* CTA for new users — compact with live stats */}
      {!hasMyEntry && (
        <div className="mb-4 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 rounded-2xl p-4 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-bold mb-0.5">Track your spousal sponsorship</h3>
                <p className="text-[10px] text-white/60">Join {apps.length}+ applicants · Get your predicted AOR date</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <div className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-sm font-bold">{avgAorAll || "—"}d</div>
                  <div className="text-[7px] text-white/50 uppercase">Avg AOR</div>
                </div>
                <div className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-sm font-bold">{apps.length}</div>
                  <div className="text-[7px] text-white/50 uppercase">Tracking</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowIntent(true)}
              className="w-full px-4 py-2.5 bg-white text-brand-600 text-xs font-bold rounded-xl hover:bg-sand-50 transition-all active:scale-[0.98] shadow-lg"
            >
              Add Your Application — 30 seconds
            </button>
          </div>
        </div>
      )}

      {/* Community widgets — only for returning users who have context */}
      {hasMyEntry && <CelebrationWall apps={apps} />}
      {hasMyEntry && apps.length > 0 && <NewSinceLastVisit apps={apps} />}
      {hasMyEntry && apps.length > 0 && <CohortAORAlert apps={apps} />}

      {/* AOR Wave Tracker */}
      {apps.length > 0 && (
        <AORWaveTracker apps={apps} />
      )}

      {/* Header — eyebrow + count, with Add CTA */}
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] text-sand-500 font-bold uppercase tracking-[0.08em] mb-0.5">
            Community tracker
          </p>
          <h1 className="text-xl font-bold text-sand-900 tracking-tight nums-tabular">
            {isFiltered || searchQuery
              ? <><span>{filteredApps.length}</span><span className="text-sand-400 font-medium"> / {apps.length}</span><span className="text-sm text-sand-500 font-medium"> entries</span></>
              : <><span>{apps.length}</span><span className="text-sm text-sand-500 font-medium"> entries</span></>}
          </h1>
        </div>
        {!hasMyEntry && (
          <Button onClick={() => setShowIntent(true)} size="sm">
            <PlusIcon size={14} className="text-white" /> Add
          </Button>
        )}
      </div>

      {/* Search */}
      {apps.length > 10 && (
        <div className="relative mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-400 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21L16.65 16.65"/></svg>
          <input
            type="text"
            placeholder="Search by name or country…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-sand-200 bg-white shadow-[0_1px_2px_rgba(26,26,24,0.03)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 placeholder:text-sand-400 transition-shadow"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-sand-400 hover:text-sand-700 hover:bg-sand-100 transition-colors" aria-label="Clear search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6L18 18"/></svg>
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      {apps.length > 0 && (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          availableCountries={availableCountries}
        />
      )}

      {/* Bar Chart — collapsible */}
      {/* Average Days per Step — moved to Stats tab */}

      {/* Empty state */}
      {filteredApps.length === 0 && (
        <div className="text-center py-20 bg-white border border-sand-200 rounded-xl">
          <p className="text-sand-500 text-sm mb-4">
            {searchQuery ? `No results for "${searchQuery}"` : isFiltered ? "No entries match your filters" : "No entries yet"}
          </p>
          {(isFiltered || searchQuery) ? (
            <Button onClick={() => { setFilters(EMPTY_FILTERS); setSearchQuery(""); }} size="sm" variant="secondary">
              Clear All
            </Button>
          ) : (
            <Button onClick={() => setShowIntent(true)} size="sm">
              <PlusIcon size={14} className="text-white" /> Add First Entry
            </Button>
          )}
        </div>
      )}

      {/* Month pills */}
      {sortedMonths.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-sand-500 font-bold uppercase tracking-[0.08em] mb-2">
            By submission month
          </p>
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1">
            {sortedMonths.map((monthKey) => {
              const [y, m] = monthKey.split("-");
              const grp = monthGroups[monthKey];
              const active = selectedMonth === monthKey;
              return (
                <button
                  key={monthKey}
                  onClick={() => setSelectedMonth(monthKey)}
                  data-month={monthKey}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] ${
                    active
                      ? "bg-brand-500 text-white shadow-md shadow-brand-500/20 border border-brand-600"
                      : "bg-white border border-sand-200 text-sand-700 hover:border-brand-300 hover:bg-brand-50/40"
                  }`}
                >
                  <span className="font-bold tracking-tight">{MO[parseInt(m) - 1]} {y}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none nums-tabular ${
                    active ? "bg-white/25 text-white" : "bg-sand-100 text-sand-600"
                  }`}>{grp.length}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected month entries */}
      {selectedMonth && selectedGroup.length > 0 && (
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden mb-3 shadow-[0_1px_2px_rgba(26,26,24,0.03)]">
            <div className="px-4 py-2.5 border-b border-sand-100 flex items-center justify-between gap-2 bg-sand-50/50">
              <div className="flex items-center gap-2 text-[11px] text-sand-600 font-medium">
                <span className="nums-tabular font-bold text-sand-800">{selectedGroup.length}</span>
                <span className="text-sand-500">{selectedGroup.length === 1 ? "entry" : "entries"}</span>
                <span className="text-sand-300">·</span>
                <span className="nums-tabular">{selectedOutland}</span>
                <span className="text-sand-500">outland</span>
                {selectedInland > 0 && (
                  <>
                    <span className="text-sand-300">·</span>
                    <span className="nums-tabular">{selectedInland}</span>
                    <span className="text-sand-500">inland</span>
                  </>
                )}
              </div>
            </div>

            {/* GATE: Non-logged-in users see blurred preview + CTA */}
            {!hasMyEntry && (
              <div className="relative">
                {/* Blurred preview — taller so cards extend beyond unlock card (peek-through) */}
                <div className="p-2 space-y-2 blur-[5px] opacity-50 pointer-events-none select-none" aria-hidden="true">
                  {selectedGroup.slice(0, 6).map((app) => (
                    <div key={app.id} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white border border-sand-200">
                      <div className="w-9 h-9 rounded-lg bg-sand-200 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="h-3.5 w-24 bg-sand-300 rounded mb-1.5" />
                        <div className="h-2.5 w-36 bg-sand-200 rounded" />
                      </div>
                      <div className="text-right">
                        <div className="h-3 w-20 bg-sand-200 rounded mb-1" />
                        <div className="h-2 w-12 bg-sand-100 rounded ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
                {/* CTA overlay — positioned at top so blurred cards peek through below */}
                <div className="absolute inset-x-0 top-0 flex flex-col items-center pt-8 px-4">
                  <div
                    className="border rounded-2xl p-5 text-center shadow-xl max-w-xs w-full"
                    style={{
                      backgroundColor: "var(--surface-card)",
                      borderColor: "var(--surface-card-border)",
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center mx-auto mb-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <p className="text-base font-bold text-sand-900 mb-1">Unlock community data</p>
                    <p className="text-[11px] text-sand-500 mb-4 leading-relaxed">
                      See all <span className="font-bold text-sand-700">{selectedGroup.length} entries</span> for {selectedMonthLabel} — timelines, processing days, and predictions
                    </p>
                    <button
                      onClick={() => setShowIntent(true)}
                      className="w-full px-4 py-3 bg-brand-500 text-white text-xs font-bold rounded-xl hover:bg-brand-600 transition-all active:scale-[0.98] shadow-lg shadow-brand-500/20"
                    >
                      Add Your Application — 30 sec
                    </button>
                    <p className="text-[10px] text-sand-400 mt-2">Free · No sign-up · PIN protected</p>
                  </div>
                </div>
              </div>
            )}

            {/* Logged-in: show actual entries */}
            {hasMyEntry && <>
            {/* Mobile card view */}
            <div className="sm:hidden max-h-[65vh] overflow-y-auto p-2 space-y-2 entries-stagger" id="mobile-entries" key={selectedMonth}>
              {visibleGroup.map((app) => {
                const stepsMap = buildStepsMap(app.step_events || []);
                const appSteps = getVisibleSteps(app.stream);
                const completedSteps = appSteps.filter(s => stepsMap[s.id]);
                const nextStepDef = appSteps.find(s => s.id !== "submitted" && !stepsMap[s.id]);
                const statusLabel = app.is_complete ? "eCoPR ✓" : nextStepDef ? `Waiting for ${nextStepDef.label}` : "Submitted";
                const statusDone = app.is_complete;
                const hasAor = !!stepsMap.aor;
                const daysWaiting = stepsMap.submitted
                  ? daysBetween(stepsMap.submitted, hasAor && stepsMap.aor ? stepsMap.aor : new Date().toISOString().split("T")[0])
                  : null;
                const isMe = myEntry?.id === app.id;

                return (
                  <div
                    key={app.id}
                    data-my-entry={isMe ? "true" : undefined}
                    onClick={() => handleRowClick(app)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                      isMe
                        ? "bg-brand-500/10 border-2 border-brand-400 shadow-[0_2px_8px_rgba(45,106,79,0.10)] my-entry-highlight my-entry-slide"
                        : "bg-white border border-sand-200 active:bg-sand-50 active:scale-[0.995] hover:border-brand-200"
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                      app.emoji ? "bg-brand-50 border border-brand-200 text-brand-600"
                        : isMe ? "bg-brand-500 text-white shadow-sm shadow-brand-500/25" : "bg-sand-100 text-sand-600"
                    }`}>
                      {app.emoji && isAvatarKey(app.emoji)
                        ? <AvatarIcon icon={app.emoji} size={20} />
                        : app.emoji
                          ? <span className="text-lg">{app.emoji}</span>
                          : <span className="text-[11px]">{app.initials.slice(0, 2).toUpperCase()}</span>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-sand-900">{app.initials}</span>
                        {isMe && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500 text-white font-bold leading-none tracking-wider">YOU</span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                          app.stream === "Outland" ? "bg-brand-100 text-brand-700" : "bg-warn/15 text-warn-dark"
                        }`}>{app.stream}</span>
                        <ReactionsBadge applicationId={app.id} />
                        {(app.comments?.length || 0) > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sand-100 text-sand-600 font-bold flex items-center gap-0.5 leading-none nums-tabular">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                            {app.comments!.length}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-sand-500 truncate mt-0.5 nums-tabular">
                        {app.country_origin} · {app.sponsor_status}
                        {stepsMap.submitted && <span> · Sub {formatDate(stepsMap.submitted)}</span>}
                      </div>
                    </div>

                    {/* Status + progress bar */}
                    <div className="text-right flex-shrink-0 min-w-[80px]">
                      {statusDone ? (
                        <div className="text-xs font-bold text-brand-600 mb-1">eCoPR ✓</div>
                      ) : (
                        <>
                          <div className={`text-[10px] font-bold leading-tight ${hasAor ? "text-brand-600" : "text-warn-dark"}`}>
                            {statusLabel}
                          </div>
                          <div className="text-[9px] text-sand-400 mb-1 nums-tabular">
                            {completedSteps.length}/{appSteps.length}{daysWaiting != null ? ` · Day ${daysWaiting}` : ""}
                          </div>
                        </>
                      )}
                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-sand-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${statusDone ? "bg-brand-500" : hasAor ? "bg-brand-400" : "bg-warn"}`}
                          style={{ width: `${Math.round((completedSteps.length / appSteps.length) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block border-t border-sand-100 overflow-auto max-h-[70vh]">
                <table className="w-full text-sm nums-tabular">
                  <thead className="sticky top-0 z-20 bg-sand-50 shadow-[0_1px_0_var(--sand-200)]">
                    <tr className="bg-sand-50 text-[9px] font-bold text-sand-500 uppercase tracking-[0.06em]">
                      <th className="text-left px-3 py-2.5 sticky left-0 bg-sand-50 z-30 border-r border-sand-200">Name</th>
                      <th className="text-left px-1.5 py-2.5 bg-sand-50">Sponsor</th>
                      <th className="text-left px-1.5 py-2.5 bg-sand-50">PA country</th>
                      <th className="text-left px-1.5 py-2.5 bg-sand-50">Visa country</th>
                      <th className="text-center px-1.5 py-2.5 bg-sand-50">Class</th>
                      <th className="text-left px-1.5 py-2.5 bg-sand-50">App type</th>
                      <th className="text-left px-1.5 py-2.5 bg-sand-50">Submitted</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">AOR</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">BIL</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">Bio given</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">MEI</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">Sponsor elig</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">Medical req</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">Med attended</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">PA elig</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">Pre-arrival</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">Background</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">Portal 1</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">Portal 2</th>
                      <th className="text-center px-1 py-2.5 bg-sand-50">eCoPR</th>
                      <th className="text-center px-1.5 py-2.5 w-8 bg-sand-50">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline text-sand-400">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleGroup.map((app) => {
                      const stepsMap = buildStepsMap(app.step_events || []);
                      const hasPin = !!app.pin_hash;
                      const isOwner = hasPin && getSavedPinHash(app.id) === app.pin_hash;
                      const isMe = myEntry?.id === app.id;
                      return (
                        <tr key={app.id}
                          data-my-entry={isMe ? "true" : undefined}
                          className={`border-t cursor-pointer transition-colors group ${
                            isMe
                              ? "border-brand-300 bg-brand-500/[0.06] my-entry-highlight"
                              : "border-sand-100 hover:bg-brand-500/[0.04]"
                          }`}
                          style={isMe ? { boxShadow: "inset 3px 0 0 var(--brand-500)" } : undefined}
                          onClick={() => handleRowClick(app)}
                        >
                          <td className={`px-3 py-2.5 font-bold text-sand-900 whitespace-nowrap sticky left-0 border-r border-sand-100 ${isMe ? "bg-brand-500/[0.06]" : "bg-sand-50 group-hover:bg-brand-500/[0.04]"}`}>
                            <span className="flex items-center gap-1.5">
                              {app.initials}
                              {isMe && (
                                <span className="text-[9px] font-bold bg-brand-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">YOU</span>
                              )}
                              <ReactionsBadge applicationId={app.id} />
                            </span>
                          </td>
                          <td className="px-1.5 py-2.5 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              app.sponsor_status === "Citizen" ? "bg-brand-100 text-brand-700" : "bg-warn/15 text-warn-dark"
                            }`}>{app.sponsor_status}</span>
                          </td>
                          <td className="px-1.5 py-2.5 text-sand-700 text-xs whitespace-nowrap">{app.country_origin}</td>
                          <td className="px-1.5 py-2.5 text-sand-500 text-[10px] whitespace-nowrap max-w-[90px] truncate" title={app.visa_country || ""}>{app.visa_country || ""}</td>
                          <td className="px-1.5 py-2.5 text-center text-sand-500 text-[10px]">Family</td>
                          <td className="px-1.5 py-2.5 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              app.stream === "Outland" ? "bg-brand-100 text-brand-700" : "bg-warn/15 text-warn-dark"
                            }`}>{app.stream}</span>
                          </td>
                          <td className="px-1.5 py-2.5 text-xs text-sand-600 whitespace-nowrap">{formatDate(stepsMap.submitted)}</td>
                          {STEPS.slice(1)
                            .filter(s => ["aor","bil","biometrics_given","sponsor_eligibility","medical","medicals_attended","pa_eligibility","pre_arrival","background","portal1","portal2","ecopr"].includes(s.id))
                            .map((step, stepIdx, filteredSteps) => {
                            const date = stepsMap[step.id];
                            const aorDate = stepsMap.aor;
                            // AOR: days from submitted. Bio Given: from BIL. Med Attended: from Medical Req. Post-AOR: from AOR
                            let days: number | null = null;
                            if (date) {
                              if (step.id === "aor" && stepsMap.submitted) {
                                days = daysBetween(stepsMap.submitted, date);
                              } else if (step.id === "biometrics_given" && stepsMap.bil) {
                                days = daysBetween(stepsMap.bil, date);
                              } else if (step.id === "biometrics_done" && stepsMap.biometrics_given) {
                                days = daysBetween(stepsMap.biometrics_given, date);
                              } else if (step.id === "medicals_attended" && stepsMap.medical) {
                                days = daysBetween(stepsMap.medical, date);
                              } else if (step.id === "medical_passed" && stepsMap.medicals_attended) {
                                days = daysBetween(stepsMap.medicals_attended, date);
                              } else if (aorDate && step.id !== "aor") {
                                days = daysBetween(aorDate, date);
                              }
                            }

                            // Insert MEI column after BIL
                            const meiCol = step.id === "sponsor_eligibility" ? (
                              <td key="mei" className="px-1 py-2.5 text-center whitespace-nowrap">
                                {app.mei_type ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    app.mei_type === "Upfront" ? "bg-brand-100 text-brand-700" : "bg-warn/15 text-warn-dark"
                                  }`}>{app.mei_type}</span>
                                ) : <span className="text-sand-300">·</span>}
                              </td>
                            ) : null;

                            return (
                              <React.Fragment key={step.id}>
                                {meiCol}
                                <td className="px-1 py-2.5 text-center whitespace-nowrap">
                                  {date ? (
                                    <div>
                                      <div className="text-[11px] text-brand-600 font-bold leading-tight">{days}d</div>
                                      <div className="text-[9px] text-sand-400 leading-tight">{formatDate(date).replace(/, \d{4}/, "")}</div>
                                    </div>
                                  ) : (
                                    <span className="text-sand-300">·</span>
                                  )}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className="px-1.5 py-2 text-center">
                            {hasPin ? (
                              <span title={isOwner ? "Your entry" : "PIN protected"}>
                                {isOwner ? (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline text-brand-500">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                  </svg>
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline text-sand-400">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                )}
                              </span>
                            ) : (
                              <span title="Unclaimed - click to claim" className="text-[9px] text-warn font-medium">open</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-brand-500/[0.07] border-t-2 border-brand-300">
                      <td className="px-3 py-2.5 font-bold text-[10px] text-brand-700 uppercase tracking-[0.08em] sticky left-0 bg-brand-500/[0.07] border-r border-brand-200" colSpan={7}>Cohort avg</td>
                      {STEPS.slice(1)
                        .filter(s => ["aor","bil","biometrics_given","sponsor_eligibility","medical","medicals_attended","pa_eligibility","pre_arrival","background","portal1","portal2","ecopr"].includes(s.id))
                        .map((step, i, filteredSteps) => {
                        const durations: number[] = [];
                        selectedGroup.forEach(a => {
                          const s = buildStepsMap(a.step_events || []);
                          if (!s[step.id]) return;
                          // AOR: from submitted. Bio Given: from BIL. Med Attended: from Med Req. Post-AOR: from AOR
                          if (step.id === "aor" && s.submitted) {
                            durations.push(daysBetween(s.submitted, s[step.id]!));
                          } else if (step.id === "biometrics_given" && s.bil) {
                            durations.push(daysBetween(s.bil, s[step.id]!));
                          } else if (step.id === "biometrics_done" && s.biometrics_given) {
                            durations.push(daysBetween(s.biometrics_given, s[step.id]!));
                          } else if (step.id === "medicals_attended" && s.medical) {
                            durations.push(daysBetween(s.medical, s[step.id]!));
                          } else if (step.id === "medical_passed" && s.medicals_attended) {
                            durations.push(daysBetween(s.medicals_attended, s[step.id]!));
                          } else if (s.aor && step.id !== "aor") {
                            durations.push(daysBetween(s.aor, s[step.id]!));
                          }
                        });
                        const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

                        // Insert MEI avg placeholder before sponsor_eligibility
                        const meiAvg = step.id === "sponsor_eligibility" ? (
                          <td key="mei-avg" className="px-1 py-2.5 text-center"><span className="text-sand-300 text-[10px]">—</span></td>
                        ) : null;

                        return (
                          <React.Fragment key={step.id}>
                            {meiAvg}
                            <td className="px-1 py-2.5 text-center">
                              {avg != null ? <span className="text-[11px] font-bold text-brand-700">{avg}d</span> : <span className="text-sand-300 text-[10px]">—</span>}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

            {/* View More / Show Less toggle */}
            {selectedGroup.length > INITIAL_VISIBLE && (
              <button
                onClick={toggleMonthExpand}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-sand-100 text-xs font-medium transition-colors active:scale-[0.98] hover:bg-sand-50"
              >
                {isMonthExpanded ? (
                  <>
                    <span className="text-sand-500">Show less</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-sand-400"><path d="M18 15L12 9L6 15"/></svg>
                  </>
                ) : (
                  <>
                    <span className="text-brand-600">View all {selectedGroup.length} entries</span>
                    <span className="text-[9px] text-sand-400">(+{hiddenCount} more)</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-brand-500"><path d="M6 9L12 15L18 9"/></svg>
                  </>
                )}
              </button>
            )}
            </>}
          </div>
      )}

      <p className="text-[9px] text-sand-400 mt-3 text-center">
        Click any row to update steps · PIN required to edit · Unclaimed entries can be claimed
      </p>

      <IntentModal
        open={showIntent}
        onClose={() => setShowIntent(false)}
        onNewUser={() => { setShowIntent(false); setShowAdd(true); }}
        apps={apps}
        onReconnected={() => { setShowIntent(false); fetchApps(); router.push("/me"); }}
      />
      <AddModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} loading={submitting} existingApps={apps} />
      {editApp && <EditModal app={editApp} allApps={apps} onClose={() => { setEditApp(null); fetchApps(); }} onMarkStep={handleMarkStep} onDelete={handleDelete} isOwner={!!editApp.pin_hash && getSavedPinHash(editApp.id) === editApp.pin_hash} onRefresh={fetchApps} />}

      {/* PIN verification */}
      {pinTarget && pinTarget.pin_hash && (
        <PinModal
          open={!!pinTarget}
          onClose={() => setPinTarget(null)}
          expectedHash={pinTarget.pin_hash}
          appId={pinTarget.id}
          onVerified={() => { setEditApp(pinTarget); setPinTarget(null); }}
        />
      )}

      {/* Claim modal for unclaimed entries */}
      {claimTarget && (
        <ClaimPinModal
          open={!!claimTarget}
          onClose={() => setClaimTarget(null)}
          appId={claimTarget.id}
          appInitials={claimTarget.initials}
          onClaimed={(pinHash) => {
            // After claiming, open edit modal
            const claimed = { ...claimTarget, pin_hash: pinHash };
            setClaimTarget(null);
            setEditApp(claimed);
            fetchApps();
          }}
        />
      )}
      {celebrateApp && (
        <CelebrationModal
          app={celebrateApp}
          allApps={apps}
          onClose={() => setCelebrateApp(null)}
        />
      )}
    </div>
    </PullToRefresh>

    {/* Sticky floating CTA for new users — above bottom nav */}
    {!hasMyEntry && (
      <div className="sm:hidden fixed left-4 right-4 z-40" style={{ bottom: "calc(60px + env(safe-area-inset-bottom, 0px))" }}>
        <button
          onClick={() => setShowIntent(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500 text-white text-sm font-bold rounded-2xl shadow-[0_4px_20px_rgba(45,106,79,0.4)] active:scale-[0.97] transition-transform"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5V19M5 12H19"/></svg>
          Add Your Application
        </button>
      </div>
    )}
    </>
  );
}

// ============================================
// Edit modal
// ============================================
// Inline claim — shown inside the detail modal for unclaimed entries
function InlineClaim({ appId, appInitials, onClaimed, onCancel }: {
  appId: string; appInitials: string;
  onClaimed: (hash: string) => void; onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  const handleClaim = async () => {
    setClaiming(true);
    setError("");
    const { generatePin, hashPin, savePinForApp } = await import("@/lib/pin");
    // Retry up to 5 times if PIN already taken
    for (let attempt = 0; attempt < 5; attempt++) {
      const newPin = generatePin();
      const hash = await hashPin(newPin);
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appId, claim_pin_hash: hash }),
      });
      if (res.ok) {
        savePinForApp(appId, hash);
        setPin(newPin);
        setClaiming(false);
        return;
      }
      const data = await res.json();
      if (!data.pin_exists) {
        setError(data.error || "Failed to claim");
        setClaiming(false);
        return;
      }
    }
    setError("Could not generate a unique PIN. Please try again.");
    setClaiming(false);
  };

  if (pin) {
    return (
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-3 text-center">
        <p className="text-xs text-sand-600 mb-2">Your PIN for <strong>{appInitials}</strong>:</p>
        <div className="flex justify-center gap-2 mb-2">
          {pin.split("").map((d, i) => (
            <div key={i} className="w-10 h-10 rounded-lg bg-white border-2 border-brand-300 flex items-center justify-center text-lg font-bold text-brand-700">{d}</div>
          ))}
        </div>
        <p className="text-[9px] text-error mb-2">Save this PIN — it won&apos;t be shown again.</p>
        <button onClick={() => onClaimed(pin)} className="px-4 py-2 bg-brand-500 text-white text-xs font-semibold rounded-lg">I&apos;ve saved it</button>
      </div>
    );
  }

  return (
    <div className="bg-warn-light/50 border border-warn/30 rounded-xl p-3 mb-3">
      <p className="text-xs text-sand-700 mb-2"><strong>{appInitials}</strong> has no PIN. Claim it to edit and track.</p>
      {error && <p className="text-[10px] text-error mb-2">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleClaim} disabled={claiming} className="px-4 py-1.5 bg-brand-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50">
          {claiming ? "..." : "Claim & Get PIN"}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-sand-500">Cancel</button>
      </div>
    </div>
  );
}

function EditModal({ app, allApps, onClose, onMarkStep, onDelete, isOwner, onRefresh }: {
  app: Application; allApps: Application[]; onClose: () => void;
  onMarkStep: (appId: string, stepId: StepId, date: string) => void;
  onDelete: (appId: string) => void;
  isOwner: boolean;
  onRefresh: () => void;
}) {
  const stepsMap = buildStepsMap(app.step_events || []);
  const [stepDate, setStepDate] = useState("");
  const [activeStep, setActiveStep] = useState<StepId | null>(null);
  const [meiType, setMeiType] = useState(app.mei_type || "");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [editForm, setEditForm] = useState({
    initials: app.initials,
    country_origin: app.country_origin,
    stream: app.stream as string,
    sponsor_status: app.sponsor_status as string,
    province: app.province || "Outside Quebec",
    visa_country: app.visa_country || "",
    notes: app.notes || "",
    submitted_date: stepsMap.submitted || "",
  });
  const nextStep = getNextStep(app.current_step, app.stream);
  const visibleSteps = getVisibleSteps(app.stream);
  const [gckeyDone, setGckeyDone] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`gckey-done-${app.id}`);
    if (saved === "true") setGckeyDone(true);
  }, [app.id]);

  const toggleGckey = () => {
    const next = !gckeyDone;
    setGckeyDone(next);
    localStorage.setItem(`gckey-done-${app.id}`, String(next));
  };

  const eu = (f: string, v: string) => setEditForm(p => ({ ...p, [f]: v }));

  const handleMeiChange = async (val: string) => {
    setMeiType(val);
    const pinHash = getSavedPinHash(app.id);
    await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: app.id, pin_hash: pinHash || "", mei_type: val || null }),
    });
  };

  const handleStepSave = (stepId: StepId, date: string) => {
    if (navigator.vibrate) navigator.vibrate(12);
    playMilestoneSound();
    onMarkStep(app.id, stepId, date);
    setShowConfetti(true);
  };

  const handleEditSave = async () => {
    setSaving(true);
    const pinHash = getSavedPinHash(app.id);
    await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: app.id, pin_hash: pinHash || "",
        initials: editForm.initials.trim(),
        country_origin: editForm.country_origin,
        stream: editForm.stream,
        sponsor_status: editForm.sponsor_status,
        province: editForm.province,
        visa_country: editForm.visa_country || null,
        notes: editForm.notes || null,
        submitted_date: editForm.submitted_date !== stepsMap.submitted ? editForm.submitted_date : undefined,
      }),
    });
    setSaving(false);
    setShowEdit(false);
    onClose();
  };

  const handleUndoStep = async (stepId: StepId) => {
    if (!confirm("Remove this step? This will revert your progress.")) return;
    setUndoing(true);
    const pinHash = getSavedPinHash(app.id);
    await fetch(`/api/steps?application_id=${app.id}&step_id=${stepId}&pin_hash=${pinHash || ""}`, { method: "DELETE" });
    setUndoing(false);
    onClose();
  };

  // Find the latest completed step index for showing undo button
  const completedStepIds = visibleSteps.filter(s => stepsMap[s.id]).map(s => s.id);
  const latestCompletedId = completedStepIds.length > 0 ? completedStepIds[completedStepIds.length - 1] : null;
  const [claimMode, setClaimMode] = useState(false);

  // Check if user already has their own entry (has any saved PIN)
  const userHasEntry = (() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("sponsortrack-pins");
      if (!raw) return false;
      const store = JSON.parse(raw);
      return Object.keys(store).length > 0;
    } catch { return false; }
  })();

  return (
    <Modal open={true} onClose={onClose} title={`${app._real_initials || app.initials} · ${app.country_origin}`}>
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Non-owner banner */}
      {!isOwner && !claimMode && (
        <div className="bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
          <span className="text-[10px] text-sand-500">Viewing {app.initials}&apos;s timeline</span>
          {!app.pin_hash && !userHasEntry && (
            <button onClick={() => setClaimMode(true)}
              className="text-[10px] text-brand-500 font-semibold hover:underline">
              Claim this entry
            </button>
          )}
        </div>
      )}

      {/* Inline claim */}
      {claimMode && <InlineClaim appId={app.id} appInitials={app.initials} onClaimed={(hash) => { setClaimMode(false); onRefresh(); }} onCancel={() => setClaimMode(false)} />}

      <div className="flex flex-wrap gap-2 text-xs text-sand-500 mb-3">
        <span>{app.sponsor_status}</span><span>·</span><span>{app.stream}</span>
        <span>·</span><span>{app.province === "Quebec" ? "Inside Quebec" : "Outside Quebec"}</span>
        {app.visa_country && <><span>·</span><span>{app.visa_country}</span></>}
        {app.subcategory && <><span>·</span><span>{app.subcategory}</span></>}
        {app.notes && <><span>·</span><span className="italic">{app.notes}</span></>}
        {isOwner && (
          <button onClick={() => setShowEdit(!showEdit)} className="ml-auto text-brand-500 font-medium hover:text-brand-600 transition-colors flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
        )}
      </div>

      {/* Edit Details */}
      {showEdit && (
        <div className="bg-sand-50 rounded-xl p-3 mb-3 space-y-2.5 animate-in">
          <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Edit Details</div>
          <Input label="Name" value={editForm.initials} onChange={(e: React.ChangeEvent<HTMLInputElement>) => eu("initials", e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select label="Sponsor Status" value={editForm.sponsor_status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => eu("sponsor_status", e.target.value)} options={SPONSOR_STATUSES.map(s => ({ value: s, label: s }))} />
            <Select label="Stream" value={editForm.stream} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => eu("stream", e.target.value)} options={STREAMS.map(s => ({ value: s, label: s }))} />
          </div>
          <SearchableSelect label="PA Country" value={editForm.country_origin} onChange={(v: string) => eu("country_origin", v)} options={COMMON_COUNTRIES.map(c => ({ value: c, label: c }))} />
          <Select label="Quebec *" value={editForm.province} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => eu("province", e.target.value)} options={[{ value: "Outside Quebec", label: "Outside Quebec" }, { value: "Quebec", label: "Inside Quebec" }]} />
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">Submission Date</label>
            <input type="date" className="px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
              value={editForm.submitted_date} onChange={(e) => eu("submitted_date", e.target.value)} max={localToday()} />
          </div>
          <Input label="Notes" value={editForm.notes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => eu("notes", e.target.value)} />
          <div className="flex gap-2 pt-1">
            <Button onClick={handleEditSave} disabled={saving || !editForm.initials.trim() || !editForm.country_origin} className="flex-1">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <button onClick={() => setShowEdit(false)} className="text-xs text-sand-400 px-3 hover:text-sand-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* MEI / Medical Exam — owner only */}
      {isOwner && (
      <div className="bg-sand-50 rounded-lg px-3 py-2.5 mb-3">
        <div className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider mb-1.5">Medical Exam (MEI)</div>
        <div className="flex gap-2">
          {["Upfront", "Request", ""].map((opt) => (
            <button
              key={opt || "none"}
              onClick={() => handleMeiChange(opt)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                meiType === opt
                  ? opt === "Upfront" ? "bg-brand-500 text-white" : opt === "Request" ? "bg-warn text-white" : "bg-sand-300 text-sand-700"
                  : "bg-white border border-sand-200 text-sand-500 hover:bg-sand-100"
              }`}
            >
              {opt || "Not set"}
            </button>
          ))}
        </div>
      </div>
      )}

      <div className="space-y-1">
        {visibleSteps.map((step, i) => {
          const date = stepsMap[step.id];
          const aorDate = stepsMap.aor;
          const aorIdx = STEPS.findIndex(s => s.id === "aor");
          const stepGlobalIdx = STEPS.findIndex(s => s.id === step.id);
          const isPostAor = aorDate && stepGlobalIdx > aorIdx && step.id !== "submitted" && step.id !== "aor";
          let days: number | null = null;
          let daysLabel = "";
          if (date && step.id === "aor" && stepsMap.submitted) {
            days = daysBetween(stepsMap.submitted, date);
          } else if (date && step.id === "biometrics_given" && stepsMap.bil) {
            days = daysBetween(stepsMap.bil, date);
            daysLabel = " from BIL";
          } else if (date && step.id === "biometrics_done" && stepsMap.biometrics_given) {
            days = daysBetween(stepsMap.biometrics_given, date);
            daysLabel = " from Bio Given";
          } else if (date && step.id === "medicals_attended" && stepsMap.medical) {
            days = daysBetween(stepsMap.medical, date);
            daysLabel = " from Med Req";
          } else if (date && step.id === "medical_passed" && stepsMap.medicals_attended) {
            days = daysBetween(stepsMap.medicals_attended, date);
            daysLabel = " from Med Attended";
          } else if (date && isPostAor) {
            days = daysBetween(aorDate!, date);
            daysLabel = " from AOR";
          }
          const isDone = !!date;
          const isIncomplete = !date && step.id !== "submitted";

          return (
            <React.Fragment key={step.id}>
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isDone ? "bg-brand-50/50" : isIncomplete ? "bg-white" : "opacity-40"}`}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isDone ? "bg-brand-500" : isIncomplete ? "bg-sand-200 border border-sand-400" : "bg-sand-200"}`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-sand-900">{step.label}</div>
                {isDone && (
                  <div className="text-xs text-sand-500">
                    {formatDate(date)}{days != null && i > 0 && <span className="text-brand-500 font-semibold ml-1">({days}d{daysLabel})</span>}
                  </div>
                )}
                {isIncomplete && <div className="text-[9px] text-sand-400">{step.hint}</div>}
              </div>
              {isIncomplete && isOwner && (
                <div className="flex items-center gap-2">
                  {activeStep === step.id ? (
                    <input type="date" autoFocus className="text-xs px-2 py-1 border border-sand-200 rounded-md bg-white step-input-enter"
                      max={localToday()} value={stepDate}
                      onChange={(e) => setStepDate(e.target.value)}
                      onBlur={() => { if (!stepDate) setActiveStep(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && stepDate) { handleStepSave(step.id, stepDate); setStepDate(""); setActiveStep(null); }}} />
                  ) : null}
                  {activeStep === step.id && stepDate ? (
                    <button className="text-xs bg-brand-500 text-white px-3 py-1 rounded-md font-medium hover:bg-brand-600 step-input-enter active:scale-95"
                      onClick={() => { handleStepSave(step.id, stepDate); setStepDate(""); setActiveStep(null); }}>Save</button>
                  ) : activeStep !== step.id ? (
                    <button className="text-[10px] bg-sand-200 text-sand-700 px-2.5 py-1 rounded-md font-medium hover:bg-sand-300"
                      onClick={() => setActiveStep(step.id)}>Update</button>
                  ) : null}
                </div>
              )}
              {isDone && (
                <div className="flex items-center gap-1">
                  <Reactions applicationId={app.id} stepId={step.id} compact />
                  {isOwner && step.id !== "submitted" ? (
                    <button onClick={() => handleUndoStep(step.id)} disabled={undoing}
                      className="text-[10px] px-2 py-1 rounded-md bg-error-light text-error font-medium hover:bg-error/10 transition-colors disabled:opacity-50 min-h-[28px]">
                      {undoing ? "..." : "Undo"}
                    </button>
                  ) : (
                    <span className="text-brand-500 text-xs">✓</span>
                  )}
                </div>
              )}
            </div>
            {isDone && (
              <div className="pl-9 -mt-1 mb-1">
                <Reactions applicationId={app.id} stepId={step.id} />
              </div>
            )}
            {/* GCKey guide — after AOR */}
            {step.id === "aor" && !!stepsMap.aor && (
              gckeyDone ? (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg mx-1 mt-1 mb-1 bg-brand-50/50">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-brand-500"><path d="M20 6L9 17L4 12" /></svg>
                  <span className="text-xs text-brand-600 flex-1">GCKey & IRCC Tracker set up</span>
                  {isOwner && <button onClick={toggleGckey} className="text-[9px] text-sand-400">Undo</button>}
                </div>
              ) : (
                <GCKeyGuideInline appId={app.id} isOwner={isOwner} onDone={toggleGckey} />
              )
            )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Reconnect / Forgot PIN / Claim entry */}
      <div className="mt-4 pt-3 border-t border-sand-100">
        {!isOwner && app.pin_hash && (
          <ReconnectOrReset app={app} onReconnected={onRefresh} />
        )}
        {!isOwner && !app.pin_hash && !claimMode && (
          <button onClick={() => setClaimMode(true)}
            className="flex items-center gap-2 text-xs text-brand-500 font-medium hover:underline">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
            </svg>
            Claim this entry
          </button>
        )}
      </div>

      {/* Comments / Questions */}
      <CommentsSection
        applicationId={app.id}
        comments={app.comments || []}
        onRefresh={onRefresh}
      />

      {isOwner && (
        <button onClick={() => onDelete(app.id)} className="mt-3 text-xs text-error hover:text-error-dark transition-colors">
          Delete this entry
        </button>
      )}
    </Modal>
  );
}

// ============================================
// GCKey & IRCC Tracker setup guide (inline)
// ============================================
function GCKeyGuideInline({ appId, isOwner, onDone }: { appId: string; isOwner: boolean; onDone: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const GCKEY_STEPS = [
    { text: "Go to IRCC account page → \"Sign in with GCKey\"", link: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/account.html" },
    { text: "Create an account with PA's or representative's email" },
    { text: "Complete all security questions" },
    { text: "Click \"Link Application\" in the table" },
    { text: "Select \"Application number and family name\"" },
    { text: "Enter PA's family name with a space in front", highlight: true },
    { text: "Enter application number and other details" },
    { text: "Enter 2 for \"number of people under the application\"" },
    { text: "Submit → should show \"account found\" → Link" },
  ];

  const TRACKER_STEPS = [
    { text: "Go to IRCC Tracker registration", link: "https://ircc-tracker-suivi.apps.cic.gc.ca/en/register" },
    { text: "Enter PA's UCI (from your GCKey account)" },
    { text: "Enter Application Number" },
    { text: "Enter PA's names and Date of Birth exactly as in application" },
    { text: "Submit → application linked to tracker" },
  ];

  return (
    <div className="mx-1 mt-1 mb-1 rounded-lg border border-brand-200 bg-brand-50/50 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16V12M12 8H12.01"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-brand-700">Set up GCKey & IRCC Tracker</div>
          <div className="text-[9px] text-brand-500">Tap to see setup steps</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A8880" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "transform 0.3s ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>
      <div style={{
        maxHeight: expanded ? "600px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="px-3 pb-3" style={{ opacity: expanded ? 1 : 0, transition: "opacity 0.2s ease", transitionDelay: expanded ? "0.1s" : "0s" }}>
          <div className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-1.5">1. GCKey Setup</div>
          <div className="space-y-1 mb-3">
            {GCKEY_STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[9px] text-brand-400 mt-0.5 flex-shrink-0">{i + 1}.</span>
                <div className="text-[10px] text-sand-800 leading-relaxed">
                  {s.link ? <a href={s.link} target="_blank" rel="noopener noreferrer" className="underline">{s.text}</a> : s.text}
                  {s.highlight && <span className="text-[8px] bg-warn-light text-warn-dark px-1 rounded ml-1">Important</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-1.5">2. IRCC Tracker</div>
          <div className="space-y-1 mb-3">
            {TRACKER_STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[9px] text-brand-400 mt-0.5 flex-shrink-0">{i + 1}.</span>
                <div className="text-[10px] text-sand-800 leading-relaxed">
                  {s.link ? <a href={s.link} target="_blank" rel="noopener noreferrer" className="underline">{s.text}</a> : s.text}
                </div>
              </div>
            ))}
          </div>
          {isOwner && (
            <button onClick={onDone}
              className="w-full text-center text-xs font-semibold text-white bg-brand-500 rounded-lg py-2 hover:bg-brand-600 transition-colors active:scale-[0.98]">
              Mark as Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Forgot PIN — verify by personal details to reset
// ============================================
// ============================================
// Reconnect with PIN or Reset — for non-owners viewing PIN-protected entries
// ============================================
function ReconnectOrReset({ app, onReconnected }: { app: Application; onReconnected: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  const handleReconnect = async () => {
    if (pin.length !== 4) return;
    const hash = await hashPin(pin);
    if (hash === app.pin_hash) {
      savePinForApp(app.id, hash);
      onReconnected();
    } else {
      setError("Wrong PIN");
    }
  };

  if (showForgot) {
    return <ForgotPinFlow app={app} onReset={onReconnected} />;
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Your entry? Reconnect with PIN</div>
      <div className="flex gap-2">
        <input
          type="tel" inputMode="numeric" maxLength={4} value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
          placeholder="4-digit PIN"
          className="flex-1 px-3 py-2.5 rounded-lg border border-sand-200 text-sm bg-white text-center tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <button onClick={handleReconnect} disabled={pin.length !== 4}
          className="px-4 py-2.5 bg-brand-500 text-white text-xs font-semibold rounded-lg disabled:opacity-40 active:scale-[0.98]">
          Reconnect
        </button>
      </div>
      {error && <p className="text-[10px] text-error">{error}</p>}
      <button onClick={() => setShowForgot(true)}
        className="flex items-center gap-1.5 text-[10px] text-sand-400 hover:text-sand-600 transition-colors">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 16V12M12 8H12.01"/>
        </svg>
        Forgot PIN? Reset it here
      </button>
    </div>
  );
}

function ForgotPinFlow({ app, onReset }: { app: Application; onReset: (pinHash: string) => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"verify" | "newpin">("verify");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [subDate, setSubDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newPin, setNewPin] = useState("");

  const handleVerify = async () => {
    if (!name.trim() || !country.trim() || !subDate) return;
    setLoading(true);
    setError("");

    const { generatePin, hashPin, savePinForApp } = await import("@/lib/pin");

    // Retry up to 5 times if PIN already taken
    for (let attempt = 0; attempt < 5; attempt++) {
      const pin = generatePin();
      const hash = await hashPin(pin);

      const res = await fetch("/api/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: app.id,
          initials: name.trim(),
          country_origin: country.trim(),
          submitted_date: subDate,
          new_pin_hash: hash,
        }),
      });

      if (res.ok) {
        savePinForApp(app.id, hash);
        setNewPin(pin);
        setStep("newpin");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!data.pin_exists) {
        setError(data.error || "Verification failed");
        setLoading(false);
        return;
      }
    }
    setError("Could not generate a unique PIN. Please try again.");
    setLoading(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-sand-500 font-medium hover:text-brand-500 transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 16V12M12 8H12.01"/>
        </svg>
        Forgot PIN? Reset it here
      </button>
    );
  }

  if (step === "newpin") {
    return (
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center">
        <div className="text-xs text-sand-600 mb-2">Your new PIN for <strong>{app.initials}</strong>:</div>
        <div className="flex justify-center gap-2 mb-2">
          {newPin.split("").map((d, i) => (
            <div key={i} className="w-10 h-10 rounded-lg bg-white border-2 border-brand-300 flex items-center justify-center text-lg font-bold text-brand-700">{d}</div>
          ))}
        </div>
        <p className="text-[9px] text-error mb-3">Save this PIN — it won&apos;t be shown again.</p>
        <button onClick={() => { setOpen(false); setStep("verify"); setNewPin(""); onReset(newPin); }}
          className="px-4 py-2 bg-brand-500 text-white text-xs font-semibold rounded-lg active:scale-[0.98]">
          I&apos;ve saved it
        </button>
      </div>
    );
  }

  return (
    <div className="bg-sand-50 border border-sand-200 rounded-xl p-4">
      <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Reset PIN</div>
      <p className="text-[11px] text-sand-500 mb-3">Verify your identity by entering the details you used when adding this entry.</p>
      <div className="space-y-2.5">
        <div>
          <label className="text-[10px] text-sand-500 font-medium mb-1 block">Name (exactly as entered)</label>
          <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
            className="w-full px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="Your name" />
        </div>
        <div>
          <label className="text-[10px] text-sand-500 font-medium mb-1 block">Country (exactly as entered)</label>
          <input value={country} onChange={(e) => { setCountry(e.target.value); setError(""); }}
            className="w-full px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="Your country" />
        </div>
        <div>
          <label className="text-[10px] text-sand-500 font-medium mb-1 block">Exact submission date</label>
          <input type="date" value={subDate} onChange={(e) => { setSubDate(e.target.value); setError(""); }}
            className="w-full px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </div>
        {error && <p className="text-[10px] text-error">{error}</p>}
        <div className="flex gap-2">
          <button onClick={handleVerify} disabled={loading || !name.trim() || !country.trim() || !subDate}
            className="flex-1 py-2.5 bg-brand-500 text-white text-xs font-semibold rounded-lg disabled:opacity-40 active:scale-[0.98]">
            {loading ? "Verifying..." : "Verify & Reset PIN"}
          </button>
          <button onClick={() => { setOpen(false); setError(""); }}
            className="px-4 py-2.5 text-xs text-sand-500 rounded-lg border border-sand-200 hover:bg-sand-50">
            Cancel
          </button>
        </div>
      </div>
      <p className="text-[8px] text-sand-400 mt-2">Limited to 3 attempts per hour per entry.</p>
    </div>
  );
}

// ============================================
// Intent modal — New or Returning?
// ============================================
function IntentModal({ open, onClose, onNewUser, apps, onReconnected }: {
  open: boolean; onClose: () => void;
  onNewUser: () => void;
  apps: Application[];
  onReconnected: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "pin">("choose");
  const [claimPin, setClaimPin] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) { setMode("choose"); setClaimPin(""); setClaimError(""); }
  }, [open]);

  const handleClaim = async () => {
    if (claimPin.length !== 4) return;
    setClaiming(true);
    setClaimError("");
    const pinHash = await hashPin(claimPin);
    const matched = apps.filter(a => a.pin_hash === pinHash);
    if (matched.length === 0) {
      setClaimError("No entries found with this PIN");
      setClaiming(false);
      return;
    }
    matched.forEach(a => savePinForApp(a.id, pinHash));
    setClaiming(false);
    onReconnected();
  };

  return (
    <Modal open={open} onClose={onClose} title="Get Started">
      {mode === "choose" ? (
        <div className="space-y-3">
          <p className="text-sm text-sand-500 mb-4">Are you new here, or reconnecting a previous entry?</p>

          <button
            onClick={onNewUser}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-sand-200 bg-white hover:bg-brand-50 hover:border-brand-300 transition-all active:scale-[0.98] text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 5V19M5 12H19"/></svg>
            </div>
            <div>
              <div className="text-sm font-bold text-sand-900">I&apos;m new</div>
              <div className="text-[11px] text-sand-500">Add my application for the first time</div>
            </div>
          </button>

          <button
            onClick={() => setMode("pin")}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-sand-200 bg-white hover:bg-brand-50 hover:border-brand-300 transition-all active:scale-[0.98] text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-sand-200 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#65635D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-sand-900">I have a PIN</div>
              <div className="text-[11px] text-sand-500">Reconnect my existing entry on this device</div>
            </div>
          </button>
        </div>
      ) : (
        <div>
          <button onClick={() => setMode("choose")} className="flex items-center gap-1 text-xs text-sand-500 hover:text-sand-800 mb-4 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19L5 12L12 5"/></svg>
            Back
          </button>
          <p className="text-sm text-sand-500 mb-4">Enter your 4-digit PIN to reconnect your entry on this device.</p>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            placeholder="Enter 4-digit PIN"
            value={claimPin}
            autoFocus
            onChange={(e) => { setClaimPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setClaimError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && claimPin.length === 4) handleClaim(); }}
            className="w-full px-4 py-4 text-xl text-center rounded-xl border border-sand-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 tracking-[0.5em] font-mono mb-3"
          />
          <button
            onClick={handleClaim}
            disabled={claimPin.length !== 4 || claiming}
            className="w-full py-3 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-all active:scale-[0.98] disabled:opacity-40 mb-2"
          >
            {claiming ? "Reconnecting..." : claimPin.length === 4 ? "Reconnect My Entry" : `Enter ${4 - claimPin.length} more digit${4 - claimPin.length === 1 ? "" : "s"}`}
          </button>
          {claimError && <p className="text-xs text-error text-center mb-2">{claimError}</p>}
          <p className="text-[10px] text-sand-400 text-center">This is the 4-digit PIN you set when you first added your application.</p>
        </div>
      )}
    </Modal>
  );
}

// ============================================
// Add modal (with PIN)
// ============================================
function AddModal({ open, onClose, onSubmit, loading, existingApps }: {
  open: boolean; onClose: () => void;
  onSubmit: (f: ApplicationFormData & { pin: string }) => void; loading: boolean;
  existingApps: Application[];
}) {
  const empty = {
    initials: "", sponsor_status: "PR" as const, stream: "Outland" as const,
    country_origin: "", subcategory: "", visa_country: "", mei_type: "",
    province: "Outside Quebec", submitted_date: "", notes: "", pin: "",
  };
  const [form, setForm] = useState(empty);
  useEffect(() => { if (open) setForm(empty); }, [open]);

  const u = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  // Duplicate detection
  const duplicate = useMemo(() => {
    if (!form.initials.trim() || !form.country_origin) return null;
    const initials = form.initials.trim().toLowerCase();
    return existingApps.find(a => {
      const match = a.initials.toLowerCase() === initials && a.country_origin === form.country_origin;
      if (!match) return false;
      if (form.submitted_date) {
        const s = buildStepsMap(a.step_events || []);
        if (s.submitted === form.submitted_date) return true;
        if (s.submitted) {
          const diff = Math.abs(new Date(s.submitted + "T00:00:00").getTime() - new Date(form.submitted_date + "T00:00:00").getTime());
          if (diff <= 3 * 24 * 60 * 60 * 1000) return true;
        }
      }
      return true;
    }) || null;
  }, [form.initials, form.country_origin, form.submitted_date, existingApps]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // belt-and-suspenders: block submit if already in progress
    if (!form.initials || !form.submitted_date || !form.country_origin) return;
    if (!isValidPin(form.pin)) return;
    onSubmit(form);
  };

  return (
    <Modal open={open} onClose={loading ? () => {} : onClose} title="Add Entry">
      <form onSubmit={submit} className={`flex flex-col gap-3 transition-opacity ${loading ? "pointer-events-none opacity-60" : ""}`}>
        <Input label="Name *" maxLength={20} value={form.initials} onChange={(e) => u("initials", e.target.value)} required disabled={loading} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Sponsor Status" value={form.sponsor_status} onChange={(e) => u("sponsor_status", e.target.value)} options={SPONSOR_STATUSES.map((s) => ({ value: s, label: s }))} disabled={loading} />
          <Select label="Stream" value={form.stream} onChange={(e) => u("stream", e.target.value)} options={STREAMS.map((s) => ({ value: s, label: s }))} disabled={loading} />
        </div>
        <SearchableSelect label="PA Country *" value={form.country_origin} onChange={(v) => u("country_origin", v)} options={COMMON_COUNTRIES.map((c) => ({ value: c, label: c }))} />
        <Select label="Application Type" value={form.subcategory} onChange={(e) => u("subcategory", e.target.value)} options={[{ value: "", label: "Select type..." }, ...APPLICATION_SUBCATEGORIES.map((c) => ({ value: c, label: c }))]} disabled={loading} />
        <Select label="Quebec *" value={form.province} onChange={(e) => u("province", e.target.value)} options={[{ value: "Outside Quebec", label: "Outside Quebec" }, { value: "Quebec", label: "Inside Quebec" }]} disabled={loading} />
        <Select label="MEI Type" value={form.mei_type} onChange={(e) => u("mei_type", e.target.value)} options={MEI_TYPES.map((m) => ({ value: m, label: m || "Select..." }))} disabled={loading} />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">Submission Date *</label>
          <input type="date" className="px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 disabled:opacity-60"
            value={form.submitted_date} onChange={(e) => u("submitted_date", e.target.value)} max={localToday()} required disabled={loading} />
        </div>
        <PinInput value={form.pin} onChange={(v) => u("pin", v)} />
        <Input label="Notes" value={form.notes} onChange={(e) => u("notes", e.target.value)} disabled={loading} />
        {duplicate && !loading && (
          <div className="bg-warn-light border border-warn/30 rounded-lg px-3 py-2.5">
            <div className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B7420" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <div className="text-xs font-semibold text-warn-dark">Possible duplicate</div>
                <div className="text-[11px] text-warn-dark/70 mt-0.5">
                  &quot;{duplicate.initials}&quot; from {duplicate.country_origin} ({duplicate.stream}) already exists. If this is you, claim it from the tracker instead.
                </div>
              </div>
            </div>
          </div>
        )}
        <Button type="submit" disabled={loading || !isValidPin(form.pin)} className="w-full mt-1">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Adding your entry...
            </span>
          ) : "Add"}
        </Button>
        {loading && (
          <p className="text-[10px] text-sand-400 text-center -mt-1">
            Please wait — don&apos;t close or refresh this page
          </p>
        )}
      </form>
    </Modal>
  );
}

// ============================================
// Post-add celebration modal
// ============================================
function CelebrationModal({ app, allApps, onClose }: {
  app: Application; allApps: Application[]; onClose: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(true);
  const stepsMap = buildStepsMap(app.step_events || []);
  const submittedDate = stepsMap.submitted;

  // Position
  const position = allApps.length;

  // AOR prediction
  const streamApps = allApps.filter(a => a.stream === app.stream);
  const aorDays: number[] = [];
  streamApps.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (s.submitted && s.aor) aorDays.push(daysBetween(s.submitted, s.aor));
  });
  const avgAor = aorDays.length ? Math.round(aorDays.reduce((a, b) => a + b, 0) / aorDays.length) : null;

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let aorPrediction = "";
  if (avgAor && submittedDate) {
    const d = new Date(submittedDate + "T00:00:00");
    d.setDate(d.getDate() + avgAor);
    aorPrediction = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  // Same week cohort
  const sameWeek = allApps.filter(a => {
    if (a.id === app.id) return false;
    const s = buildStepsMap(a.step_events || []);
    if (!s.submitted || !submittedDate) return false;
    const diff = Math.abs(new Date(s.submitted + "T00:00:00").getTime() - new Date(submittedDate + "T00:00:00").getTime());
    return diff < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <Modal open={true} onClose={onClose} title="">
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
      <div className="text-center py-2">
        <h2 className="text-xl font-bold text-sand-900 mb-1">You&apos;re in! 🎉</h2>
        <p className="text-sm text-sand-500 mb-5">
          Application #{position} in the community
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {avgAor && aorPrediction && (
            <div className="bg-brand-50 rounded-xl p-3 text-center col-span-2">
              <div className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider">Predicted AOR</div>
              <div className="text-lg font-bold text-brand-600">~{aorPrediction}</div>
              <div className="text-[10px] text-brand-500">Based on {app.stream} avg of {avgAor} days</div>
            </div>
          )}
          <div className="bg-sand-50 rounded-xl p-3 text-center">
            <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Queue Position</div>
            <div className="text-lg font-bold text-sand-900">#{streamApps.filter(a => !a.step_events?.some(e => e.step_id === "aor")).length}</div>
            <div className="text-[10px] text-sand-400">waiting for AOR</div>
          </div>
          <div className="bg-sand-50 rounded-xl p-3 text-center">
            <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">Same Week</div>
            <div className="text-lg font-bold text-sand-900">{sameWeek.length}</div>
            <div className="text-[10px] text-sand-400">submitted same week</div>
          </div>
        </div>

        <div className="space-y-2">
          <a href="/me" className="block w-full px-4 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-all active:scale-[0.98]">
            View My Dashboard
          </a>
          <button onClick={onClose} className="w-full px-4 py-2.5 text-sand-500 text-sm font-medium hover:text-sand-700 transition-colors">
            Stay on Tracker
          </button>
        </div>
      </div>
    </Modal>
  );
}
