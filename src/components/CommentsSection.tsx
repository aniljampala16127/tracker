"use client";

import { useState } from "react";
import { Comment } from "@/lib/types";
import { getSavedPinHash } from "@/lib/pin";

interface Props {
  applicationId: string;
  comments: Comment[];
  onRefresh: () => void;
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

  const handlePost = async () => {
    if (!text.trim() || !myPinHash) return;
    setPosting(true);
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: applicationId,
        pin_hash: myPinHash,
        text: text.trim(),
        parent_id: replyTo,
        anonymous,
      }),
    });
    setText("");
    setReplyTo(null);
    setPosting(false);
    onRefresh();
  };

  const handleDelete = async (commentId: string) => {
    if (!myPinHash) return;
    await fetch(`/api/comments?id=${commentId}&pin_hash=${myPinHash}`, { method: "DELETE" });
    onRefresh();
  };

  // Separate top-level and replies
  const topLevel = comments.filter(c => !c.parent_id);
  const replies = comments.filter(c => c.parent_id);

  return (
    <div className="mt-3 pt-3 border-t border-sand-100">
      <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-2">
        Questions & Comments {comments.length > 0 && `(${comments.length})`}
      </div>

      {/* Existing comments */}
      {topLevel.length > 0 ? (
        <div className="space-y-2 mb-3">
          {topLevel.map(c => (
            <div key={c.id}>
              <div className="bg-sand-50 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-semibold text-sand-800">{c.author_name}</span>
                  <span className="text-[9px] text-sand-400">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-xs text-sand-700 leading-relaxed">{c.text}</p>
                <div className="flex items-center gap-3 mt-1">
                  <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                    className="text-[9px] text-brand-500 font-medium hover:underline">
                    {replyTo === c.id ? "Cancel" : "Reply"}
                  </button>
                  {c.pin_hash === myPinHash && (
                    <button onClick={() => handleDelete(c.id)}
                      className="text-[9px] text-sand-400 hover:text-error font-medium">
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Replies */}
              {replies.filter(r => r.parent_id === c.id).map(r => (
                <div key={r.id} className="ml-4 mt-1.5 bg-brand-50/50 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-semibold text-sand-800">{r.author_name}</span>
                    <span className="text-[9px] text-sand-400">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-xs text-sand-700 leading-relaxed">{r.text}</p>
                  {r.pin_hash === myPinHash && (
                    <button onClick={() => handleDelete(r.id)}
                      className="text-[9px] text-sand-400 hover:text-error font-medium mt-1">
                      Delete
                    </button>
                  )}
                </div>
              ))}

              {/* Reply input */}
              {replyTo === c.id && myPinHash && (
                <div className="ml-4 mt-1.5">
                  <div className="flex gap-1.5">
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value.slice(0, 500))}
                      onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) handlePost(); }}
                      placeholder="Write a reply..."
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-sand-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                    <button onClick={handlePost} disabled={!text.trim() || posting}
                      className="px-3 py-1.5 bg-brand-500 text-white text-[10px] font-semibold rounded-lg disabled:opacity-50">
                      {posting ? "..." : "Reply"}
                    </button>
                  </div>
                  <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                    <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-sand-300 text-brand-500 focus:ring-brand-500/20" />
                    <span className="text-[10px] text-sand-400">Post anonymously</span>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-sand-400 mb-3">No questions yet. Be the first to ask!</p>
      )}

      {/* New comment input (top-level) */}
      {myPinHash && !replyTo && (
        <div>
          <div className="flex gap-1.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) handlePost(); }}
              placeholder="Ask a question..."
              className="flex-1 px-2.5 py-2 text-xs rounded-lg border border-sand-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button onClick={handlePost} disabled={!text.trim() || posting}
              className="px-3 py-2 bg-brand-500 text-white text-[10px] font-semibold rounded-lg disabled:opacity-50 active:scale-[0.98]">
              {posting ? "..." : "Post"}
            </button>
          </div>
          <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-sand-300 text-brand-500 focus:ring-brand-500/20" />
            <span className="text-[10px] text-sand-400">Post anonymously</span>
          </label>
        </div>
      )}

      {!myPinHash && (
        <p className="text-[9px] text-sand-400 italic">Add your application first to post questions.</p>
      )}
    </div>
  );
}
