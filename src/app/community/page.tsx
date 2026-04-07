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
        <p className="text-xs text-sand-500 mt-0.5">{totalComments} {totalComments === 1 ? "comment" : "comments"} \u00b7 Discuss by submission month</p>
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

      {/* Threads */}
      {threads.length === 0 ? (
        <div className="bg-white border border-sand-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sand-400"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </div>
          <div className="text-sm font-semibold text-sand-700 mb-1">No questions yet</div>
          <p className="text-xs text-sand-400">Be the first to ask your submission month cohort!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map(t => (
            <ThreadCard key={t.root.id} thread={t} myPinHash={myPinHash} onRefresh={fetchData} />
          ))}
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

// Reddit-style thread card
function ThreadCard({ thread, myPinHash, onRefresh }: {
  thread: ThreadData;
  myPinHash: string | null;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { root, allComments, label, totalReplies } = thread;

  return (
    <div className="bg-white border border-sand-200 rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 text-left active:bg-sand-50/50 transition-colors">
        <div className="flex items-center gap-2 mb-1">
          <div className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-brand-100 text-brand-700">{label}</div>
          <span className="text-[9px] text-sand-400 ml-auto flex items-center gap-2">
            {totalReplies > 0 && (
              <span className="flex items-center gap-0.5 text-brand-500 font-semibold">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                {totalReplies}
              </span>
            )}
            {timeAgo(root.created_at)}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className="text-sand-300 transition-transform duration-300"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
              <path d="M6 9L12 15L18 9" />
            </svg>
          </span>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-brand-600">{root.author_name}</span>
          <p className={`text-[13px] text-sand-800 leading-snug mt-0.5 ${expanded ? "" : "line-clamp-2"}`}>{root.text}</p>
        </div>
      </button>

      {/* Expanded — nested replies */}
      <div style={{
        maxHeight: expanded ? "5000px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div style={{ opacity: expanded ? 1 : 0, transition: "opacity 0.2s ease", transitionDelay: expanded ? "0.1s" : "0s" }}>
          {/* Root reply action */}
          <div className="px-4 pb-1">
            <ReplyInput parentId={root.id} comment={root} myPinHash={myPinHash} onRefresh={onRefresh} />
          </div>

          {/* Nested replies — Reddit style */}
          <div className="px-4 pb-3">
            <CommentTree comments={allComments} parentId={root.id} depth={0} myPinHash={myPinHash} onRefresh={onRefresh} />
          </div>

          {/* Delete root */}
          {root.pin_hash === myPinHash && (
            <div className="px-4 pb-3">
              <button onClick={async (e) => {
                e.stopPropagation();
                await fetch(`/api/comments?id=${root.id}&pin_hash=${myPinHash}`, { method: "DELETE" });
                onRefresh();
              }} className="text-[9px] text-sand-400 hover:text-error font-medium">Delete post</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Recursive comment tree — Reddit-style nesting
function CommentTree({ comments, parentId, depth, myPinHash, onRefresh }: {
  comments: Comment[]; parentId: string; depth: number;
  myPinHash: string | null; onRefresh: () => void;
}) {
  const children = comments.filter(c => c.parent_id === parentId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (children.length === 0) return null;

  return (
    <div className={depth > 0 ? "mt-1" : "mt-1"}>
      {children.map(c => (
        <div key={c.id} className={`${depth > 0 ? "ml-3 pl-3 border-l-2 border-sand-200" : ""}`}>
          <div className="py-1.5">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-semibold text-sand-700">{c.author_name}</span>
              <span className="text-[9px] text-sand-400">{timeAgo(c.created_at)}</span>
              {c.pin_hash === myPinHash && (
                <button onClick={async () => {
                  await fetch(`/api/comments?id=${c.id}&pin_hash=${myPinHash}`, { method: "DELETE" });
                  onRefresh();
                }} className="text-[9px] text-sand-400 hover:text-error font-medium ml-auto">delete</button>
              )}
            </div>
            <p className="text-xs text-sand-700 leading-relaxed">{c.text}</p>
            {depth < 4 && (
              <ReplyInput parentId={c.id} comment={c} myPinHash={myPinHash} onRefresh={onRefresh} compact />
            )}
          </div>
          {/* Recurse into children */}
          <CommentTree comments={comments} parentId={c.id} depth={depth + 1} myPinHash={myPinHash} onRefresh={onRefresh} />
        </div>
      ))}
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
    return (
      <button onClick={() => setOpen(true)}
        className={`text-[10px] text-brand-500 font-medium hover:underline ${compact ? "mt-0.5" : "mt-1"}`}>
        Reply
      </button>
    );
  }

  return (
    <div className={`${compact ? "mt-1" : "mt-2"}`}>
      <div className="flex gap-1.5">
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 500))}
          onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) handlePost(); }}
          placeholder="Write a reply..." autoFocus
          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-sand-200 bg-sand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        <button onClick={handlePost} disabled={!text.trim() || posting}
          className="px-2.5 py-1.5 bg-brand-500 text-white text-[10px] font-semibold rounded-lg disabled:opacity-50 active:scale-[0.98]">
          {posting ? "..." : "Reply"}
        </button>
        <button onClick={() => { setOpen(false); setText(""); }}
          className="text-[10px] text-sand-400 px-1">x</button>
      </div>
      <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)}
          className="w-3 h-3 rounded border-sand-300 text-brand-500 focus:ring-brand-500/20" />
        <span className="text-[9px] text-sand-400">Anonymous</span>
      </label>
    </div>
  );
}
