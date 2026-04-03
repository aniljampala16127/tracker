"use client";

import { useState, useEffect, useCallback } from "react";
import { Application } from "@/lib/types";
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

interface ActivityItem {
  id: string;
  app_initials: string;
  app_country: string;
  step_id: string;
  event_date: string;
  created_at: string;
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
    <div className="relative w-8 h-8 rounded-lg flex items-center justify-center text-sand-500 hover:text-sand-800 hover:bg-sand-100 transition-all cursor-pointer">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [lastRead, setLastRead] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { setLastRead(getLastReadTime()); }, []);

  const fetchApps = useCallback(async () => {
    const res = await fetch("/api/applications");
    const data = await res.json();
    if (Array.isArray(data)) setApps(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // Find user's app
  const myApp = apps.find(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash) || null;
  const cohortIds = getCohortIds(apps, myApp);
  const hasCohort = cohortIds.size > 0;

  // Build activity from cohort apps only
  const activities: ActivityItem[] = [];
  apps.forEach(a => {
    if (!cohortIds.has(a.id)) return;
    (a.step_events || []).forEach(e => {
      if (e.step_id === "submitted") return; // skip new entries from cohort
      activities.push({
        id: e.id,
        app_initials: a.initials,
        app_country: a.country_origin,
        step_id: e.step_id,
        event_date: e.event_date,
        created_at: e.created_at,
      });
    });
  });
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
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-sand-200 rounded-xl shadow-xl z-50 max-h-[70vh] overflow-hidden flex flex-col panel-enter">
            {/* Header */}
            <div className="px-4 py-3 border-b border-sand-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-sand-900">Your Cohort</h3>
                <p className="text-[9px] text-sand-400">{hasCohort ? `${cohortIds.size} people submitted your week` : "Add your app to see cohort activity"}</p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && !showAll && (
                  <button onClick={handleMarkRead}
                    className="text-[10px] px-2 py-0.5 rounded-full text-brand-600 hover:bg-brand-50 font-medium transition-colors">
                    Mark all read
                  </button>
                )}
                {activities.length > 0 && (
                  <button onClick={() => setShowAll(!showAll)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-sand-100 text-sand-600 font-medium hover:bg-sand-200 transition-colors">
                    {showAll ? "New only" : "Show all"}
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* No cohort */}
              {!hasCohort && (
                <div className="px-4 py-10 text-center">
                  <p className="text-xs text-sand-500">Add your application to see updates from people who submitted the same week as you.</p>
                </div>
              )}

              {/* No new notifications */}
              {hasCohort && displayActivities.length === 0 && !showAll && (
                <div className="px-4 py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8880" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17L4 12" />
                    </svg>
                  </div>
                  <p className="text-xs text-sand-500">No new cohort updates!</p>
                  <button onClick={() => setShowAll(true)}
                    className="text-[10px] text-brand-600 font-medium mt-1 hover:underline">
                    View past activity
                  </button>
                </div>
              )}

              {hasCohort && displayActivities.length === 0 && showAll && (
                <div className="px-4 py-8 text-center text-sand-400 text-xs">No cohort milestones yet</div>
              )}

              {/* Cohort milestones */}
              {displayActivities.length > 0 && (
                <div className="px-4 pt-3 pb-2">
                  {displayActivities.slice(0, 20).map((a) => {
                    const isUnread = new Date(a.created_at).getTime() > lastRead;
                    return (
                      <div key={a.id} className={`flex items-start gap-2.5 py-2 transition-colors ${isUnread ? "bg-brand-50/40 -mx-4 px-4 rounded" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isUnread ? "bg-brand-500" : "bg-brand-100"}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isUnread ? "white" : "#2D6A4F"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d={stepIcon(a.step_id)} />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-sand-900">
                            <span className="font-semibold">{a.app_initials}</span>
                            <span className="text-sand-500"> received </span>
                            <span className={`font-semibold ${isUnread ? "text-brand-600" : "text-sand-700"}`}>{stepLabel(a.step_id)}</span>
                            {a.event_date && <span className="text-sand-500"> on {fmt(a.event_date)}</span>}
                          </div>
                          <div className="text-[10px] text-sand-400">{a.app_country} · {timeAgo(a.created_at)}</div>
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
