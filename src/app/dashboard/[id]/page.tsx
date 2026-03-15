"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Application, StepId } from "@/lib/types";
import { STEPS, getStepIndex, getNextStep } from "@/lib/constants";
import {
  formatDate,
  progressPercent,
  weeksBetween,
  buildStepsMap,
  estimateCompletion,
} from "@/lib/utils";
import { StepTimeline } from "@/components/StepTimeline";
import { StepIcon, ArrowLeftIcon, TrashIcon, ClockIcon } from "@/components/icons";
import { Button, Avatar, Card } from "@/components/ui";

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<StepId | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchApp = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .eq("id", id)
      .single();

    if (data) setApp(data as Application);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  const markStepDone = async (stepId: StepId, date: string) => {
    if (!app) return;

    await supabase.from("step_events").insert({
      application_id: app.id,
      step_id: stepId,
      event_date: date,
    });

    const isLanding = stepId === "landing";
    await supabase
      .from("applications")
      .update({ current_step: stepId, is_complete: isLanding })
      .eq("id", app.id);

    setEditingStep(null);
    fetchApp();
  };

  const handleDelete = async () => {
    if (!app || !confirm("Delete this application? This cannot be undone."))
      return;
    setDeleting(true);
    await supabase.from("applications").delete().eq("id", app.id);
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sand-400 text-sm">Loading...</div>
    );
  }

  if (!app) {
    return (
      <div className="py-20 text-center">
        <p className="text-sand-500 mb-4">Application not found</p>
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>
          Back to Tracker
        </Button>
      </div>
    );
  }

  const stepsMap = buildStepsMap(app.step_events || []);
  const currentIdx = getStepIndex(app.current_step);
  const nextStep = getNextStep(app.current_step);
  const pct = progressPercent(app.current_step);
  const submittedDate = stepsMap.submitted;
  const est = submittedDate
    ? estimateCompletion(submittedDate, app.stream)
    : null;

  return (
    <div>
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-800 transition-colors mb-4"
      >
        <ArrowLeftIcon size={14} /> Back
      </button>

      {/* Header */}
      <Card className="mb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <Avatar initials={app.initials} size="lg" />
            <div>
              <h1 className="text-lg font-bold text-sand-900">
                {app.initials}
              </h1>
              <p className="text-sm text-sand-500">
                {app.country_origin} · {app.sponsor_status} · {app.stream}
              </p>
              {app.notes && (
                <p className="text-xs text-sand-400 italic mt-0.5">
                  {app.notes}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            <TrashIcon size={13} /> Remove
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <StepTimeline
            currentStep={app.current_step}
            stepsCompleted={stepsMap}
          />
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
            const duration =
              stepDate && prevDate ? weeksBetween(prevDate, stepDate) : null;
            const isDone = i <= currentIdx && stepDate;
            const isNext = step.id === nextStep;
            const isFuture = i > currentIdx + 1;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 py-3 ${
                  isFuture ? "opacity-40" : ""
                }`}
              >
                <div className="w-7 flex justify-center">
                  <StepIcon
                    stepId={step.id}
                    size={20}
                    className={
                      isDone
                        ? "text-brand-500"
                        : isNext
                        ? "text-warn"
                        : "text-sand-300"
                    }
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-sand-900">
                    {step.label}
                  </div>
                  <div className="text-[11px] text-sand-400">
                    {step.description}
                  </div>
                </div>
                <div className="text-right min-w-[100px]">
                  {isDone ? (
                    <>
                      <div className="text-xs font-medium text-sand-700">
                        {formatDate(stepDate)}
                      </div>
                      {duration != null && i > 0 && (
                        <div className="text-[10px] text-brand-500 font-medium">
                          {duration} weeks
                        </div>
                      )}
                    </>
                  ) : isNext ? (
                    editingStep === step.id ? (
                      <input
                        type="date"
                        className="text-xs px-2 py-1 border border-sand-200 rounded-md"
                        autoFocus
                        onChange={(e) => {
                          if (e.target.value)
                            markStepDone(step.id, e.target.value);
                        }}
                        onBlur={() => setEditingStep(null)}
                      />
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setEditingStep(step.id)}
                      >
                        Mark Done
                      </Button>
                    )
                  ) : (
                    <span className="text-[11px] text-sand-400">
                      ~{step.avgWeeksOutland[0]}–{step.avgWeeksOutland[1]} wks
                    </span>
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
            <h2 className="text-sm font-bold text-sand-900">
              Estimated Completion
            </h2>
          </div>
          <p className="text-xs text-sand-400 mb-3">
            Based on IRCC averages for {app.stream} stream
          </p>
          <div className="flex gap-8">
            <div>
              <span className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider block">
                Earliest
              </span>
              <span className="text-base font-bold text-brand-600">
                {formatDate(est.earliest)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider block">
                Latest
              </span>
              <span className="text-base font-bold text-warn">
                {formatDate(est.latest)}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
