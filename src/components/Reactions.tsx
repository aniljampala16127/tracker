"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const EMOJIS = ["🎉", "❤️", "🙏", "🍁"];
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
      // Remove reaction
      await supabase
        .from("reactions")
        .delete()
        .eq("application_id", applicationId)
        .eq("step_id", stepId)
        .eq("browser_id", browserId);
      setMyReaction(null);
    } else {
      // Remove old reaction if exists
      if (myReaction) {
        await supabase
          .from("reactions")
          .delete()
          .eq("application_id", applicationId)
          .eq("step_id", stepId)
          .eq("browser_id", browserId);
      }
      // Add new
      await supabase.from("reactions").insert({
        application_id: applicationId,
        step_id: stepId,
        emoji,
        browser_id: browserId,
      });
      setMyReaction(emoji);
    }

    await fetchReactions();
    setLoading(false);
  };

  const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

  if (compact) {
    // Just show total count as a small badge
    return totalReactions > 0 ? (
      <span className="text-[9px] text-sand-400 flex items-center gap-0.5">
        🎉 {totalReactions}
      </span>
    ) : null;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EMOJIS.map((emoji) => {
        const count = counts[emoji] || 0;
        const isActive = myReaction === emoji;
        return (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            disabled={loading}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
              isActive
                ? "bg-brand-100 border border-brand-300 scale-110"
                : count > 0
                ? "bg-sand-50 border border-sand-200 hover:bg-sand-100"
                : "bg-transparent border border-transparent hover:bg-sand-50 hover:border-sand-200 opacity-50 hover:opacity-100"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className={`text-[10px] font-semibold ${isActive ? "text-brand-700" : "text-sand-500"}`}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Small inline reactions for table rows — just shows counts */
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
    <span className="text-[9px] ml-1 text-sand-400">🎉{total}</span>
  );
}
