"use client";

import { useState, useMemo } from "react";
import { Comment } from "@/lib/types";
import { getSavedPinHash } from "@/lib/pin";

interface Props {
  applicationId: string;
  comments: Comment[];
  // May return a promise — we await it so the "posting" spinner stays visible
  // through the refetch, not just the POST itself.
  onRefresh: () => void | Promise<void>;
}

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${MO[d.getMonth()]} ${d.getDate()}`;
}

export function CommentsSection({ applicationId, comments, onRefresh }: Props) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  // Optimistic comments — shown immediately on post, before the server
  // refetch completes. Cleared once the server returns the real row.
  const [optimistic, setOptimistic] = useState<Comment[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Find the user's pin_hash from any of their saved entries
  const getMyPinHash = (): string | null => {
    // Check if user has any saved PIN for any entry
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("sponsortrack-pins");
      if (!raw) return null;
      const store = JSON.parse(raw);
      const values = Object.values(store) as string[];
      return values[0] || null;
    } catch { return null; }
  };

  const myPinHash = getMyPinHash();

  // Merge server comments with any still-pending optimistic ones. Optimistic
  // entries that the server has now confirmed (same id) are dropped.
  const allComments = useMemo(() => {
    if (optimistic.length === 0) return comments;
    const serverIds = new Set(comments.map(c => c.id));
    const stillPending = optimistic.filter(o => !serverIds.has(o.id));
    return [...comments, ...stillPending];
  }, [comments, optimistic]);

  const handlePost = async () => {
    if (!text.trim() || !myPinHash || posting) return;
    const localText = text.trim();
    const localReplyTo = replyTo;
    const localAnon = anonymous;
    // Optimistic insert — comment appears immediately while server catches up.
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const pending: Comment = {
      id: tempId,
      application_id: applicationId,
      cohort_month: null,
      pin_hash: myPinHash,
      author_name: localAnon ? "Anonymous" : "You",
      text: localText,
      parent_id: localReplyTo,
      created_at: new Date().toISOString(),
    };
    setOptimistic(prev => [...prev, pending]);
    setText("");
    setReplyTo(null);
    setPosting(true);

    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: applicationId,
          pin_hash: myPinHash,
          text: localText,
          parent_id: localReplyTo,
          anonymous: localAnon,
        }),
      });
      // Await the parent refetch so the spinner remains visible until the
      // server-confirmed comment is in the prop list. Then drop our temp.
      await onRefresh();
    } finally {
      setOptimistic(prev => prev.filter(c => c.id !== tempId));
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!myPinHash) return;
    setDeletingIds(prev => new Set(prev).add(commentId));
    try {
      await fetch(`/api/comments?id=${commentId}&pin_hash=${myPinHash}`, { method: "DELETE" });
      await onRefresh();
    } finally {
      setDeletingIds(prev => { const next = new Set(prev); next.delete(commentId); return next; });
    }
  };

  // Separate top-level and replies (using merged optimistic+server view)
  const topLevel = allComments.filter(c => !c.parent_id);
  const replies = allComments.filter(c => c.parent_id);
  const isPending = (id: string) => id.startsWith("pending-");

  return (
    <div className="mt-3 pt-4 border-t border-sand-100">
      <div className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-3 nums-tabular">
        Questions &amp; comments {comments.length > 0 && `· ${comments.length}`}
      </div>

      {/* Existing comments */}
      {topLevel.length > 0 ? (
        <div className="space-y-2 mb-3">
          {topLevel.map(c => {
            const pending = isPending(c.id);
            const deleting = deletingIds.has(c.id);
            return (
            <div key={c.id} className={pending || deleting ? "opacity-60 pointer-events-none" : ""}>
              <div className="bg-white border border-sand-200 rounded-lg px-3 py-2.5">
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[12px] font-bold text-sand-900">{c.author_name}</span>
                  {c.pin_hash === myPinHash && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500 text-white uppercase tracking-wider leading-none">YOU</span>
                  )}
                  {pending && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sand-200 text-sand-600 uppercase tracking-wider leading-none animate-pulse">Posting…</span>
                  )}
                  {deleting && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sand-200 text-sand-600 uppercase tracking-wider leading-none animate-pulse">Deleting…</span>
                  )}
                  <span className="text-[10px] text-sand-400 nums-tabular ml-auto">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-[13px] text-sand-700 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                {!pending && !deleting && (
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold uppercase tracking-wider">
                    <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                      className="text-sand-500 hover:text-brand-600 transition-colors">
                      {replyTo === c.id ? "Cancel" : "Reply"}
                    </button>
                    {c.pin_hash === myPinHash && (
                      <button onClick={() => handleDelete(c.id)}
                        className="text-sand-400 hover:text-error transition-colors">
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Replies */}
              {replies.filter(r => r.parent_id === c.id).map(r => {
                const rPending = isPending(r.id);
                const rDeleting = deletingIds.has(r.id);
                return (
                <div key={r.id} className={`ml-4 mt-1.5 border-l-2 border-sand-200 pl-3 ${rPending || rDeleting ? "opacity-60 pointer-events-none" : ""}`}>
                  <div className="bg-brand-500/[0.06] rounded-lg px-3 py-2 border border-brand-500/15">
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-[12px] font-bold text-sand-900">{r.author_name}</span>
                      {r.pin_hash === myPinHash && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500 text-white uppercase tracking-wider leading-none">YOU</span>
                      )}
                      {rPending && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sand-200 text-sand-600 uppercase tracking-wider leading-none animate-pulse">Posting…</span>
                      )}
                      {rDeleting && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sand-200 text-sand-600 uppercase tracking-wider leading-none animate-pulse">Deleting…</span>
                      )}
                      <span className="text-[10px] text-sand-400 nums-tabular ml-auto">{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-[13px] text-sand-700 leading-relaxed whitespace-pre-wrap">{r.text}</p>
                    {!rPending && !rDeleting && r.pin_hash === myPinHash && (
                      <button onClick={() => handleDelete(r.id)}
                        className="text-[10px] text-sand-400 hover:text-error font-semibold uppercase tracking-wider mt-1.5 transition-colors">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                );
              })}

              {/* Reply input */}
              {replyTo === c.id && myPinHash && !pending && (
                <div className="ml-4 mt-2 pl-3 border-l-2 border-sand-200">
                  <div className="flex gap-1.5">
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value.slice(0, 500))}
                      onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) handlePost(); }}
                      placeholder="Write a reply…"
                      autoFocus
                      disabled={posting}
                      className="flex-1 px-2.5 py-1.5 text-[12px] rounded-lg border border-sand-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 disabled:opacity-60"
                    />
                    <button onClick={handlePost} disabled={!text.trim() || posting}
                      className="px-3 py-1.5 bg-brand-500 text-white text-[11px] font-semibold rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5">
                      {posting && <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                      {posting ? "Posting" : "Reply"}
                    </button>
                  </div>
                  <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer w-fit">
                    <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-sand-300 text-brand-500 focus:ring-brand-500/20" />
                    <span className="text-[10px] text-sand-500">Post anonymously</span>
                  </label>
                </div>
              )}
            </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[12px] text-sand-400 mb-3 italic">No questions yet. Be the first to ask.</p>
      )}

      {/* New comment input (top-level) */}
      {myPinHash && !replyTo && (
        <div>
          <div className="flex gap-1.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) handlePost(); }}
              placeholder="Ask a question…"
              disabled={posting}
              className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-sand-200 bg-sand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 focus:bg-white transition-colors disabled:opacity-60"
            />
            <button onClick={handlePost} disabled={!text.trim() || posting}
              className="px-3.5 py-2 bg-brand-500 text-white text-[12px] font-semibold rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 active:scale-[0.98] inline-flex items-center gap-1.5">
              {posting && <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
              {posting ? "Posting" : "Post"}
            </button>
          </div>
          <label className="flex items-center gap-1.5 mt-2 cursor-pointer w-fit">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-sand-300 text-brand-500 focus:ring-brand-500/20" />
            <span className="text-[10px] text-sand-500">Post anonymously</span>
          </label>
        </div>
      )}

      {!myPinHash && (
        <p className="text-[11px] text-sand-400 italic">Add your application first to post questions.</p>
      )}
    </div>
  );
}
