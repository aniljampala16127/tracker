"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLORS = [
  "text-brand-600",
  "text-purple-600",
  "text-orange-600",
  "text-pink-600",
  "text-teal-600",
  "text-blue-600",
  "text-red-500",
  "text-emerald-600",
];

const BG_COLORS = [
  "bg-brand-100",
  "bg-purple-100",
  "bg-orange-100",
  "bg-pink-100",
  "bg-teal-100",
  "bg-blue-100",
  "bg-red-100",
  "bg-emerald-100",
];

function nameToColor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COLORS.length;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

const NAME_KEY = "sponsortrack-chat-name";

export default function DiscussionsPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Load saved name
  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) {
      setDisplayName(saved);
    } else {
      setShowNameInput(true);
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);

    if (data) setMessages(data as Message[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !displayName.trim()) return;

    setSending(true);
    await supabase.from("messages").insert({
      display_name: displayName.trim(),
      body: body.trim(),
    });

    setBody("");
    setSending(false);
    inputRef.current?.focus();
  };

  const handleSetName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    localStorage.setItem(NAME_KEY, displayName.trim());
    setShowNameInput(false);
    inputRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sand-400 text-sm">
        Loading discussions...
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand-500"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <h1 className="text-xl font-bold text-sand-900">Discussion</h1>
          </div>
          <p className="text-xs text-sand-500 mt-0.5">
            Ask questions, share tips, help each other out — live chat
          </p>
        </div>
        {!showNameInput && displayName && (
          <button
            onClick={() => setShowNameInput(true)}
            className="text-xs text-sand-400 hover:text-sand-700 transition-colors flex items-center gap-1"
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold",
                BG_COLORS[nameToColor(displayName)],
                COLORS[nameToColor(displayName)]
              )}
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
            {displayName}
          </button>
        )}
      </div>

      {/* Name input overlay */}
      {showNameInput && (
        <div className="bg-white border border-sand-200 rounded-xl p-4 mb-3">
          <form onSubmit={handleSetName} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider block mb-1">
                Your display name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-lg border border-sand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                placeholder="e.g. Anil, PR_India_Feb26, etc."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={30}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!displayName.trim()}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-600 transition-colors"
            >
              Set Name
            </button>
          </form>
          <p className="text-[11px] text-sand-400 mt-2">
            Pick any name — no account needed. Saved in your browser.
          </p>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-white border border-sand-200 rounded-xl p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-sand-400 text-sm">
            <p className="mb-1">No messages yet</p>
            <p className="text-xs">
              Be the first to start a conversation about your sponsorship
              journey!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const colorIdx = nameToColor(msg.display_name);
            return (
              <div key={msg.id} className="flex gap-2.5">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5",
                    BG_COLORS[colorIdx],
                    COLORS[colorIdx]
                  )}
                >
                  {msg.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        COLORS[colorIdx]
                      )}
                    >
                      {msg.display_name}
                    </span>
                    <span className="text-[10px] text-sand-300">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-sand-800 leading-relaxed break-words">
                    {msg.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSend}
        className="mt-3 flex gap-2 items-center"
      >
        <input
          ref={inputRef}
          type="text"
          className="flex-1 px-4 py-2.5 rounded-xl border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 placeholder:text-sand-400"
          placeholder={
            displayName
              ? "Type a message..."
              : "Set your name above first..."
          }
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          disabled={!displayName || sending}
        />
        <button
          type="submit"
          disabled={!body.trim() || !displayName || sending}
          className="px-4 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-brand-600 transition-colors flex items-center gap-1.5"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
          Send
        </button>
      </form>
    </div>
  );
}
