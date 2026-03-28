"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Application, StepId } from "@/lib/types";
import { STEPS, getStepIndex, getNextStep } from "@/lib/constants";
import {
  formatDate, progressPercent, daysBetween, buildStepsMap, estimateCompletion,
} from "@/lib/utils";
import { getSavedPinHash, removeSavedPin } from "@/lib/pin";
import { StepTimeline } from "@/components/StepTimeline";
import { PinModal } from "@/components/PinModal";
import { ClaimPinModal } from "@/components/ClaimPinModal";
import { StepIcon, ArrowLeftIcon, TrashIcon, ClockIcon } from "@/components/icons";
import { Button, Avatar, Card } from "@/components/ui";
import { playMilestoneSound } from "@/lib/sounds";

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<StepId | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"delete" | StepId | null>(null);

  const fetchApp = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .eq("id", id)
      .single();

    if (data) {
      const a = data as Application;
      setApp(a);
      if (!a.pin_hash || getSavedPinHash(a.id) === a.pin_hash) {
        setPinVerified(true);
      }
    }
    setLoading(false);
  }, [id, supabase]);

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
    if (navigator.vibrate) navigator.vibrate(12);
    playMilestoneSound();
    await supabase.from("step_events").insert({
      application_id: app.id, step_id: stepId, event_date: date,
    });
    const isLanding = stepId === "ecopr";
    await supabase.from("applications")
      .update({ current_step: stepId, is_complete: isLanding })
      .eq("id", app.id);
    setEditingStep(null);
    fetchApp();
  };

  const doDelete = async () => {
    if (!app || !confirm("Delete this application? This cannot be undone.")) return;
    setDeleting(true);
    await supabase.from("applications").delete().eq("id", app.id);
    removeSavedPin(app.id);
    router.push("/dashboard");
  };

  if (loading) return <div className="py-20 text-center text-sand-400 text-sm">Loading...</div>;

  if (!app) {
    return (
      <div className="py-20 text-center">
        <p className="text-sand-500 mb-4">Application not found</p>
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>Back to Tracker</Button>
      </div>
    );
  }

  const stepsMap = buildStepsMap(app.step_events || []);
  const currentIdx = getStepIndex(app.current_step);
  const nextStep = getNextStep(app.current_step);
  const pct = progressPercent(app.current_step);
  const submittedDate = stepsMap.submitted;
  const est = submittedDate ? estimateCompletion(submittedDate, app.stream) : null;

  return (
    <div>
      <button onClick={() => router.push("/dashboard")}
        className="flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-800 transition-colors mb-4">
        <ArrowLeftIcon size={14} /> Back
      </button>

      {/* Header */}
      <Card className="mb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <Avatar initials={app.initials} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-sand-900">{app.initials}</h1>
                {app.pin_hash ? (
                  <span title={pinVerified ? "PIN verified" : "PIN protected"}>
                    {pinVerified ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sand-400">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-warn-light text-warn-dark font-semibold">Unclaimed</span>
                )}
              </div>
              <p className="text-sm text-sand-500">{app.country_origin} · {app.sponsor_status} · {app.stream}</p>
              {app.notes && <p className="text-xs text-sand-400 italic mt-0.5">{app.notes}</p>}
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => requirePin("delete")} disabled={deleting}>
            <TrashIcon size={13} /> Remove
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <StepTimeline currentStep={app.current_step} stepsCompleted={stepsMap} />
          <span className="text-sm font-bold text-brand-600">{pct}%</span>
        </div>
      </Card>

      {/* Step timeline */}
      <Card className="mb-4">
        <h2 className="text-sm font-bold text-sand-900 mb-3">Step Timeline</h2>
        <div className="divide-y divide-sand-100">
          {STEPS.map((step, i) => {
            const stepDate = stepsMap[step.id];
            const prevDate = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
            const duration = stepDate && prevDate ? daysBetween(prevDate, stepDate) : null;
            const isDone = i <= currentIdx && stepDate;
            const isNext = step.id === nextStep;
            const isFuture = i > currentIdx + 1;

            return (
              <div key={step.id} className={`flex items-center gap-3 py-3 ${isFuture ? "opacity-40" : ""}`}>
                <div className="w-7 flex justify-center">
                  <StepIcon stepId={step.id} size={20}
                    className={isDone ? "text-brand-500" : isNext ? "text-warn" : "text-sand-300"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-sand-900">{step.label}</div>
                  <div className="text-[11px] text-sand-400">{step.description}</div>
                </div>
                <div className="text-right min-w-[100px]">
                  {isDone ? (
                    <>
                      <div className="text-xs font-medium text-sand-700">{formatDate(stepDate)}</div>
                      {duration != null && i > 0 && <div className="text-[10px] text-brand-500 font-medium">{duration} days</div>}
                    </>
                  ) : isNext ? (
                    editingStep === step.id ? (
                      <input type="date" className="text-xs px-2 py-1 border border-sand-200 rounded-md" autoFocus
                        onChange={(e) => { if (e.target.value) markStepDone(step.id, e.target.value); }}
                        onBlur={() => setEditingStep(null)} />
                    ) : (
                      <Button size="sm" onClick={() => requirePin(step.id)}>Mark Done</Button>
                    )
                  ) : (
                    <span className="text-[11px] text-sand-400">~{step.avgWeeksOutland[0] * 7}–{step.avgWeeksOutland[1] * 7}d</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Estimated completion */}
      {est && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon size={16} className="text-brand-500" />
            <h2 className="text-sm font-bold text-sand-900">Estimated Completion</h2>
          </div>
          <p className="text-xs text-sand-400 mb-3">Based on IRCC averages for {app.stream} stream</p>
          <div className="flex gap-8">
            <div>
              <span className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider block">Earliest</span>
              <span className="text-base font-bold text-brand-600">{formatDate(est.earliest)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider block">Latest</span>
              <span className="text-base font-bold text-warn">{formatDate(est.latest)}</span>
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
