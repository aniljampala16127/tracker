"use client";

import { useState, useEffect, useCallback } from "react";
import { Application, Comment } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap } from "@/lib/utils";
import { getSavedPinHash } from "@/lib/pin";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const LAST_READ_KEY = "sponsortrack-notif-read";

function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function getLastReadTime(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(LAST_READ_KEY) || "0", 10);
}

function markAllRead() {
  localStorage.setItem(LAST_READ_KEY, Date.now().toString());
}

type ActivityKind = "step" | "reply";

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  // common
  created_at: string;
  // step
  app_initials?: string;
  app_country?: string;
  app_sub_date?: string;
  step_id?: string;
  event_date?: string;
  // reply
  author_name?: string;
  text?: string;
  // where to deep-link
  href?: string;
  context?: string; // "on your entry" / "in May 2025 cohort"
}

function stepLabel(stepId: string): string {
  return STEPS.find(s => s.id === stepId)?.label || stepId;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// "2024-05" → "may-2024" — matches the subreddit-style pill used elsewhere.
function monthSlug(key: string): string {
  const [y, m] = key.split("-");
  return `${(MONTHS[parseInt(m) - 1] || "").toLowerCase()}-${y}`;
}

function stepIcon(stepId: string): string {
  const icons: Record<string, string> = {
    submitted: "M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z",
    aor: "M9 12L11 14L15 10M3 3H21V21H3Z",
    bil: "M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z",
    sponsor_eligibility: "M9 12L11 14L15 10M12 22C17.5 22 22 17.5 22 12S17.5 2 12 2S2 6.5 2 12S6.5 22 12 22Z",
    medical: "M12 4V20M4 12H20",
    ecopr: "M3 21H21M5 21V7L12 3L19 7V21",
  };
  return icons[stepId] || icons.submitted;
}

// Get cohort app IDs (submitted same week as user)
function getCohortIds(apps: Application[], myApp: Application | null): Set<string> {
  if (!myApp) return new Set();
  const mySteps = buildStepsMap(myApp.step_events || []);
  if (!mySteps.submitted) return new Set();

  const mySub = new Date(mySteps.submitted + "T00:00:00");
  const myDay = mySub.getDay();
  const weekStart = new Date(mySub);
  weekStart.setDate(weekStart.getDate() - myDay);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const ids = new Set<string>();
  apps.forEach(a => {
    if (a.id === myApp.id) return;
    const s = buildStepsMap(a.step_events || []);
    if (!s.submitted) return;
    const sub = new Date(s.submitted + "T00:00:00");
    if (sub >= weekStart && sub <= weekEnd) ids.add(a.id);
  });
  return ids;
}

export function NotificationBell({ count }: { count: number }) {
  return (
    <div className="group relative w-8 h-8 rounded-lg flex items-center justify-center text-sand-500 hover:text-sand-800 hover:bg-sand-100 transition-all cursor-pointer">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="t-icon-bell-ring">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-in">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </div>
  );
}

export function ActivityPanel() {
  const [apps, setApps] = useState<Application[]>([]);
  const [entryComments, setEntryComments] = useState<Comment[]>([]);
  const [cohortComments, setCohortComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [lastRead, setLastRead] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { setLastRead(getLastReadTime()); }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [appsRes, entryCommentsRes, cohortCommentsRes] = await Promise.all([
        fetch("/api/applications"),
        // Both modes added to /api/comments in earlier commit — see the
        // route file for the modes table.
        fetch("/api/comments?type=entry"),
        fetch("/api/comments"),
      ]);
      const appsData = await appsRes.json();
      const entryData = await entryCommentsRes.json();
      const cohortData = await cohortCommentsRes.json();
      if (Array.isArray(appsData)) setApps(appsData);
      if (Array.isArray(entryData)) setEntryComments(entryData);
      if (Array.isArray(cohortData)) setCohortComments(cohortData);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Find user's apps + cohort
  const myApp = apps.find(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash) || null;
  const myAppIds = new Set(apps.filter(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash).map(a => a.id));
  const cohortIds = getCohortIds(apps, myApp);
  const hasCohort = cohortIds.size > 0;
  const myPinHash = myApp?.pin_hash || null;

  // Build the unified activity feed:
  //   1) cohort step milestones (when someone in your week hits AOR etc.)
  //   2) replies on your entry
  //   3) replies to your cohort posts
  const activities: ActivityItem[] = [];

  // 1) Cohort step milestones
  apps.forEach(a => {
    if (!cohortIds.has(a.id)) return;
    const s = buildStepsMap(a.step_events || []);
    (a.step_events || []).forEach(e => {
      if (e.step_id === "submitted") return;
      // step_events no longer exposes `id` — use a composite key.
      activities.push({
        id: `step-${a.id}-${e.step_id}`,
        kind: "step",
        app_initials: a.initials,
        app_country: a.country_origin,
        app_sub_date: s.submitted || "",
        step_id: e.step_id,
        event_date: e.event_date,
        created_at: e.created_at,
      });
    });
  });

  // 2) Replies on YOUR entry (someone else posted a comment on your app)
  if (myPinHash && myAppIds.size > 0) {
    entryComments.forEach(c => {
      if (!c.application_id || !myAppIds.has(c.application_id)) return;
      if (c.pin_hash === myPinHash) return; // your own comment
      const app = apps.find(a => a.id === c.application_id);
      activities.push({
        id: `reply-entry-${c.id}`,
        kind: "reply",
        created_at: c.created_at,
        author_name: c.author_name,
        text: c.text,
        href: "/me",
        context: app ? `on your entry (${app.initials})` : "on your entry",
      });
    });
  }

  // 3) Replies to your cohort posts (someone replied to a top-level
  //    cohort post you authored)
  if (myPinHash) {
    cohortComments.forEach(c => {
      if (!c.parent_id) return;                // only replies, not top-level
      if (c.pin_hash === myPinHash) return;    // your own reply
      const parent = cohortComments.find(p => p.id === c.parent_id);
      if (!parent || parent.pin_hash !== myPinHash) return;
      activities.push({
        id: `reply-cohort-${c.id}`,
        kind: "reply",
        created_at: c.created_at,
        author_name: c.author_name,
        text: c.text,
        href: "/community",
        context: parent.cohort_month ? `in r/${monthSlug(parent.cohort_month)}` : "in Community",
      });
    });
  }

  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const unreadActivities = activities.filter(a => new Date(a.created_at).getTime() > lastRead);
  const unreadCount = unreadActivities.length;

  const handleOpen = () => { setOpen(!open); };
  const handleMarkRead = () => { markAllRead(); setLastRead(Date.now()); };
  const handleClose = () => { markAllRead(); setLastRead(Date.now()); setOpen(false); setShowAll(false); };

  const displayActivities = showAll ? activities : unreadActivities;

  if (loading) return <div className="w-8 h-8" />;

  return (
    <div className="relative">
      <button onClick={handleOpen}>
        <NotificationBell count={unreadCount} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-sand-200 rounded-2xl shadow-xl z-50 max-h-[70vh] overflow-hidden flex flex-col panel-enter">
            {/* Header */}
            <div className="px-4 py-3 border-b border-sand-100 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-0.5">Notifications</p>
                <p className="text-[11px] text-sand-500 nums-tabular truncate">
                  {hasCohort ? <><span className="font-bold text-sand-700">{cohortIds.size}</span> people submitted your week · replies + step milestones</> : "Add your app to see cohort activity and replies"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {unreadCount > 0 && !showAll && (
                  <button onClick={handleMarkRead}
                    className="text-[10px] px-2 py-1 rounded-md text-brand-600 hover:bg-brand-500/10 font-semibold uppercase tracking-wider transition-colors">
                    Mark read
                  </button>
                )}
                {activities.length > 0 && (
                  <button onClick={() => setShowAll(!showAll)}
                    className="text-[10px] px-2 py-1 rounded-md text-sand-600 hover:text-sand-900 hover:bg-sand-100 font-semibold uppercase tracking-wider transition-colors">
                    {showAll ? "New only" : "Show all"}
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* No cohort + no activity at all */}
              {!hasCohort && activities.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="text-[12px] text-sand-500 leading-relaxed">Add your application to see step milestones from people who submitted the same week, and to be notified when someone replies to your posts.</p>
                </div>
              )}

              {/* No NEW notifications */}
              {(hasCohort || activities.length > 0) && displayActivities.length === 0 && !showAll && (
                <div className="px-4 py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-brand-500/15 flex items-center justify-center mx-auto mb-2 text-brand-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17L4 12" />
                    </svg>
                  </div>
                  <p className="text-[12px] text-sand-700 font-semibold">You&apos;re all caught up</p>
                  {activities.length > 0 && (
                    <button onClick={() => setShowAll(true)}
                      className="text-[11px] text-brand-600 font-semibold mt-1 hover:text-brand-700 transition-colors">
                      View past activity <span aria-hidden>→</span>
                    </button>
                  )}
                </div>
              )}

              {(hasCohort || activities.length > 0) && displayActivities.length === 0 && showAll && (
                <div className="px-4 py-8 text-center text-sand-400 text-[12px] italic">No activity yet</div>
              )}

              {/* Unified feed: cohort milestones + replies */}
              {displayActivities.length > 0 && (
                <div className="px-4 pt-3 pb-2 nums-tabular">
                  {displayActivities.slice(0, 30).map((a) => {
                    const isUnread = new Date(a.created_at).getTime() > lastRead;

                    if (a.kind === "reply") {
                      const inner = (
                        <div className={`flex items-start gap-2.5 py-2 transition-colors ${isUnread ? "bg-brand-500/10 -mx-4 px-4 rounded-md" : ""}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isUnread ? "bg-brand-500 shadow-sm" : "bg-brand-500/15"}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isUnread ? "text-white" : "text-brand-600"}>
                              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] text-sand-700 leading-snug">
                              <span className={`font-bold ${isUnread ? "text-brand-700" : "text-sand-900"}`}>{a.author_name}</span>
                              <span className="text-sand-500"> replied </span>
                              {a.context && <span className="text-sand-500">{a.context}</span>}
                            </div>
                            {a.text && (
                              <p className="text-[11px] text-sand-500 truncate mt-0.5 italic">&ldquo;{a.text}&rdquo;</p>
                            )}
                            <div className="text-[10px] text-sand-400 mt-0.5">{timeAgo(a.created_at)}</div>
                          </div>
                          {isUnread && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2 animate-pulse" />}
                        </div>
                      );
                      // Reply rows are clickable links — close the panel and
                      // jump to the relevant surface.
                      return a.href ? (
                        <a key={a.id} href={a.href} onClick={handleClose} className="block hover:bg-sand-50/60 -mx-4 px-4 rounded-md transition-colors">
                          {inner}
                        </a>
                      ) : <div key={a.id}>{inner}</div>;
                    }

                    // Step milestone
                    return (
                      <div key={a.id} className={`flex items-start gap-2.5 py-2 transition-colors ${isUnread ? "bg-brand-500/10 -mx-4 px-4 rounded-md" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isUnread ? "bg-brand-500 shadow-sm" : "bg-brand-500/15"}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isUnread ? "text-white" : "text-brand-600"}>
                            <path d={stepIcon(a.step_id || "")} />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-sand-700 leading-snug">
                            <span className="font-bold text-sand-900">{a.app_initials}</span>
                            <span className="text-sand-500"> received </span>
                            <span className={`font-bold ${isUnread ? "text-brand-700" : "text-sand-800"}`}>{stepLabel(a.step_id || "")}</span>
                            {a.event_date && <span className="text-sand-500"> on {fmt(a.event_date)}</span>}
                          </div>
                          <div className="text-[10px] text-sand-400 mt-0.5">{a.app_country} · Sub {fmt(a.app_sub_date || "")} · {timeAgo(a.created_at)}</div>
                        </div>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2 animate-pulse" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
