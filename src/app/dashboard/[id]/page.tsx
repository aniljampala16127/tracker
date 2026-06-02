"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Application, StepId } from "@/lib/types";
import { STEPS, getStepIndex, getNextStep } from "@/lib/constants";
import {
  formatDate, progressPercent, daysBetween, buildStepsMap, estimateCompletion,
} from "@/lib/utils";
import { getSavedPinHash, removeSavedPin, getAnyOwnedPinHash } from "@/lib/pin";
import { toast } from "@/lib/toast";
import { StepTimeline } from "@/components/StepTimeline";
import { PinModal } from "@/components/PinModal";
import { ClaimPinModal } from "@/components/ClaimPinModal";
import { ArrowLeftIcon, TrashIcon, ClockIcon } from "@/components/icons";
import { Button, Avatar, Card, Modal } from "@/components/ui";
import { playMilestoneSound, playSound } from "@/lib/sounds";
import { DetailSkeleton } from "@/components/Skeletons";

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<StepId | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"delete" | StepId | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  const fetchApp = useCallback(async (force = false) => {
    // Use ?id= so the API returns only this one app instead of all 700+.
    // ?t= busts the edge cache after a write so the user sees their own change.
    const qs = new URLSearchParams({ id: String(id) });
    if (force) qs.set("t", String(Date.now()));
    const res = await fetch(`/api/applications?${qs.toString()}`);
    const rows = await res.json();
    const found = Array.isArray(rows) ? rows[0] || null : null;

    if (found) {
      setApp(found);
      if (!found.pin_hash || getSavedPinHash(found.id) === found.pin_hash) {
        setPinVerified(true);
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchApp(); }, [fetchApp]);

  const requirePin = (action: "delete" | StepId) => {
    if (!app) return;
    if (!app.pin_hash) {
      // Unclaimed — prompt to claim first
      setPendingAction(action);
      setShowClaimModal(true);
      return;
    }
    if (pinVerified) {
      if (action === "delete") doDelete();
      else setEditingStep(action);
    } else {
      setPendingAction(action);
      setShowPinModal(true);
    }
  };

  const onPinVerified = () => {
    setPinVerified(true);
    setShowPinModal(false);
    if (pendingAction === "delete") doDelete();
    else if (pendingAction) setEditingStep(pendingAction as StepId);
    setPendingAction(null);
  };

  const markStepDone = async (stepId: StepId, date: string) => {
    if (!app) return;
    if (navigator.vibrate) navigator.vibrate(stepId === "ecopr" ? [12, 30, 12, 30, 20] : 12);
    if (stepId === "ecopr") playSound("complete");
    else playMilestoneSound();
    setEditingStep(null);
    // Optimistic update — show the green check NOW, before the network
    // round-trip. The fetchApp(true) below confirms with the server; if
    // anything diverged we'll re-render with truth. id/application_id are
    // unused by the UI in this view; safe placeholders until refetch.
    const optimisticStep = {
      id: `optimistic-${stepId}-${Date.now()}`,
      application_id: app.id,
      step_id: stepId,
      event_date: date,
      notes: null,
      created_at: new Date().toISOString(),
    };
    setApp({
      ...app,
      current_step: stepId,
      step_events: [...(app.step_events || []), optimisticStep],
    });

    const pinHash = getSavedPinHash(app.id);
    const res = await fetch("/api/steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: app.id, step_id: stepId, event_date: date, pin_hash: pinHash || "" }),
    });
    fetchApp(true);
    if (res.ok) {
      const stepLabel = STEPS.find(s => s.id === stepId)?.label || stepId;
      toast.success(`Marked ${stepLabel} · ${formatDate(date).replace(/, \d{4}/, "")}`);
    } else {
      toast.error("Could not save step");
    }
  };

  const doDelete = async () => {
    if (!app || !confirm("Delete this application? This cannot be undone.")) return;
    setDeleting(true);
    const pinHash = getSavedPinHash(app.id);
    const res = await fetch(`/api/applications?id=${app.id}&pin_hash=${pinHash || ""}`, { method: "DELETE" });
    removeSavedPin(app.id);
    if (res.ok) toast.success("Application deleted");
    else toast.error("Could not delete");
    router.push("/dashboard");
  };

  const submitReport = async () => {
    if (!app) return;
    const reporterPinHash = getAnyOwnedPinHash();
    if (!reporterPinHash) {
      toast.error("Claim an entry first so we can verify the report");
      return;
    }
    if (app.pin_hash && app.pin_hash === reporterPinHash) {
      toast.error("You can't report your own entry");
      return;
    }
    setReporting(true);
    const res = await fetch("/api/applications/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: app.id,
        reporter_pin_hash: reporterPinHash,
        reason: reportReason.trim() || undefined,
      }),
    });
    setReporting(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Could not submit report");
      return;
    }
    setShowReportModal(false);
    setReportReason("");
    setAlreadyReported(true);
    if (data.deleted) {
      toast.success(`Entry removed — ${data.count} reports`);
      router.push("/dashboard");
    } else {
      toast.success(`Report received · ${data.count}/${data.threshold || 2}`);
    }
  };

  if (loading) return <DetailSkeleton />;

  if (!app) {
    return (
      <div className="py-16 text-center bg-white border border-sand-200 rounded-2xl">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sand-100 mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sand-500">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="text-sand-900 text-base font-bold tracking-tight mb-1">Application not found</p>
        <p className="text-sand-500 text-[13px] mb-4 max-w-xs mx-auto leading-relaxed">It may have been removed or the link is stale.</p>
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>Back to tracker</Button>
      </div>
    );
  }

  const stepsMap = buildStepsMap(app.step_events || []);
  const currentIdx = getStepIndex(app.current_step);
  const nextStep = getNextStep(app.current_step);
  const pct = progressPercent(app.current_step);
  const submittedDate = stepsMap.submitted;
  const est = submittedDate ? estimateCompletion(submittedDate, app.stream) : null;

  // Owner = entry is unclaimed (anyone can claim) OR this device holds the PIN.
  // Non-owners only see the Report button; Remove + Mark-done are owner-only.
  const isOwner = !app.pin_hash || getSavedPinHash(app.id) === app.pin_hash;

  return (
    <div>
      <button onClick={() => router.push("/dashboard")}
        className="group inline-flex items-center gap-1.5 text-[11px] text-sand-500 hover:text-sand-800 transition-colors mb-4 font-semibold uppercase tracking-wider">
        <span className="t-icon-slide-x is-back inline-flex"><ArrowLeftIcon size={12} /></span> Back
      </button>

      {/* Header */}
      <Card className="mb-4">
        <div className="flex justify-between items-start mb-4 gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Avatar initials={app.initials} size="lg" seed={app.id} emoji={app.emoji} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-0.5">Application</p>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-sand-900 tracking-tight leading-none">{app.initials}</h1>
                {app.pin_hash ? (
                  <span title={pinVerified ? "PIN verified" : "PIN protected"} className={`inline-flex items-center justify-center w-5 h-5 rounded ${pinVerified ? "bg-brand-500/15 text-brand-700" : "bg-sand-100 text-sand-500"}`}>
                    {pinVerified ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
                      </svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-warn/15 text-warn-dark font-bold uppercase tracking-wider">Unclaimed</span>
                )}
              </div>
              <p className="text-[12px] text-sand-500 truncate">{app.country_origin} · {app.sponsor_status} · {app.stream}</p>
              {app.notes && <p className="text-[11px] text-sand-400 italic mt-1">{app.notes}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!isOwner && (
              <button
                onClick={() => setShowReportModal(true)}
                disabled={alreadyReported}
                title={alreadyReported ? "You've already reported this entry" : "Report this entry"}
                className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-sand-500 hover:text-error hover:bg-error/10 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-sand-500 disabled:cursor-not-allowed"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 22V4"/><path d="M4 4l13 0 -3 5 3 5 -13 0"/>
                </svg>
                <span className="hidden sm:inline">{alreadyReported ? "Reported" : "Report"}</span>
              </button>
            )}
            {isOwner && (
              <Button variant="danger" size="sm" onClick={() => requirePin("delete")} disabled={deleting}>
                <TrashIcon size={13} /> Remove
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StepTimeline currentStep={app.current_step} stepsCompleted={stepsMap} />
          <span className="text-sm font-bold text-brand-600 nums-tabular">{pct}%</span>
        </div>
      </Card>

      {/* Step timeline */}
      <Card className="mb-4">
        <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1">Progress</p>
        <h2 className="text-base font-bold text-sand-900 tracking-tight mb-4">Step timeline</h2>

        {/* Vertical timeline matching the /calculator + EditModal pattern */}
        <div className="relative nums-tabular">
          <div className="absolute left-[19px] top-5 bottom-5 w-[2px] bg-sand-200" aria-hidden="true" />

          <div className="space-y-0">
          {STEPS.map((step, i) => {
            const stepDate = stepsMap[step.id];
            const prevDate = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
            const duration = stepDate && prevDate ? daysBetween(prevDate, stepDate) : null;
            const isDone = i <= currentIdx && !!stepDate;
            const isNext = step.id === nextStep && !isDone;
            const isFuture = !isDone && !isNext;

            const nodeClass = isDone
              ? "bg-brand-500 shadow-md shadow-brand-500/30"
              : isNext
              ? "bg-white border-[3px] border-warn"
              : "bg-white border-2 border-sand-300";

            return (
              <div key={step.id} className="relative flex items-start gap-3.5 py-2.5">
                {/* Node */}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${nodeClass}`}>
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17L4 12" />
                    </svg>
                  ) : isNext ? (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-warn opacity-70 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-warn" />
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-sand-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[14px] font-bold ${isFuture ? "text-sand-500" : "text-sand-900"}`}>{step.label}</span>
                    {isNext && <span className="text-[9px] font-bold text-warn-dark uppercase tracking-wider bg-warn/15 px-1.5 py-0.5 rounded">Next</span>}
                  </div>
                  <p className={`text-[11px] mt-0.5 truncate ${
                    isDone ? "text-brand-600" : isNext ? "text-warn-dark/80" : "text-sand-500"
                  }`}>{step.description}</p>
                </div>

                <div className="flex-shrink-0 pt-1 text-right min-w-[100px]">
                  {isDone && stepDate ? (
                    <>
                      <div className="text-[12px] font-bold text-sand-800">{formatDate(stepDate)}</div>
                      {duration != null && i > 0 && <div className="text-[10px] text-brand-600 font-bold mt-0.5">{duration}d</div>}
                    </>
                  ) : isNext && isOwner ? (
                    editingStep === step.id ? (
                      <input type="date" className="text-xs px-2 py-1.5 border border-sand-200 bg-sand-50 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 focus:bg-white transition-colors nums-tabular" autoFocus
                        onChange={(e) => { if (e.target.value) markStepDone(step.id, e.target.value); }}
                        onBlur={() => setEditingStep(null)} />
                    ) : (
                      <Button size="sm" onClick={() => requirePin(step.id)}>Mark done</Button>
                    )
                  ) : (
                    <span className="text-[11px] text-sand-400">~{step.avgWeeksOutland[0] * 7}–{step.avgWeeksOutland[1] * 7}d</span>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </Card>

      {/* Estimated completion */}
      {est && (
        <Card>
          <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-1">Forecast</p>
          <div className="flex items-center gap-2 mb-1">
            <ClockIcon size={16} className="text-brand-500" />
            <h2 className="text-base font-bold text-sand-900 tracking-tight">Estimated completion</h2>
          </div>
          <p className="text-[12px] text-sand-500 mb-4">Based on IRCC averages for {app.stream} stream.</p>
          <div className="grid grid-cols-2 gap-3 nums-tabular">
            <div className="bg-brand-500/[0.08] border border-brand-500/20 rounded-lg p-3">
              <span className="text-[10px] font-bold text-brand-700 uppercase tracking-[0.08em] block mb-1">Earliest</span>
              <span className="text-xl font-bold text-brand-600 leading-none">{formatDate(est.earliest)}</span>
            </div>
            <div className="bg-warn/15 border border-warn/30 rounded-lg p-3">
              <span className="text-[10px] font-bold text-warn-dark uppercase tracking-[0.08em] block mb-1">Latest</span>
              <span className="text-xl font-bold text-warn-dark leading-none">{formatDate(est.latest)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* PIN Modal */}
      {showPinModal && app.pin_hash && (
        <PinModal open={showPinModal}
          onClose={() => { setShowPinModal(false); setPendingAction(null); }}
          expectedHash={app.pin_hash} appId={app.id} onVerified={onPinVerified} />
      )}

      {/* Report Modal */}
      <Modal
        open={showReportModal}
        onClose={() => { setShowReportModal(false); setReportReason(""); }}
        title="Report this entry"
      >
        <div className="space-y-4">
          <div className="bg-warn/10 border border-warn/30 rounded-lg p-3">
            <p className="text-[12px] text-sand-700 leading-relaxed">
              Flag this entry if it looks fake, abusive, or impossible (e.g. AOR
              the same day as submission). <strong>2 reports from different
              users will auto-remove it.</strong>
            </p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] block mb-1.5">
              Reason <span className="text-sand-400 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value.slice(0, 200))}
              placeholder="e.g. AOR same day as submission — impossible"
              rows={3}
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-sand-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-colors resize-none"
            />
            <p className="text-[10px] text-sand-400 mt-1 nums-tabular text-right">{reportReason.length}/200</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowReportModal(false); setReportReason(""); }}
              disabled={reporting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={submitReport}
              disabled={reporting}
            >
              {reporting ? "Submitting…" : "Submit report"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Claim Modal */}
      {showClaimModal && !app.pin_hash && (
        <ClaimPinModal open={showClaimModal}
          onClose={() => { setShowClaimModal(false); setPendingAction(null); }}
          appId={app.id} appInitials={app.initials}
          onClaimed={(pinHash) => {
            setApp({ ...app, pin_hash: pinHash });
            setPinVerified(true);
            setShowClaimModal(false);
            if (pendingAction === "delete") doDelete();
            else if (pendingAction) setEditingStep(pendingAction as StepId);
            setPendingAction(null);
          }}
        />
      )}
    </div>
  );
}
