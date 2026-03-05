import { useNavigate, useParams } from "react-router-dom";
import { usePatient } from "@entities/patient";
import { PageShell } from "@shared/components/layout/PageShell";
import { paths } from "@app/navigation";
import { PatientSummaryHeader } from "./PatientSummaryHeader";
import { PatientCaseSheetTabs } from "./PatientCaseSheetTabs";

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
    <PageShell
      header={{
        title: "Patient Detail",
        showBack: true,
        onBack: () => navigate(paths.patients()),
      }}
    >
      <main className="p-4 space-y-4">
        <PatientSummaryHeader
          id={patient.id}
          name={patient.name}
          mrn={patient.latestMrn}
          scheme={patient.scheme}
          stage={patient.currentState}
          pathway={patient.pathway}
        />
        <PatientCaseSheetTabs patient={patient} />
      </main>
    </PageShell>
  );
}
