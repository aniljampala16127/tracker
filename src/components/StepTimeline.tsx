"use client";

import { STEPS, getStepIndex } from "@/lib/constants";
import { StepId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@/components/icons";

interface StepTimelineProps {
  currentStep: StepId;
  stepsCompleted: Record<StepId, string | null>;
  compact?: boolean;
}

export function StepTimeline({ currentStep, stepsCompleted, compact }: StepTimelineProps) {
  const currentIdx = getStepIndex(currentStep);

  return (
    <div className="flex items-center gap-1 w-full">
      {STEPS.map((step, i) => {
        const done = i <= currentIdx && stepsCompleted[step.id];
        const active = i === currentIdx && !stepsCompleted[STEPS[STEPS.length - 1].id];

        return (
          <div key={step.id} className={cn("flex items-center gap-1", i < STEPS.length - 1 && "flex-1")}>
            <div
              className={cn(
                "rounded-full flex items-center justify-center flex-shrink-0",
                compact ? "w-2 h-2" : "w-6 h-6",
                done ? "bg-brand-500" : active ? "bg-warn border-2 border-warn" : "bg-sand-300",
              )}
              title={step.label}
            >
              {!compact && done && <CheckIcon className="text-white" size={12} />}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 rounded-full",
                  done && stepsCompleted[STEPS[i + 1]?.id] ? "bg-brand-500" : "bg-sand-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
