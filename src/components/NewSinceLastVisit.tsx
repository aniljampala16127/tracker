"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap } from "@/lib/utils";
import { Modal } from "@/components/ui";

const LAST_VISIT_KEY = "sponsortrack-last-visit";

function getLastVisit(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(LAST_VISIT_KEY) || "0", 10);
}

function setLastVisit() {
  localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const parsed = new Date(d + "T00:00:00");
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface NewSinceLastVisitProps {
  apps: Application[];
}

type AorRow = { appId: string; initials: string; country: string; submittedDate: string; aorDate: string };
type MilestoneRow = { appId: string; initials: string; country: string; submittedDate: string; step: string; stepId: string; eventDate: string };
type EntryRow = { appId: string; initials: string; country: string; submittedDate: string; createdAt: string };

type ModalKind = "aor" | "milestone" | "entry";

export function NewSinceLastVisit({ apps }: NewSinceLastVisitProps) {
  const router = useRouter();
  const [lastVisit, setLV] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [openKind, setOpenKind] = useState<ModalKind | null>(null);

  useEffect(() => {
    const lv = getLastVisit();
    setLV(lv);
    // Update last visit after a delay so the banner shows first
    const t = setTimeout(() => setLastVisit(), 3000);
    return () => clearTimeout(t);
  }, []);

  const updates = useMemo(() => {
    if (!lastVisit || lastVisit === 0) return null;

    const newAors: AorRow[] = [];
    const newEntries: EntryRow[] = [];
    const milestones: MilestoneRow[] = [];

    apps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      const submitted = s.submitted || "";

      if (new Date(a.created_at).getTime() > lastVisit) {
        newEntries.push({
          appId: a.id,
          initials: a.initials,
          country: a.country_origin,
          submittedDate: submitted,
          createdAt: a.created_at,
        });
      }

      (a.step_events || []).forEach(e => {
        if (e.step_id === "submitted") return;
        if (new Date(e.created_at).getTime() <= lastVisit) return;
        if (e.step_id === "aor") {
          newAors.push({
            appId: a.id,
            initials: a.initials,
            country: a.country_origin,
            submittedDate: submitted,
            aorDate: e.event_date,
          });
        } else {
          const label = STEPS.find(s => s.id === e.step_id)?.label || e.step_id;
          milestones.push({
            appId: a.id,
            initials: a.initials,
            country: a.country_origin,
            submittedDate: submitted,
            step: label,
            stepId: e.step_id,
            eventDate: e.event_date,
          });
        }
      });
    });

    if (newAors.length === 0 && newEntries.length === 0 && milestones.length === 0) return null;

    // Newest first within each category.
    newAors.sort((a, b) => b.aorDate.localeCompare(a.aorDate));
    milestones.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    newEntries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { newAors, newEntries, milestones };
  }, [apps, lastVisit]);

  if (!updates || dismissed) return null;

  const totalUpdates = updates.newAors.length + updates.newEntries.length + updates.milestones.length;

  const go = (appId: string) => {
    setOpenKind(null);
    router.push(`/dashboard/${appId}`);
  };

  const modalRows: { appId: string; initials: string; country: string; submittedDate: string; rightLabel: string; rightDate: string }[] =
    openKind === "aor"
      ? updates.newAors.map(r => ({ appId: r.appId, initials: r.initials, country: r.country, submittedDate: r.submittedDate, rightLabel: "AOR", rightDate: r.aorDate }))
      : openKind === "milestone"
        ? updates.milestones.map(r => ({ appId: r.appId, initials: r.initials, country: r.country, submittedDate: r.submittedDate, rightLabel: r.step, rightDate: r.eventDate }))
        : openKind === "entry"
          ? updates.newEntries.map(r => ({ appId: r.appId, initials: r.initials, country: r.country, submittedDate: r.submittedDate, rightLabel: "Joined", rightDate: r.createdAt.slice(0, 10) }))
          : [];

  const modalTitle = openKind === "aor"
    ? `New AORs · ${updates.newAors.length}`
    : openKind === "milestone"
      ? `Milestones · ${updates.milestones.length}`
      : openKind === "entry"
        ? `New entries · ${updates.newEntries.length}`
        : "";

  return (
    <div className="t-liquid-glass rounded-2xl p-4 mb-4 animate-in relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-md flex items-center justify-center text-sand-400 hover:text-sand-700 hover:bg-sand-100 transition-colors"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18" /><path d="M6 6L18 18" />
        </svg>
      </button>

      <div className="flex items-center gap-2 mb-3 pr-7">
        <div className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
        </div>
        <span className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">
          While you were away
        </span>
        <span className="text-[10px] text-sand-400 nums-tabular ml-auto">
          {totalUpdates} update{totalUpdates > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-1 nums-tabular">
        {updates.newAors.length > 0 && (
          <button
            onClick={() => setOpenKind("aor")}
            className="w-full text-left flex items-center gap-2.5 text-[13px] py-1.5 px-1 -mx-1 rounded-md hover:bg-sand-50 active:bg-sand-100 transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-brand-500/15 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600"><path d="M20 6L9 17L4 12" /></svg>
            </div>
            <span className="text-sand-700 truncate flex-1 min-w-0">
              <span className="font-bold text-brand-700">{updates.newAors.length} new AOR{updates.newAors.length > 1 ? "s" : ""}</span>
              <span className="text-sand-500"> — {updates.newAors.slice(0, 4).map(a => a.initials).join(", ")}{updates.newAors.length > 4 ? ` +${updates.newAors.length - 4} more` : ""}</span>
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sand-300 group-hover:text-brand-500 transition-colors flex-shrink-0">
              <path d="M9 18L15 12L9 6"/>
            </svg>
          </button>
        )}

        {updates.milestones.length > 0 && (
          <button
            onClick={() => setOpenKind("milestone")}
            className="w-full text-left flex items-center gap-2.5 text-[13px] py-1.5 px-1 -mx-1 rounded-md hover:bg-sand-50 active:bg-sand-100 transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-warn/15 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-warn-dark"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" /></svg>
            </div>
            <span className="text-sand-700 truncate flex-1 min-w-0">
              <span className="font-bold text-warn-dark">{updates.milestones.length} milestone{updates.milestones.length > 1 ? "s" : ""}</span>
              <span className="text-sand-500"> — {updates.milestones.slice(0, 3).map(m => `${m.initials} hit ${m.step}`).join(", ")}</span>
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sand-300 group-hover:text-warn-dark transition-colors flex-shrink-0">
              <path d="M9 18L15 12L9 6"/>
            </svg>
          </button>
        )}

        {updates.newEntries.length > 0 && (
          <button
            onClick={() => setOpenKind("entry")}
            className="w-full text-left flex items-center gap-2.5 text-[13px] py-1.5 px-1 -mx-1 rounded-md hover:bg-sand-50 active:bg-sand-100 transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-sand-100 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-sand-600"><path d="M12 5V19M5 12H19" /></svg>
            </div>
            <span className="text-sand-700 truncate flex-1 min-w-0">
              <span className="font-bold">{updates.newEntries.length} new {updates.newEntries.length === 1 ? "entry" : "entries"}</span>
              <span className="text-sand-500"> joined — {updates.newEntries.slice(0, 4).map(e => e.initials).join(", ")}{updates.newEntries.length > 4 ? ` +${updates.newEntries.length - 4} more` : ""}</span>
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sand-300 group-hover:text-sand-700 transition-colors flex-shrink-0">
              <path d="M9 18L15 12L9 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Detail modal */}
      <Modal open={openKind !== null} onClose={() => setOpenKind(null)} title={modalTitle}>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-sand-500 uppercase tracking-[0.06em] px-3 pb-1.5 border-b border-sand-100">
            <span>Entry</span>
            <span>{openKind === "aor" ? "AOR date" : openKind === "milestone" ? "Step / date" : "Joined"}</span>
          </div>
          <div className="max-h-[55vh] overflow-y-auto -mr-2 pr-2">
            {modalRows.map((r, i) => (
              <button
                key={`${r.appId}-${i}`}
                onClick={() => go(r.appId)}
                className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-sand-50 active:bg-sand-100 transition-colors border-b border-sand-50/80 last:border-b-0 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-sand-100 group-hover:bg-brand-500/12 group-hover:text-brand-700 flex items-center justify-center text-[10px] font-bold text-sand-700 shrink-0 transition-colors">
                    {r.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-sand-900 truncate group-hover:text-brand-700 transition-colors">{r.country}</div>
                    <div className="text-[10px] text-sand-400 nums-tabular mt-0.5">Submitted {fmtDate(r.submittedDate)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="text-right">
                    {openKind === "milestone" && (
                      <div className="text-[10px] font-bold text-warn-dark uppercase tracking-wider">{r.rightLabel}</div>
                    )}
                    <div className="text-[12px] font-bold text-sand-900 nums-tabular">{fmtDate(r.rightDate)}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sand-300 group-hover:text-brand-500 transition-colors">
                    <path d="M9 18L15 12L9 6"/>
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
