import { ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomBar } from "@/components/layout/BottomBar";
import { paths } from "@/app/navigation";
import api from "@/lib/api";
import { WorkflowStepper } from "./WorkflowStepper";
import { useWorkflowSteps, type WorkflowStepId } from "../model/useWorkflowSteps";

interface WorkflowPageLayoutProps {
  title: string;
  stepId: WorkflowStepId;
  children: ReactNode;
}

export function WorkflowPageLayout({
  title,
  stepId,
  children,
}: WorkflowPageLayoutProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.patients.get(id!),
    enabled: !!id,
  });

  const { getNextStep, getPrevStep } = useWorkflowSteps(id ?? "");
  const nextStep = getNextStep(stepId);
  const prevStep = getPrevStep(stepId);

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">Invalid patient ID</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(paths.patient(id))}
              aria-label="Back to patient detail"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{title}</h1>
              {patient && (
                <p className="text-sm text-muted-foreground truncate">
                  {patient.name} &bull; {patient.latestMrn}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Workflow Stepper */}
        <div className="px-4 py-3 border-t bg-gray-50/50">
          <WorkflowStepper
            patientId={id}
            patientStage={patient?.currentState}
          />
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          children
        )}
      </main>

      {/* Navigation Footer */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t px-4 py-3 flex items-center justify-between z-10">
        {prevStep ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(prevStep.to)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {prevStep.label}
          </Button>
        ) : (
          <div />
        )}

        {nextStep && (
          <Button size="sm" onClick={() => navigate(nextStep.to)}>
            {nextStep.label}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      <BottomBar />
    </div>
  );
}
