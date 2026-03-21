import { useNavigate, useParams } from "react-router-dom";
import { usePatient } from "@entities/patient";
import { Header } from "@shared/components/layout/Header";
import { BottomBar } from "@shared/components/layout/BottomBar";
import { Button } from "@shared/components/ui/button";
import { Card } from "@shared/components/ui/card";
import { paths } from "@app/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { PatientSummaryHeader } from "../components/PatientHeader";
import { PatientCaseSheetTabs } from "../components/PatientTabs";

export function PatientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: patient, isLoading, error } = usePatient(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-b-2 border-primary animate-spin" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-2">
        <p className="text-sm text-muted-foreground">Failed to load patient.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header
        title="Patient Detail"
        showBack
        onBack={() => navigate(paths.patients())}
      />
      <main className="p-4 space-y-4">
        <PatientSummaryHeader
          id={patient.id}
          name={patient.name}
          mrn={patient.latestMrn}
          scheme={patient.scheme}
          stage={patient.currentState}
          pathway={patient.pathway}
        />
        <Card className="border-blue-100 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">Documents</h2>
                <p className="text-sm text-muted-foreground">
                  Open the patient document folders and uploaded files.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => navigate(paths.docsRoot(patient.id))}
            >
              Open Documents
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
        <PatientCaseSheetTabs patient={patient} />
      </main>
      <BottomBar />
    </div>
  );
}
