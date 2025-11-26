import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowSteps, type WorkflowStepId } from "../model/useWorkflowSteps";

interface WorkflowStepperProps {
  patientId: string;
  patientStage?: string;
  className?: string;
}

export function WorkflowStepper({
  patientId,
  patientStage,
  className,
}: WorkflowStepperProps) {
  const { steps, currentStepId, isStepComplete } = useWorkflowSteps(patientId);

  return (
    <nav className={cn("w-full", className)} aria-label="Workflow progress">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === currentStepId;
          const isComplete = isStepComplete(step.id, patientStage);
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.id}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              <Link
                to={step.to}
                className={cn(
                  "group flex flex-col items-center gap-1",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg p-1"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {/* Step indicator */}
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isComplete && !isActive && "border-emerald-500 bg-emerald-500 text-white",
                    !isActive && !isComplete && "border-muted-foreground/30 bg-background text-muted-foreground group-hover:border-primary/50"
                  )}
                >
                  {isComplete && !isActive ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>

                {/* Step label */}
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wide transition-colors",
                    isActive && "text-primary",
                    isComplete && !isActive && "text-emerald-600",
                    !isActive && !isComplete && "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {step.shortLabel}
                </span>
              </Link>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 transition-colors",
                    isComplete ? "bg-emerald-500" : "bg-muted-foreground/20"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
