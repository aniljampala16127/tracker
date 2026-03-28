"use client";

import { useMemo, useEffect, useState } from "react";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const RANK_KEY = "sponsortrack-rank-history";

interface RankSnapshot {
  position: number;
  totalWaiting: number;
  timestamp: number;
}

function getRankHistory(appId: string): RankSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${RANK_KEY}-${appId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRankSnapshot(appId: string, position: number, totalWaiting: number) {
  const history = getRankHistory(appId);
  const now = Date.now();
  // Only save once per day
  const today = new Date().toISOString().split("T")[0];
  const lastEntry = history[history.length - 1];
  if (lastEntry) {
    const lastDay = new Date(lastEntry.timestamp).toISOString().split("T")[0];
    if (lastDay === today) return; // Already saved today
  }
  history.push({ position, totalWaiting, timestamp: now });
  // Keep last 30 entries max
  const trimmed = history.slice(-30);
  localStorage.setItem(`${RANK_KEY}-${appId}`, JSON.stringify(trimmed));
}

interface WeeklyRankChangeProps {
  app: Application;
  allApps: Application[];
}

export function WeeklyRankChange({ app, allApps }: WeeklyRankChangeProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = useMemo(() => {
    const stepsMap = buildStepsMap(app.step_events || []);
    const hasAor = !!stepsMap.aor;
    if (hasAor) return null;

    const streamApps = allApps.filter(a => a.stream === app.stream);
    const waitingApps = streamApps
      .filter(a => !(a.step_events || []).some(e => e.step_id === "aor"))
      .map(a => {
        const s = buildStepsMap(a.step_events || []);
        return { id: a.id, subDate: s.submitted || "" };
      })
      .filter(a => a.subDate)
      .sort((a, b) => a.subDate.localeCompare(b.subDate));

    const myIdx = waitingApps.findIndex(a => a.id === app.id);
    const position = myIdx + 1;
    const totalWaiting = waitingApps.length;

    return { position, totalWaiting };
  }, [app, allApps]);

  // Save current rank & compute change
  const rankChange = useMemo(() => {
    if (!data || !mounted) return null;

    saveRankSnapshot(app.id, data.position, data.totalWaiting);
    const history = getRankHistory(app.id);
    if (history.length < 2) return null;

    // Compare with 7 days ago (or earliest available)
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oldSnapshot = history.find(h => h.timestamp <= weekAgo) || history[0];
    const currentSnapshot = history[history.length - 1];

    if (!oldSnapshot || oldSnapshot.timestamp === currentSnapshot.timestamp) return null;

    const change = oldSnapshot.position - currentSnapshot.position; // positive = moved up
    const daysTracked = Math.floor((currentSnapshot.timestamp - oldSnapshot.timestamp) / 86400000);

    return { change, daysTracked, oldPosition: oldSnapshot.position };
  }, [data, app.id, mounted]);

  if (!data || !mounted) return null;

  return (
    <div className="flex items-center gap-2">
      {rankChange && rankChange.change !== 0 ? (
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
          rankChange.change > 0
            ? "bg-brand-50 text-brand-600"
            : "bg-error-light text-error"
        }`}>
          {rankChange.change > 0 ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 15L12 9L6 15" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 9L12 15L18 9" />
            </svg>
          )}
          {Math.abs(rankChange.change)} spot{Math.abs(rankChange.change) > 1 ? "s" : ""} this week
        </div>
      ) : rankChange && rankChange.change === 0 ? (
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-sand-100 text-sand-500">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12H19" />
          </svg>
          Same position
        </div>
      ) : null}
    </div>
  );
}
