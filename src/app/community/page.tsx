"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Application, Comment } from "@/lib/types";
import { buildStepsMap } from "@/lib/utils";
import { PullToRefresh } from "@/components/PullToRefresh";
import { linkifyText } from "@/lib/linkify";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${MO[d.getMonth()]} ${d.getDate()}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MO[parseInt(m) - 1]} ${y}`;
}

/** "2024-05" → "may-2024" — used for the subreddit-style r/<slug> pills. */
function cohortSlug(key: string): string {
  const [y, m] = key.split("-");
  return `${MO[parseInt(m) - 1].toLowerCase()}-${y}`;
}

/** Derive YYYY-MM from a submitted-date string. */
function monthKeyFromDate(submitted: string): string {
  const d = new Date(submitted + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMyPinHash(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("sponsortrack-pins");
    if (!raw) return null;
    const store = JSON.parse(raw);
    const values = Object.values(store) as string[];
    return values[0] || null;
  } catch { return null; }
}

// Count all descendants recursively
function countReplies(commentId: string, allComments: Comment[]): number {
  const direct = allComments.filter(c => c.parent_id === commentId);
  return direct.reduce((sum, c) => sum + 1 + countReplies(c.id, allComments), 0);
}

interface ThreadData {
  root: Comment;
  allComments: Comment[]; // all comments in this thread (root + all descendants)
  label: string;
  cohortKey: string | null; // raw "YYYY-MM" — null if no cohort
  totalReplies: number;
}

export default function CommunityPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [cohortComments, setCohortComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQ, setNewQ] = useState(false);
  const [newQMonth, setNewQMonth] = useState("");
  const [newQText, setNewQText] = useState("");
  const [posting, setPosting] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  // Track last seen — read once on mount, update after 3s delay so user sees "NEW" badges
  const [lastSeen, setLastSeen] = useState<string>("2000-01-01T00:00:00Z");
  useEffect(() => {
    const stored = localStorage.getItem("community-last-seen") || "2000-01-01T00:00:00Z";
    setLastSeen(stored);
    // Mark as seen after 3 seconds
    const timer = setTimeout(() => {
      localStorage.setItem("community-last-seen", new Date().toISOString());
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const fetchData = useCallback(async () => {
    const [appsRes, commentsRes] = await Promise.all([
      // Community no longer reads entry-level comments, so the default
      // (comment-less) applications payload is plenty — only needed for
      // myCohortMonth derivation.
      fetch("/api/applications"),
      fetch("/api/comments"),
    ]);
    const appsData = await appsRes.json();
    const commentsData = await commentsRes.json();
    if (Array.isArray(appsData)) setApps(appsData);
    if (Array.isArray(commentsData)) setCohortComments(commentsData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const myPinHash = getMyPinHash();

  const months = useMemo(() => {
    const map: Record<string, number> = {};
    apps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      if (!s.submitted) return;
      const d = new Date(s.submitted + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [apps]);

  // Build threads — only cohort-level threads belong here. Entry-attached
  // comments stay on the entry (visible in the dashboard EditModal). Mixing
  // them was confusing — a private "PJ left this question on JK's entry"
  // shouldn't show up in the public Community feed.
  const threads: ThreadData[] = useMemo(() => {
    const result: ThreadData[] = [];

    const topCohort = cohortComments.filter(c => !c.parent_id);
    topCohort.forEach(root => {
      const allInThread = cohortComments.filter(c => c.id === root.id || isDescendant(c, root.id, cohortComments));
      result.push({
        root,
        allComments: allInThread,
        label: root.cohort_month ? monthLabel(root.cohort_month) : "General",
        cohortKey: root.cohort_month || null,
        totalReplies: allInThread.length - 1,
      });
    });

    result.sort((a, b) => b.root.created_at.localeCompare(a.root.created_at));
    return result;
  }, [cohortComments]);

  // Auto-derive the user's own cohort from their app's submitted step.
  // Used to skip the month picker when posting; null falls back to manual select.
  const myCohortMonth: string | null = useMemo(() => {
    if (!myPinHash) return null;
    const mine = apps.filter(a => a.pin_hash === myPinHash);
    if (mine.length === 0) return null;
    // Pick the most-recently-submitted app's month (most relevant cohort for them now).
    let best: string | null = null;
    mine.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      if (!s.submitted) return;
      if (!best || s.submitted > best) best = s.submitted;
    });
    return best ? monthKeyFromDate(best) : null;
  }, [apps, myPinHash]);

  // Cohort counts for the horizontal filter strip — derived from threads,
  // not raw apps, so empty cohorts don't appear.
  const cohortCounts: [string, number][] = useMemo(() => {
    const m: Record<string, number> = {};
    threads.forEach(t => {
      if (!t.cohortKey) return;
      m[t.cohortKey] = (m[t.cohortKey] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]));
  }, [threads]);

  // Filter strip state — "" means "All cohorts".
  const [selectedCohort, setSelectedCohort] = useState<string>("");
  // Single-open accordion — opening a new thread auto-closes any other.
  // null = nothing open.
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const visibleThreads = useMemo(
    () => (selectedCohort ? threads.filter(t => t.cohortKey === selectedCohort) : threads),
    [threads, selectedCohort]
  );

  const totalComments = threads.reduce((s, t) => s + t.allComments.length, 0);

  // Cohort the post will actually be filed under: explicit override wins,
  // else auto-derive from the poster's submitted date.
  const effectiveMonth = newQMonth || myCohortMonth || "";

  const handleNewQuestion = async () => {
    if (!newQText.trim() || !effectiveMonth || !myPinHash || posting) return;
    setPosting(true);
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohort_month: effectiveMonth, pin_hash: myPinHash, text: newQText.trim(), parent_id: null, anonymous }),
      });
      // Await the refetch so the spinner is visible until the new post
      // actually appears in the feed.
      await fetchData();
      setNewQText(""); setNewQMonth(""); setNewQ(false); setAnonymous(false);
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-enter">
        <div className="mb-6"><div className="animate-pulse bg-sand-200/60 rounded-lg h-6 w-40 mb-2" /><div className="animate-pulse bg-sand-200/60 rounded-lg h-3 w-56" /></div>
        {[1,2,3].map(i => (<div key={i} className="bg-white border border-sand-200 rounded-xl p-4 mb-3"><div className="animate-pulse bg-sand-200/60 rounded h-4 w-32 mb-2" /><div className="animate-pulse bg-sand-200/60 rounded h-3 w-full mb-1" /><div className="animate-pulse bg-sand-200/60 rounded h-3 w-2/3" /></div>))}
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => { await fetchData(); }}>
    <div className="page-enter">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-sand-900 tracking-tight">Community</h1>
        <p className="text-xs text-sand-500 mt-0.5">
          <span className="nums-tabular">{totalComments}</span> {totalComments === 1 ? "post" : "posts"} from applicants across every cohort.
        </p>
      </div>

      {/* New Question */}
      {myPinHash && !newQ && (
        <button onClick={() => setNewQ(true)} className="w-full mb-4 px-4 py-3 bg-white border border-sand-200 rounded-xl text-left flex items-center gap-3 hover:bg-sand-50 transition-colors active:scale-[0.99]">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-brand-600"><path d="M12 5V19M5 12H19"/></svg>
          </div>
          <span className="text-sm text-sand-400">Ask your cohort a question...</span>
        </button>
      )}

      {myPinHash && newQ && (
        <div className="bg-white border border-sand-200 rounded-xl p-4 mb-4">
          <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-[0.08em] mb-3">New question</div>
          <div className="space-y-2.5">
            {/* Cohort: auto-derived from submitted date. Falls back to manual picker
                when we can't derive (no submitted date) or user clicks "change". */}
            <PostToCohortChip
              cohortKey={effectiveMonth}
              autoderived={!!myCohortMonth && !newQMonth}
              months={months}
              overrideValue={newQMonth}
              onOverride={setNewQMonth}
            />
            <div>
              <textarea
                value={newQText}
                onChange={(e) => setNewQText(e.target.value.slice(0, 500))}
                placeholder={effectiveMonth
                  ? `What would you like to ask r/${cohortSlug(effectiveMonth)}?`
                  : "What would you like to ask the community?"}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 resize-none"
              />
              <div className="text-[9px] text-sand-300 text-right nums-tabular">{newQText.length}/500</div>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer w-fit">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="w-3.5 h-3.5 rounded border-sand-300 text-brand-500 focus:ring-brand-500/20" />
              <span className="text-[10px] text-sand-500">Post anonymously</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleNewQuestion}
                disabled={!newQText.trim() || !effectiveMonth || posting}
                className="flex-1 py-2 bg-brand-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 active:scale-[0.98] hover:bg-brand-600 inline-flex items-center justify-center gap-2"
              >
                {posting && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                {posting ? "Posting" : "Post question"}
              </button>
              <button
                onClick={() => { setNewQ(false); setNewQText(""); setNewQMonth(""); setAnonymous(false); }}
                className="px-4 py-2 text-sm text-sand-500 rounded-lg border border-sand-200 hover:bg-sand-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* xl+ — 2-column with sticky filter rail. Mobile/lg-and-below stay
          single-column with the original horizontal cohort strip. */}
      <div className="xl:grid xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-6 xl:items-start">
        {/* Cohort filter — horizontal strip on mobile, vertical sticky rail on xl+ */}
        {cohortCounts.length > 0 && (
          <>
            {/* Mobile/lg-and-below: horizontal strip */}
            <div className="xl:hidden">
              <CohortFilterStrip
                cohorts={cohortCounts}
                selected={selectedCohort}
                onSelect={setSelectedCohort}
                orientation="horizontal"
              />
            </div>
            {/* xl+: vertical sticky sidebar */}
            <div className="hidden xl:block xl:sticky xl:top-20">
              <CohortFilterStrip
                cohorts={cohortCounts}
                selected={selectedCohort}
                onSelect={setSelectedCohort}
                orientation="vertical"
              />
            </div>
          </>
        )}

        {/* Feed */}
        <div className="min-w-0">
          {threads.length === 0 ? (
            <div className="bg-white border border-sand-200 rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sand-400"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <div className="text-sm font-semibold text-sand-700 mb-1">No posts yet</div>
              <p className="text-xs text-sand-400">Be the first to ask your cohort a question.</p>
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="bg-white border border-sand-200 rounded-xl p-6 text-center">
              <p className="text-[13px] text-sand-500 mb-2">
                No posts in <span className="font-bold text-sand-700">r/{selectedCohort ? cohortSlug(selectedCohort) : ""}</span> yet.
              </p>
              <button
                onClick={() => setSelectedCohort("")}
                className="text-[12px] text-brand-600 font-semibold hover:text-brand-700"
              >
                Show all cohorts <span aria-hidden>→</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleThreads.map(t => (
                <ThreadCard
                  key={t.root.id}
                  thread={t}
                  myPinHash={myPinHash}
                  onRefresh={fetchData}
                  lastSeen={lastSeen}
                  onCohortClick={setSelectedCohort}
                  isOpen={openThreadId === t.root.id}
                  onToggle={() => setOpenThreadId(prev => prev === t.root.id ? null : t.root.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {!myPinHash && threads.length > 0 && (
        <p className="text-[10px] text-sand-400 italic text-center mt-4">Add your application to join the conversation.</p>
      )}
    </div>
    </PullToRefresh>
  );
}

// Check if a comment is a descendant of rootId
function isDescendant(comment: Comment, rootId: string, allComments: Comment[]): boolean {
  let current = comment;
  const visited = new Set<string>();
  while (current.parent_id) {
    if (current.parent_id === rootId) return true;
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    const parent = allComments.find(c => c.id === current.parent_id);
    if (!parent) return false;
    current = parent;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
// Reddit-style helpers
// ─────────────────────────────────────────────────────────────

function initialsOf(name: string): string {
  if (!name) return "?";
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable 0–360 hue from a string — keeps avatars consistent per author. */
function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h) % 360;
}

function Avatar({ name, size = 28, you = false, op = false }: { name: string; size?: number; you?: boolean; op?: boolean }) {
  // "you" → brand fill (always green). "OP" → warm gold. Otherwise hashed-hue
  // class whose lightness flips for dark mode (see globals.css .avatar-hashed).
  const base = "inline-flex items-center justify-center rounded-full flex-shrink-0 font-bold";
  const dims = { width: size, height: size, fontSize: Math.round(size * 0.42) };

  if (you) {
    return (
      <span aria-hidden="true" className={`${base} ring-2 ring-brand-200 bg-brand-500 text-white`} style={dims}>
        {initialsOf(name)}
      </span>
    );
  }
  if (op) {
    return (
      <span aria-hidden="true" className={`${base} text-white`} style={{ ...dims, background: "var(--warn)" }}>
        {initialsOf(name)}
      </span>
    );
  }
  const hue = hashHue(name);
  return (
    <span
      aria-hidden="true"
      className={`${base} avatar-hashed`}
      style={{ ...dims, ["--avatar-hue" as string]: String(hue) }}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Subreddit-style cohort pill — "r/may-2024". Clickable filters the feed. */
function CohortPill({ cohortKey, onClick, size = "sm" }: {
  cohortKey: string;
  onClick?: (key: string) => void;
  size?: "sm" | "md";
}) {
  const cls = size === "md"
    ? "text-[11px] px-2 py-0.5"
    : "text-[10px] px-1.5 py-0.5";
  const inner = (
    <span className={`inline-flex items-center gap-0.5 rounded-md font-bold bg-brand-500/10 text-brand-700 leading-none ${cls} hover:bg-brand-500/15 transition-colors`}>
      <span className="opacity-60">r/</span>
      {cohortSlug(cohortKey)}
    </span>
  );
  if (!onClick) return inner;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(cohortKey); }}
      aria-label={`Filter to r/${cohortSlug(cohortKey)}`}
    >
      {inner}
    </button>
  );
}

/** Auto-derived cohort chip inside the New Question form.
 *  Shows "Posting to r/<slug>" with a "change" link that reveals the
 *  manual select. When auto-derive failed (no submitted date), the
 *  manual select is rendered directly. */
function PostToCohortChip({
  cohortKey,
  autoderived,
  months,
  overrideValue,
  onOverride,
}: {
  cohortKey: string;          // "" when nothing derived AND no override yet
  autoderived: boolean;       // true when we filled this from submitted date
  months: [string, number][];
  overrideValue: string;
  onOverride: (key: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(!autoderived);

  // If we don't have a derived month and no override yet, force the picker open.
  const mustPick = !cohortKey;

  if (cohortKey && !showPicker) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-sand-50 border border-sand-200 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] flex-shrink-0">Posting to</span>
          <CohortPill cohortKey={cohortKey} size="md" />
          {autoderived && <span className="text-[10px] text-sand-400 truncate">(your cohort)</span>}
        </div>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="text-[10px] text-brand-600 font-semibold hover:text-brand-700 flex-shrink-0 uppercase tracking-wider"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="text-[10px] text-sand-500 font-bold uppercase tracking-[0.08em] mb-1 block">
        {mustPick ? "Pick a cohort" : "Cohort"}
      </label>
      <div className="flex gap-2">
        <select
          value={overrideValue}
          onChange={(e) => onOverride(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
        >
          <option value="">Select a cohort…</option>
          {months.map(([key, count]) => (
            <option key={key} value={key}>r/{cohortSlug(key)} ({count} {count === 1 ? "entry" : "entries"})</option>
          ))}
        </select>
        {!mustPick && (
          <button
            type="button"
            onClick={() => { onOverride(""); setShowPicker(false); }}
            className="px-3 py-2 text-[11px] text-sand-500 hover:text-sand-800 font-semibold"
          >
            Use mine
          </button>
        )}
      </div>
    </div>
  );
}

/** Horizontal cohort filter strip — "All" + each cohort pill with count. */
function CohortFilterStrip({ cohorts, selected, onSelect, orientation = "horizontal" }: {
  cohorts: [string, number][];
  selected: string;
  onSelect: (key: string) => void;
  orientation?: "horizontal" | "vertical";
}) {
  const total = cohorts.reduce((s, [, n]) => s + n, 0);
  const isVertical = orientation === "vertical";

  if (isVertical) {
    // Sidebar mode for xl+. Eyebrow header + stacked rows that fill the rail.
    return (
      <div className="bg-white border border-sand-200 rounded-2xl p-3">
        <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-2 px-1">Filter by cohort</p>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onSelect("")}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
              selected === ""
                ? "bg-brand-500 text-white shadow-[0_2px_6px_rgba(45,106,79,0.25)]"
                : "text-sand-700 hover:bg-sand-50"
            }`}
          >
            <span>All cohorts</span>
            <span className={`text-[10px] font-bold nums-tabular px-1.5 py-0.5 rounded-full ${
              selected === "" ? "bg-white/20 text-white" : "bg-sand-100 text-sand-500"
            }`}>{total}</span>
          </button>
          {cohorts.map(([key, count]) => {
            const active = selected === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
                  active
                    ? "bg-brand-500 text-white shadow-[0_2px_6px_rgba(45,106,79,0.25)]"
                    : "text-sand-700 hover:bg-sand-50"
                }`}
              >
                <span className="truncate"><span className="opacity-70">r/</span>{cohortSlug(key)}</span>
                <span className={`text-[10px] font-bold nums-tabular px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  active ? "bg-white/20 text-white" : "bg-sand-100 text-sand-500"
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Horizontal strip — default, for mobile/lg-and-below.
  return (
    <div className="mb-4 -mx-1 px-1">
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
        <button
          type="button"
          onClick={() => onSelect("")}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
            selected === ""
              ? "bg-brand-500 text-white shadow-[0_2px_6px_rgba(45,106,79,0.25)]"
              : "bg-white border border-sand-200 text-sand-700 hover:bg-sand-50"
          }`}
        >
          All
          <span className={`text-[10px] font-bold nums-tabular px-1.5 py-0.5 rounded-full ${
            selected === "" ? "bg-white/20 text-white" : "bg-sand-100 text-sand-500"
          }`}>{total}</span>
        </button>
        {cohorts.map(([key, count]) => {
          const active = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                active
                  ? "bg-brand-500 text-white shadow-[0_2px_6px_rgba(45,106,79,0.25)]"
                  : "bg-white border border-sand-200 text-sand-700 hover:bg-sand-50"
              }`}
            >
              <span className="opacity-70">r/</span>{cohortSlug(key)}
              <span className={`text-[10px] font-bold nums-tabular px-1.5 py-0.5 rounded-full ${
                active ? "bg-white/20 text-white" : "bg-sand-100 text-sand-500"
              }`}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AuthorTag({ kind }: { kind: "OP" | "YOU" }) {
  const isOp = kind === "OP";
  return (
    <span
      className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none tracking-wider ${
        isOp ? "bg-warn/15 text-warn-dark" : "bg-brand-500 text-white"
      }`}
    >
      {kind}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Reddit-style thread card
// Root = the "post" with its own header and a prominent meta row.
// Children = nested CommentNode rows with a collapsible depth rail.
// ─────────────────────────────────────────────────────────────
function ThreadCard({ thread, myPinHash, onRefresh, lastSeen, onCohortClick, isOpen, onToggle }: {
  thread: ThreadData;
  myPinHash: string | null;
  onRefresh: () => void;
  lastSeen: string;
  onCohortClick?: (key: string) => void;
  // Accordion behavior — parent owns the "which thread is open" state so
  // opening a new thread auto-closes any other.
  isOpen: boolean;
  onToggle: () => void;
}) {
  const expanded = isOpen;
  const setExpanded = (v: boolean | ((p: boolean) => boolean)) => {
    // Either form ends up just toggling — the parent's onToggle handles
    // close-others.
    const next = typeof v === "function" ? v(expanded) : v;
    if (next !== expanded) onToggle();
  };
  const { root, allComments, totalReplies } = thread;

  const isRootNew = root.created_at > lastSeen;
  const newRepliesCount = allComments.filter(c => c.id !== root.id && c.created_at > lastSeen).length;
  const hasUnread = isRootNew || newRepliesCount > 0;
  const isMine = root.pin_hash === myPinHash;

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden transition-shadow ${
        hasUnread
          ? "border-brand-300 border-l-[3px] shadow-[0_1px_2px_rgba(45,106,79,0.06)]"
          : "border-sand-200"
      }`}
    >
      {/* ─── POST header ─────────────────────────── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-4 pt-3 pb-2.5 text-left transition-colors ${
          isRootNew ? "bg-brand-500/[0.06] hover:bg-brand-500/10" : "hover:bg-sand-50/50"
        }`}
      >
        <div className="flex items-start gap-3">
          <Avatar name={root.author_name} size={32} you={isMine} op />
          <div className="flex-1 min-w-0">
            {/* meta row */}
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className="text-[12px] font-bold text-sand-900 truncate">{root.author_name}</span>
              {isMine && <AuthorTag kind="YOU" />}
              {thread.cohortKey && (
                <CohortPill cohortKey={thread.cohortKey} onClick={onCohortClick} />
              )}
              <span className="text-[10px] text-sand-400">·</span>
              <span className="text-[10px] text-sand-500 nums-tabular">{timeAgo(root.created_at)}</span>
              {isRootNew && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-error text-white leading-none tracking-wider">NEW</span>
              )}
              {!isRootNew && newRepliesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-brand-500 text-white leading-none nums-tabular">
                  {newRepliesCount} new
                </span>
              )}
            </div>
            {/* post body */}
            <p
              className={`text-[14px] text-sand-800 leading-relaxed whitespace-pre-wrap break-words ${
                expanded ? "" : "line-clamp-3"
              }`}
            >
              {expanded ? linkifyText(root.text) : root.text}
            </p>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-sand-300 transition-transform duration-300 mt-1 flex-shrink-0"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M6 9L12 15L18 9" />
          </svg>
        </div>

        {/* meta footer — reddit-style action bar */}
        <div className="flex items-center gap-3 mt-2 pl-[44px] text-[11px] text-sand-500">
          <span className="inline-flex items-center gap-1 font-semibold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span className="nums-tabular">{totalReplies}</span>
            <span className="text-sand-400">{totalReplies === 1 ? "reply" : "replies"}</span>
          </span>
          <span className="text-sand-400">{expanded ? "Hide thread" : "View thread"}</span>
        </div>
      </button>

      {/* ─── POST body expanded (replies) ─────────────── */}
      <div
        style={{
          maxHeight: expanded ? "8000px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          style={{
            opacity: expanded ? 1 : 0,
            transition: "opacity 0.2s ease",
            transitionDelay: expanded ? "0.1s" : "0s",
          }}
          className="border-t border-sand-100"
        >
          {/* "X new since your last visit" sticky banner */}
          {newRepliesCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 border-b border-brand-500/20 text-[11px] font-semibold text-brand-600">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              <span>
                <span className="nums-tabular">{newRepliesCount}</span> new {newRepliesCount === 1 ? "reply" : "replies"} since your last visit
              </span>
            </div>
          )}

          {/* Root reply box */}
          <div className="px-4 pt-3">
            <ReplyInput parentId={root.id} comment={root} myPinHash={myPinHash} onRefresh={onRefresh} />
          </div>

          {/* Nested replies — Reddit-style tree */}
          {totalReplies > 0 ? (
            <div className="px-3 pt-2 pb-3">
              <CommentTree
                comments={allComments}
                parentId={root.id}
                depth={0}
                opPinHash={root.pin_hash}
                myPinHash={myPinHash}
                onRefresh={onRefresh}
                lastSeen={lastSeen}
              />
            </div>
          ) : (
            <div className="px-4 pb-4 pt-2 text-[12px] text-sand-400 italic">
              No replies yet — be the first.
            </div>
          )}

          {/* Delete root */}
          {isMine && (
            <div className="px-4 pb-3 pt-1 border-t border-sand-100">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await fetch(`/api/comments?id=${root.id}&pin_hash=${myPinHash}`, { method: "DELETE" });
                  onRefresh();
                }}
                className="text-[10px] text-sand-400 hover:text-error font-semibold uppercase tracking-wider"
              >
                Delete post
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recursive comment tree — Reddit-style with collapsible rail.
// Each row: depth rail (click to collapse) | avatar | header / body / actions
// ─────────────────────────────────────────────────────────────
function CommentTree({ comments, parentId, depth, opPinHash, myPinHash, onRefresh, lastSeen }: {
  comments: Comment[];
  parentId: string;
  depth: number;
  opPinHash: string;
  myPinHash: string | null;
  onRefresh: () => void;
  lastSeen: string;
}) {
  const children = comments
    .filter(c => c.parent_id === parentId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (children.length === 0) return null;

  return (
    <div className="space-y-1">
      {children.map(c => (
        <CommentNode
          key={c.id}
          comment={c}
          allComments={comments}
          depth={depth}
          opPinHash={opPinHash}
          myPinHash={myPinHash}
          onRefresh={onRefresh}
          lastSeen={lastSeen}
        />
      ))}
    </div>
  );
}

function CommentNode({ comment: c, allComments, depth, opPinHash, myPinHash, onRefresh, lastSeen }: {
  comment: Comment;
  allComments: Comment[];
  depth: number;
  opPinHash: string;
  myPinHash: string | null;
  onRefresh: () => void;
  lastSeen: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const isNew = c.created_at > lastSeen;
  const isMine = c.pin_hash === myPinHash;
  const isOp = c.pin_hash === opPinHash;

  // count descendants for collapsed-state summary
  const childCount = useMemo(() => {
    let n = 0;
    const stack = [c.id];
    while (stack.length) {
      const id = stack.pop()!;
      allComments.forEach(x => {
        if (x.parent_id === id) { n++; stack.push(x.id); }
      });
    }
    return n;
  }, [c.id, allComments]);

  const hasChildren = childCount > 0;

  // Are there unread descendants? Used to keep the rail bright even if this
  // comment itself is read but contains unread children below.
  const hasUnreadDescendant = useMemo(
    () => allComments.some(x => x.parent_id !== null && x.created_at > lastSeen && isDescendant(x, c.id, allComments)),
    [c.id, allComments, lastSeen]
  );
  const railHot = isNew || hasUnreadDescendant;

  return (
    <div className="flex gap-2">
      {/* ─── Depth rail (clickable to collapse) ──────── */}
      <button
        type="button"
        aria-label={collapsed ? "Expand thread" : "Collapse thread"}
        onClick={(e) => { e.stopPropagation(); setCollapsed(v => !v); }}
        className="group flex-shrink-0 flex justify-center pt-1.5"
        style={{ width: 14 }}
      >
        <span
          className={`block h-full rounded-full transition-all ${
            railHot
              ? "w-[3px] bg-brand-500 group-hover:bg-brand-600 shadow-[0_0_4px_rgba(45,106,79,0.35)]"
              : "w-[2px] bg-sand-200 group-hover:bg-sand-400"
          }`}
        />
      </button>

      <div className="flex-1 min-w-0">
        {/* ─── Comment block — solid tinted background when unread ─── */}
        <div className={`rounded-lg transition-colors ${
          isNew
            ? "bg-brand-500/10 ring-1 ring-brand-500/25 -mx-2 px-2 py-1.5"
            : "py-0.5"
        }`}>
          {/* Header row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Avatar name={c.author_name} size={20} you={isMine} op={isOp && !isMine} />
            <span className="text-[12px] font-bold text-sand-900">{c.author_name}</span>
            {isOp && <AuthorTag kind="OP" />}
            {isMine && <AuthorTag kind="YOU" />}
            {isNew && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-brand-500 text-white leading-none tracking-wider uppercase">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                New
              </span>
            )}
            <span className="text-[10px] text-sand-400">·</span>
            <span className="text-[10px] text-sand-500 nums-tabular">{timeAgo(c.created_at)}</span>
            {hasChildren && (
              <button
                onClick={() => setCollapsed(v => !v)}
                className="ml-auto text-[10px] text-sand-400 hover:text-brand-600 font-semibold nums-tabular"
              >
                {collapsed ? `[+] ${childCount} ${childCount === 1 ? "reply" : "replies"}` : "[–]"}
              </button>
            )}
          </div>

          {/* Body + actions (hidden when collapsed) */}
          {!collapsed && (
            <div className="pl-[26px]">
              <p className="text-[13px] text-sand-800 leading-relaxed whitespace-pre-wrap break-words mt-0.5">
                {linkifyText(c.text)}
              </p>

              {/* action row */}
              <div className="flex items-center gap-3 mt-1 text-[10px] font-semibold flex-wrap">
                {depth < 4 && (
                  <ReplyInput
                    parentId={c.id}
                    comment={c}
                    myPinHash={myPinHash}
                    onRefresh={onRefresh}
                    compact
                  />
                )}
                {isMine && (
                  <button
                    onClick={async () => {
                      await fetch(`/api/comments?id=${c.id}&pin_hash=${myPinHash}`, { method: "DELETE" });
                      onRefresh();
                    }}
                    className="text-sand-400 hover:text-error uppercase tracking-wider"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recurse — sits outside the tinted block so descendants get their own treatment */}
        {!collapsed && (
          <div className="mt-1 pl-[26px]">
            <CommentTree
              comments={allComments}
              parentId={c.id}
              depth={depth + 1}
              opPinHash={opPinHash}
              myPinHash={myPinHash}
              onRefresh={onRefresh}
              lastSeen={lastSeen}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Reply input — inline toggle
function ReplyInput({ parentId, comment, myPinHash, onRefresh, compact }: {
  parentId: string; comment: Comment; myPinHash: string | null;
  onRefresh: () => void | Promise<void>; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [anon, setAnon] = useState(false);

  if (!myPinHash) return null;

  const handlePost = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: comment.application_id || undefined,
          cohort_month: comment.cohort_month || undefined,
          pin_hash: myPinHash, text: text.trim(),
          parent_id: parentId, anonymous: anon,
        }),
      });
      // Await the parent refetch so the spinner stays visible until the
      // reply lands in the feed.
      await Promise.resolve(onRefresh());
      setText(""); setOpen(false); setAnon(false);
    } finally {
      setPosting(false);
    }
  };

  if (!open) {
    // In compact mode (inside a CommentNode action row), render as a plain
    // inline link so it sits flush with sibling "Delete" / metadata.
    if (compact) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="text-sand-500 hover:text-brand-600 uppercase tracking-wider text-[10px] font-semibold"
        >
          Reply
        </button>
      );
    }
    // Root reply box (under a post header) — bigger, primary affordance.
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full px-3 py-2.5 rounded-lg border border-sand-200 bg-sand-50 hover:bg-white hover:border-brand-300 text-left text-[12px] text-sand-500 transition-colors"
      >
        Reply to this post…
      </button>
    );
  }

  return (
    <div className={`${compact ? "mt-1 w-full" : "mt-1"}`}>
      <div className="flex gap-1.5">
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 500))}
          onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) handlePost(); }}
          placeholder="Write a reply…" autoFocus
          disabled={posting}
          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-sand-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 disabled:opacity-60" />
        <button onClick={handlePost} disabled={!text.trim() || posting}
          className="px-3 py-1.5 bg-brand-500 text-white text-[11px] font-semibold rounded-lg disabled:opacity-50 active:scale-[0.98] hover:bg-brand-600 inline-flex items-center gap-1.5">
          {posting && <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
          {posting ? "Posting" : "Reply"}
        </button>
        <button
          onClick={() => { setOpen(false); setText(""); }}
          className="px-2 text-sand-400 hover:text-sand-700 text-sm"
          aria-label="Cancel reply"
        >
          ×
        </button>
      </div>
      <label className="flex items-center gap-1.5 mt-1 cursor-pointer w-fit">
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)}
          className="w-3 h-3 rounded border-sand-300 text-brand-500 focus:ring-brand-500/20" />
        <span className="text-[10px] text-sand-500">Post anonymously</span>
      </label>
    </div>
  );
}

// CohortGroup removed — the community feed is now a flat sorted list with
// a horizontal cohort filter strip and per-post r/<slug> pills.
// See CohortFilterStrip + CohortPill above.
