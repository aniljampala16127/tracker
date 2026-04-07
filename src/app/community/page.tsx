"use client";

import { useEffect, useState, useCallback } from "react";
import { Application, Comment } from "@/lib/types";
import { getSavedPinHash } from "@/lib/pin";
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
  const d2 = new Date(dateStr);
  return `${MO[d2.getMonth()]} ${d2.getDate()}`;
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

interface ThreadItem {
  comment: Comment;
  replies: Comment[];
  appInitials: string;
  appCountry: string;
  appId: string;
}

export default function CommunityPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, []);

  const fetchApps = useCallback(async () => {
    const res = await fetch("/api/applications");
    const data = await res.json();
    if (Array.isArray(data)) setApps(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const myPinHash = getMyPinHash();

  // Build thread list — all top-level comments sorted by newest
  const threads: ThreadItem[] = [];
  apps.forEach(app => {
    if (!app.comments || app.comments.length === 0) return;
    const topLevel = app.comments.filter(c => !c.parent_id);
    const replies = app.comments.filter(c => c.parent_id);
    topLevel.forEach(c => {
      threads.push({
        comment: c,
        replies: replies.filter(r => r.parent_id === c.id).sort((a, b) => a.created_at.localeCompare(b.created_at)),
        appInitials: app.initials,
        appCountry: app.country_origin,
        appId: app.id,
      });
    });
  });
  threads.sort((a, b) => b.comment.created_at.localeCompare(a.comment.created_at));

  const totalComments = apps.reduce((sum, a) => sum + (a.comments?.length || 0), 0);

  const handlePost = async (applicationId: string, parentId: string | null) => {
    if (!text.trim() || !myPinHash) return;
    setPosting(true);
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: applicationId,
        pin_hash: myPinHash,
        text: text.trim(),
        parent_id: parentId,
      }),
    });
    setText("");
    setReplyTo(null);
    setPosting(false);
    fetchApps();
  };

  const handleDelete = async (commentId: string) => {
    if (!myPinHash) return;
    await fetch(`/api/comments?id=${commentId}&pin_hash=${myPinHash}`, { method: "DELETE" });
    fetchApps();
  };

  if (loading) {
    return (
      <div className="page-enter">
        <div className="mb-6">
          <div className="animate-pulse bg-sand-200/60 rounded-lg h-6 w-40 mb-2" />
          <div className="animate-pulse bg-sand-200/60 rounded-lg h-3 w-56" />
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="bg-white border border-sand-200 rounded-xl p-4 mb-3">
            <div className="animate-pulse bg-sand-200/60 rounded h-4 w-32 mb-2" />
            <div className="animate-pulse bg-sand-200/60 rounded h-3 w-full mb-1" />
            <div className="animate-pulse bg-sand-200/60 rounded h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => { await fetchApps(); }}>
    <div className="page-enter">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-sand-900">Community</h1>
        <p className="text-xs text-sand-500 mt-0.5">
          {totalComments} {totalComments === 1 ? "comment" : "comments"} across {apps.filter(a => (a.comments?.length || 0) > 0).length} entries
        </p>
      </div>

      {threads.length === 0 ? (
        <div className="bg-white border border-sand-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sand-400">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <div className="text-sm font-semibold text-sand-700 mb-1">No questions yet</div>
          <p className="text-xs text-sand-400">Tap any entry on the Tracker tab to ask a question about their timeline.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map(({ comment, replies, appInitials, appCountry, appId }) => (
            <div key={comment.id} className="bg-white border border-sand-200 rounded-xl overflow-hidden">
              {/* Thread header — which entry */}
              <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-brand-100 flex items-center justify-center text-[8px] font-bold text-brand-700">
                  {appInitials.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[11px] text-sand-500">
                  on <span className="font-semibold text-sand-700">{appInitials}</span> · {appCountry}
                </span>
                <span className="text-[9px] text-sand-400 ml-auto">{timeAgo(comment.created_at)}</span>
              </div>

              {/* Question */}
              <div className="px-4 py-2">
                <div className="text-[11px] font-semibold text-brand-600 mb-0.5">{comment.author_name}</div>
                <p className="text-sm text-sand-800 leading-relaxed">{comment.text}</p>
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <div className="mx-4 mb-2 space-y-1.5">
                  {replies.map(r => (
                    <div key={r.id} className="bg-sand-50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-sand-700">{r.author_name}</span>
                        <span className="text-[9px] text-sand-400">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-xs text-sand-700 leading-relaxed">{r.text}</p>
                      {r.pin_hash === myPinHash && (
                        <button onClick={() => handleDelete(r.id)}
                          className="text-[9px] text-sand-400 hover:text-error font-medium mt-1">Delete</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="px-4 pb-3 flex items-center gap-3">
                <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  className="text-[10px] text-brand-500 font-semibold hover:underline">
                  {replyTo === comment.id ? "Cancel" : `Reply${replies.length > 0 ? ` (${replies.length})` : ""}`}
                </button>
                {comment.pin_hash === myPinHash && (
                  <button onClick={() => handleDelete(comment.id)}
                    className="text-[10px] text-sand-400 hover:text-error font-medium">Delete</button>
                )}
              </div>

              {/* Reply input */}
              {replyTo === comment.id && myPinHash && (
                <div className="px-4 pb-3 flex gap-1.5">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, 500))}
                    onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) handlePost(appId, comment.id); }}
                    placeholder="Write a reply..."
                    autoFocus
                    className="flex-1 px-2.5 py-2 text-xs rounded-lg border border-sand-200 bg-sand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <button onClick={() => handlePost(appId, comment.id)} disabled={!text.trim() || posting}
                    className="px-3 py-2 bg-brand-500 text-white text-[10px] font-semibold rounded-lg disabled:opacity-50 active:scale-[0.98]">
                    {posting ? "..." : "Reply"}
                  </button>
                </div>
              )}
            </div>
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
