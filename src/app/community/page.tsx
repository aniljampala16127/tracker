"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Application, Comment } from "@/lib/types";
import { buildStepsMap } from "@/lib/utils";
import { PullToRefresh } from "@/components/PullToRefresh";

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

  // Build threads
  const threads: ThreadData[] = useMemo(() => {
    const result: ThreadData[] = [];

    // Cohort threads
    const topCohort = cohortComments.filter(c => !c.parent_id);
    topCohort.forEach(root => {
      const allInThread = cohortComments.filter(c => c.id === root.id || isDescendant(c, root.id, cohortComments));
      result.push({
        root,
        allComments: allInThread,
        label: root.cohort_month ? monthLabel(root.cohort_month) + " cohort" : "General",
        totalReplies: allInThread.length - 1,
      });
    });

    // Entry threads
    apps.forEach(app => {
      if (!app.comments || app.comments.length === 0) return;
      const s = buildStepsMap(app.step_events || []);
      let cohort = "General";
      if (s.submitted) {
        const d = new Date(s.submitted + "T00:00:00");
        cohort = monthLabel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`) + " cohort";
      }
      const tops = app.comments.filter(c => !c.parent_id);
      tops.forEach(root => {
        const allInThread = app.comments!.filter(c => c.id === root.id || isDescendant(c, root.id, app.comments!));
        result.push({
          root,
          allComments: allInThread,
          label: cohort,
          totalReplies: allInThread.length - 1,
        });
      });
    });

    result.sort((a, b) => b.root.created_at.localeCompare(a.root.created_at));
    return result;
  }, [apps, cohortComments]);

  const totalComments = threads.reduce((s, t) => s + t.allComments.length, 0);

  const handleNewQuestion = async () => {
    if (!newQText.trim() || !newQMonth || !myPinHash) return;
    setPosting(true);
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohort_month: newQMonth, pin_hash: myPinHash, text: newQText.trim(), parent_id: null, anonymous }),
    });
    setNewQText(""); setNewQMonth(""); setNewQ(false); setAnonymous(false); setPosting(false);
    fetchData();
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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-sand-900">Community</h1>
        <p className="text-xs text-sand-500 mt-0.5">{totalComments} {totalComments === 1 ? "comment" : "comments"} · Discuss by submission month</p>
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
          <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-3">New Question</div>
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] text-sand-500 font-medium mb-1 block">Submission Month</label>
              <select value={newQMonth} onChange={(e) => setNewQMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                <option value="">Select a month...</option>
                {months.map(([key, count]) => (
                  <option key={key} value={key}>{monthLabel(key)} ({count} entries)</option>
                ))}
              </select>
            </div>
            <div>
              <textarea value={newQText} onChange={(e) => setNewQText(e.target.value.slice(0, 500))} placeholder="What would you like to ask this cohort?" rows={3}
                className="w-full px-3 py-2 rounded-lg border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none" />
              <div className="text-[9px] text-sand-300 text-right">{newQText.length}/500</div>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="w-3.5 h-3.5 rounded border-sand-300 text-brand-500 focus:ring-brand-500/20" />
              <span className="text-[10px] text-sand-400">Post anonymously</span>
            </label>
            <div className="flex gap-2">
              <button onClick={handleNewQuestion} disabled={!newQText.trim() || !newQMonth || posting} className="flex-1 py-2 bg-brand-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 active:scale-[0.98]">{posting ? "Posting..." : "Post Question"}</button>
              <button onClick={() => { setNewQ(false); setNewQText(""); setNewQMonth(""); setAnonymous(false); }} className="px-4 py-2 text-sm text-sand-500 rounded-lg border border-sand-200 hover:bg-sand-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Threads grouped by cohort */}
      {threads.length === 0 ? (
        <div className="bg-white border border-sand-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sand-400"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </div>
          <div className="text-sm font-semibold text-sand-700 mb-1">No questions yet</div>
          <p className="text-xs text-sand-400">Be the first to ask your submission month cohort!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            // Group threads by label (cohort month)
            const groups: Record<string, ThreadData[]> = {};
            threads.forEach(t => {
              const key = t.label;
              if (!groups[key]) groups[key] = [];
              groups[key].push(t);
            });
            // Sort groups by newest thread in each
            const sortedKeys = Object.keys(groups).sort((a, b) => {
              const aLatest = groups[a][0].root.created_at;
              const bLatest = groups[b][0].root.created_at;
              return bLatest.localeCompare(aLatest);
            });
            return sortedKeys.map(key => {
              const groupThreads = groups[key];
              const totalInGroup = groupThreads.reduce((s, t) => s + t.allComments.length, 0);
              const unreadInGroup = groupThreads.reduce((s, t) => s + t.allComments.filter(c => c.created_at > lastSeen).length, 0);
              return (
                <CohortGroup
                  key={key}
                  label={key}
                  threads={groupThreads}
                  totalComments={totalInGroup}
                  unreadCount={unreadInGroup}
                  myPinHash={myPinHash}
                  onRefresh={fetchData}
                  lastSeen={lastSeen}
                />
              );
            });
          })()}
        </div>
      )}

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
  // "you" → brand fill. "OP" → warm gold fill. Otherwise stable-hashed pastel.
  let bg: string, fg: string, ring = "";
  if (you) { bg = "var(--brand-500)"; fg = "#fff"; ring = "ring-2 ring-brand-200"; }
  else if (op) { bg = "var(--warn)"; fg = "#fff"; }
  else {
    const hue = hashHue(name);
    bg = `hsl(${hue} 38% 92%)`;
    fg = `hsl(${hue} 45% 30%)`;
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 font-bold ${ring}`}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.42) }}
    >
      {initialsOf(name)}
    </span>
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
function ThreadCard({ thread, myPinHash, onRefresh, lastSeen }: {
  thread: ThreadData;
  myPinHash: string | null;
  onRefresh: () => void;
  lastSeen: string;
}) {
  const [expanded, setExpanded] = useState(false);
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
          isRootNew ? "bg-brand-50/60 hover:bg-brand-50" : "hover:bg-sand-50/50"
        }`}
      >
        <div className="flex items-start gap-3">
          <Avatar name={root.author_name} size={32} you={isMine} op />
          <div className="flex-1 min-w-0">
            {/* meta row */}
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className="text-[12px] font-bold text-sand-900 truncate">{root.author_name}</span>
              {isMine && <AuthorTag kind="YOU" />}
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
              className={`text-[14px] text-sand-800 leading-relaxed whitespace-pre-wrap ${
                expanded ? "" : "line-clamp-3"
              }`}
            >
              {root.text}
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
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-50 border-b border-brand-100 text-[11px] font-semibold text-brand-700">
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
            ? "bg-brand-50 ring-1 ring-brand-200 -mx-2 px-2 py-1.5"
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
              <p className="text-[13px] text-sand-800 leading-relaxed whitespace-pre-wrap mt-0.5">
                {c.text}
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
  onRefresh: () => void; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [anon, setAnon] = useState(false);

  if (!myPinHash) return null;

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
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
    setText(""); setOpen(false); setAnon(false); setPosting(false);
    onRefresh();
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
          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-sand-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
        <button onClick={handlePost} disabled={!text.trim() || posting}
          className="px-3 py-1.5 bg-brand-500 text-white text-[11px] font-semibold rounded-lg disabled:opacity-50 active:scale-[0.98] hover:bg-brand-600">
          {posting ? "…" : "Reply"}
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

// Collapsible cohort group
function CohortGroup({ label, threads, totalComments, unreadCount, myPinHash, onRefresh, lastSeen }: {
  label: string;
  threads: ThreadData[];
  totalComments: number;
  unreadCount: number;
  myPinHash: string | null;
  onRefresh: () => void;
  lastSeen: string;
}) {
  const [expanded, setExpanded] = useState(unreadCount > 0);

  return (
    <div>
      {/* Cohort header */}
      <button onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors active:scale-[0.99] ${
          expanded ? "bg-brand-500 text-white" : "bg-white border border-sand-200 text-sand-900"
        }`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
          expanded ? "bg-white/20 text-white" : "bg-brand-100 text-brand-700"
        }`}>
          {label.replace(" cohort", "").split(" ")[0]?.slice(0, 3)}
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold">{label}</div>
          <div className={`text-[10px] ${expanded ? "text-white/70" : "text-sand-400"}`}>
            {threads.length} {threads.length === 1 ? "thread" : "threads"} · {totalComments} {totalComments === 1 ? "comment" : "comments"}
          </div>
        </div>
        {unreadCount > 0 && (
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
            expanded ? "bg-white/20 text-white" : "bg-error text-white"
          }`}>{unreadCount} new</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className={`flex-shrink-0 transition-transform duration-300 ${expanded ? "text-white/70" : "text-sand-300"}`}
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>

      {/* Threads */}
      <div style={{
        maxHeight: expanded ? `${threads.length * 500}px` : "0px",
        overflow: "hidden",
        transition: "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="space-y-2 pt-2" style={{
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.25s ease",
          transitionDelay: expanded ? "0.1s" : "0s",
        }}>
          {threads.map(t => (
            <ThreadCard key={t.root.id} thread={t} myPinHash={myPinHash} onRefresh={onRefresh} lastSeen={lastSeen} />
          ))}
        </div>
      </div>
    </div>
  );
}
