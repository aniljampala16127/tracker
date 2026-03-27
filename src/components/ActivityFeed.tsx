"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { STEPS } from "@/lib/constants";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
  const date = new Date(dateStr);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
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

/** Notification bell with count of updates in last 24h */
export function NotificationBell({ count }: { count: number }) {
  return (
    <div className="relative w-8 h-8 rounded-lg flex items-center justify-center text-sand-500 hover:text-sand-800 hover:bg-sand-100 transition-all cursor-pointer">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </div>
  );
}

/** Full activity feed panel */
export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchActivities = useCallback(async () => {
    // Get recent step_events joined with applications
    const { data } = await supabase
      .from("step_events")
      .select("id, step_id, event_date, created_at, application_id, applications(initials, country_origin)")
      .order("created_at", { ascending: false })
      .limit(30);

    if (data) {
      const items: ActivityItem[] = data.map((d: any) => ({
        id: d.id,
        app_initials: d.applications?.initials || "?",
        app_country: d.applications?.country_origin || "",
        step_id: d.step_id,
        event_date: d.event_date,
        created_at: d.created_at,
      }));
      setActivities(items);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  // Count updates in last 24h
  const recentCount = activities.filter(a => {
    const diff = Date.now() - new Date(a.created_at).getTime();
    return diff < 24 * 60 * 60 * 1000;
  }).length;

  if (loading) return null;

  return { activities, recentCount };
}

/** Activity feed dropdown panel */
export function ActivityPanel() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const fetchActivities = useCallback(async () => {
    const { data } = await supabase
      .from("step_events")
      .select("id, step_id, event_date, created_at, application_id, applications(initials, country_origin)")
      .order("created_at", { ascending: false })
      .limit(30);

    if (data) {
      setActivities(data.map((d: any) => ({
        id: d.id,
        app_initials: d.applications?.initials || "?",
        app_country: d.applications?.country_origin || "",
        step_id: d.step_id,
        event_date: d.event_date,
        created_at: d.created_at,
      })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const recentCount = activities.filter(a => {
    return Date.now() - new Date(a.created_at).getTime() < 24 * 60 * 60 * 1000;
  }).length;

  // Non-submitted activities (actual updates)
  const updates = activities.filter(a => a.step_id !== "submitted");
  const newEntries = activities.filter(a => a.step_id === "submitted");

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}>
        <NotificationBell count={recentCount} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-sand-200 rounded-xl shadow-xl z-50 max-h-[70vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-sand-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-sand-900">Recent Activity</h3>
              {recentCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-semibold">
                  {recentCount} in 24h
                </span>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Step updates */}
              {updates.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <div className="text-[9px] font-semibold text-sand-400 uppercase tracking-wider mb-2">Milestones</div>
                  {updates.map((a) => {
                    const isRecent = Date.now() - new Date(a.created_at).getTime() < 24 * 60 * 60 * 1000;
                    return (
                      <div key={a.id} className={`flex items-start gap-2.5 py-2 ${isRecent ? "bg-brand-50/30 -mx-4 px-4 rounded" : ""}`}>
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d={stepIcon(a.step_id)} />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-sand-900">
                            <span className="font-semibold">{a.app_initials}</span>
                            <span className="text-sand-500"> reached </span>
                            <span className="font-semibold text-brand-600">{stepLabel(a.step_id)}</span>
                          </div>
                          <div className="text-[10px] text-sand-400">
                            {a.app_country} · {timeAgo(a.created_at)}
                          </div>
                        </div>
                        {isRecent && (
                          <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New entries */}
              {newEntries.length > 0 && (
                <div className="px-4 pt-3 pb-2 border-t border-sand-100">
                  <div className="text-[9px] font-semibold text-sand-400 uppercase tracking-wider mb-2">New Entries</div>
                  {newEntries.slice(0, 10).map((a) => {
                    const isRecent = Date.now() - new Date(a.created_at).getTime() < 24 * 60 * 60 * 1000;
                    return (
                      <div key={a.id} className="flex items-center gap-2.5 py-1.5">
                        <div className="w-5 h-5 rounded-full bg-sand-100 flex items-center justify-center flex-shrink-0">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8A8880" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M12 5V19M5 12H19" />
                          </svg>
                        </div>
                        <div className="text-xs text-sand-600">
                          <span className="font-medium text-sand-800">{a.app_initials}</span> · {a.app_country}
                        </div>
                        {isRecent && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />}
                        <span className="text-[10px] text-sand-400 ml-auto">{timeAgo(a.created_at)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {activities.length === 0 && (
                <div className="px-4 py-8 text-center text-sand-400 text-xs">No activity yet</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
