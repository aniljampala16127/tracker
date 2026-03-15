"use client";

import { Application, StepEvent } from "@/lib/types";
import { STEPS, getStepIndex } from "@/lib/constants";
import { formatDate, progressPercent, buildStepsMap } from "@/lib/utils";
import { StepTimeline } from "./StepTimeline";
import { Avatar, Badge } from "./ui";

interface AppCardProps {
  app: Application;
  onClick?: () => void;
}

export function AppCard({ app, onClick }: AppCardProps) {
  const pct = progressPercent(app.current_step);
  const currentStepData = STEPS.find((s) => s.id === app.current_step);
  const stepsMap = buildStepsMap(app.step_events || []);
  const submittedDate = app.step_events?.find((e) => e.step_id === "submitted")?.event_date;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-sand-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow duration-150"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <Avatar initials={app.initials} size="sm" />
          <div>
            <div className="font-semibold text-sm text-sand-900">{app.initials}</div>
            <div className="text-xs text-sand-500">
              {app.country_origin} · {app.sponsor_status} · {app.stream}
            </div>
          </div>
        </div>
        <Badge variant={pct === 100 ? "success" : "warning"}>
          {pct === 100 ? "Complete" : currentStepData?.label}
        </Badge>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <StepTimeline currentStep={app.current_step} stepsCompleted={stepsMap} compact />
        <span className="text-xs font-bold text-brand-600 whitespace-nowrap">{pct}%</span>
      </div>

      <div className="flex justify-between text-[11px] text-sand-500">
        <span>Submitted {formatDate(submittedDate || null)}</span>
        {app.notes && <span className="italic truncate ml-4">{app.notes}</span>}
      </div>
    </div>
  );
}
