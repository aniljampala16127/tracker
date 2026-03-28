"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Application } from "@/lib/types";
import { buildStepsMap, daysBetween } from "@/lib/utils";
import { getSavedPinHash } from "@/lib/pin";
import { MeSkeleton } from "@/components/Skeletons";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function fmtFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getWeekRange(dateStr: string): { start: Date; end: Date; label: string } {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const label = `${fmt(start.toISOString().split("T")[0])} – ${fmt(end.toISOString().split("T")[0])}, ${end.getFullYear()}`;
  return { start, end, label };
}

export default function CohortPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .order("created_at", { ascending: true });
    if (data) setApps(data as Application[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const myApp = apps.find(a => a.id === id);
  const mySteps = myApp ? buildStepsMap(myApp.step_events || []) : null;
  const mySubmitted = mySteps?.submitted;
  const isMyEntry = myApp?.pin_hash && getSavedPinHash(myApp.id) === myApp.pin_hash;

  const week = mySubmitted ? getWeekRange(mySubmitted) : null;

  const cohort = useMemo(() => {
    if (!week || !mySubmitted) return [];
    return apps
      .filter(a => {
        const s = buildStepsMap(a.step_events || []);
        if (!s.submitted) return false;
        const d = new Date(s.submitted + "T00:00:00");
        return d >= week.start && d <= week.end;
      })
      .map(a => {
        const s = buildStepsMap(a.step_events || []);
        const today = new Date().toISOString().split("T")[0];
        return {
          id: a.id,
          initials: a.initials,
          country: a.country_origin,
          stream: a.stream,
          submitted: s.submitted!,
          aorDate: s.aor || null,
          currentStep: a.current_step,
          daysWaiting: s.submitted ? daysBetween(s.submitted, s.aor || today) : 0,
          isMe: a.id === id,
        };
      })
      .sort((a, b) => a.submitted.localeCompare(b.submitted));
  }, [apps, week, mySubmitted, id]);

  const gotAor = cohort.filter(c => c.aorDate);
  const waiting = cohort.filter(c => !c.aorDate);

  if (loading) return <MeSkeleton />;

  if (!myApp || !mySubmitted || !week) {
    return (
      <div className="py-12 text-center">
        <p className="text-sand-500 mb-4">Application not found</p>
        <button onClick={() => router.push("/me")} className="text-sm text-brand-500 font-medium">Back to My App</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => router.push("/me")}
        className="flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-800 transition-colors mb-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19L5 12L12 5"/></svg>
        Back
      </button>

      {/* Header */}
      <div className="bg-white border border-sand-200 rounded-2xl p-5 mb-4">
        <div className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider mb-1">Your Submission Week</div>
        <h1 className="text-lg font-bold text-sand-900 mb-1">{week.label}</h1>
        <p className="text-xs text-sand-500 mb-4">
          {cohort.length} {cohort.length === 1 ? "person" : "people"} submitted this week
        </p>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-brand-50 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-brand-600">{gotAor.length}</div>
            <div className="text-[9px] text-brand-500 font-medium">Got AOR</div>
          </div>
          <div className="bg-warn-light rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-warn-dark">{waiting.length}</div>
            <div className="text-[9px] text-warn-dark font-medium">Waiting</div>
          </div>
          <div className="bg-sand-50 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-sand-700">{cohort.length > 0 ? Math.round((gotAor.length / cohort.length) * 100) : 0}%</div>
            <div className="text-[9px] text-sand-500 font-medium">AOR Rate</div>
          </div>
        </div>
      </div>

      {/* Got AOR */}
      {gotAor.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider mb-2 px-1">
            Got AOR ({gotAor.length})
          </div>
          <div className="space-y-1.5">
            {gotAor.map(person => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      )}

      {/* Waiting */}
      {waiting.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-semibold text-warn-dark uppercase tracking-wider mb-2 px-1">
            Waiting for AOR ({waiting.length})
          </div>
          <div className="space-y-1.5">
            {waiting.map(person => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PersonCard({ person }: { person: {
  id: string; initials: string; country: string; stream: string;
  submitted: string; aorDate: string | null; daysWaiting: number; isMe: boolean;
}}) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
      person.isMe
        ? "bg-brand-50 border-2 border-brand-300"
        : "bg-white border border-sand-200"
    }`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        person.isMe ? "bg-brand-500 text-white" : "bg-sand-100 text-sand-600"
      }`}>
        {person.initials.slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-sand-900">{person.initials}</span>
          {person.isMe && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-500 text-white font-bold">YOU</span>
          )}
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${
            person.stream === "Outland" ? "bg-brand-100 text-brand-700" : "bg-warn-light text-warn-dark"
          }`}>
            {person.stream}
          </span>
        </div>
        <div className="text-[11px] text-sand-500">
          {person.country} · Sub {fmt(person.submitted)}
        </div>
      </div>

      {/* Status */}
      <div className="text-right flex-shrink-0">
        {person.aorDate ? (
          <>
            <div className="flex items-center gap-1 justify-end">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12"/></svg>
              <span className="text-xs font-semibold text-brand-600">AOR</span>
            </div>
            <div className="text-[10px] text-sand-400">{fmt(person.aorDate)} · {person.daysWaiting}d</div>
          </>
        ) : (
          <>
            <div className="text-xs font-semibold text-warn-dark">Waiting</div>
            <div className="text-[10px] text-sand-400">Day {person.daysWaiting}</div>
          </>
        )}
      </div>
    </div>
  );
}
