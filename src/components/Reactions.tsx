"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const REACTIONS = [
  { emoji: "celebrate", label: "Congrats", svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' },
  { emoji: "heart", label: "Love", svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' },
  { emoji: "support", label: "Support", svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11L12 6L17 11"/><path d="M7 17L12 12L17 17"/></svg>' },
  { emoji: "maple", label: "Canada", svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.5 8.5L3 9L7.5 13L6 20L12 16.5L18 20L16.5 13L21 9L14.5 8.5Z"/></svg>' },
];

const BROWSER_ID_KEY = "sponsortrack-browser-id";

function getBrowserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(BROWSER_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(BROWSER_ID_KEY, id);
  }
  return id;
}

interface ReactionCounts {
  [emoji: string]: number;
}

interface ReactionsProps {
  applicationId: string;
  stepId: string;
  compact?: boolean;
}

export function Reactions({ applicationId, stepId, compact }: ReactionsProps) {
  const [counts, setCounts] = useState<ReactionCounts>({});
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const browserId = getBrowserId();

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase
      .from("reactions")
      .select("emoji, browser_id")
      .eq("application_id", applicationId)
      .eq("step_id", stepId);

    if (data) {
      const c: ReactionCounts = {};
      let mine: string | null = null;
      data.forEach((r: any) => {
        c[r.emoji] = (c[r.emoji] || 0) + 1;
        if (r.browser_id === browserId) mine = r.emoji;
      });
      setCounts(c);
      setMyReaction(mine);
    }
  }, [applicationId, stepId, supabase, browserId]);

  useEffect(() => { fetchReactions(); }, [fetchReactions]);

  const handleReact = async (emoji: string) => {
    if (loading) return;
    setLoading(true);

    if (myReaction === emoji) {
      await supabase.from("reactions").delete()
        .eq("application_id", applicationId).eq("step_id", stepId).eq("browser_id", browserId);
      setMyReaction(null);
    } else {
      if (myReaction) {
        await supabase.from("reactions").delete()
          .eq("application_id", applicationId).eq("step_id", stepId).eq("browser_id", browserId);
      }
      await supabase.from("reactions").insert({
        application_id: applicationId, step_id: stepId, emoji, browser_id: browserId,
      });
      setMyReaction(emoji);
    }

    await fetchReactions();
    setLoading(false);
  };

  const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

  if (compact) {
    return totalReactions > 0 ? (
      <span className="flex items-center gap-0.5 text-[9px] text-brand-500">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        {totalReactions}
      </span>
    ) : null;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {REACTIONS.map((r) => {
        const count = counts[r.emoji] || 0;
        const isActive = myReaction === r.emoji;
        return (
          <button
            key={r.emoji}
            onClick={() => handleReact(r.emoji)}
            disabled={loading}
            title={r.label}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs transition-all ${
              isActive
                ? "bg-brand-100 border border-brand-300 shadow-sm"
                : count > 0
                ? "bg-sand-50 border border-sand-200 hover:bg-sand-100"
                : "bg-transparent border border-transparent hover:bg-sand-50 hover:border-sand-200 opacity-40 hover:opacity-100"
            }`}
          >
            <span
              className={isActive ? "text-brand-600" : "text-sand-500"}
              dangerouslySetInnerHTML={{ __html: r.svg }}
            />
            {count > 0 && (
              <span className={`text-[10px] font-semibold ${isActive ? "text-brand-700" : "text-sand-500"}`}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ReactionsBadge({ applicationId }: { applicationId: string }) {
  const [total, setTotal] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("reactions")
      .select("id", { count: "exact", head: true })
      .eq("application_id", applicationId)
      .then(({ count }) => { if (count) setTotal(count); });
  }, [applicationId, supabase]);

  if (total === 0) return null;

  return (
    <span className="inline-flex items-center gap-0.5 ml-1 text-[9px] text-brand-500">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      {total}
    </span>
  );
}
