import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageShell } from "@shared/components/layout/PageShell";
import DischargeSummaryForm from "@features/patient-discharge-summary/DischargeSummaryForm";

export default function DischargeSummaryPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    document.title = "Discharge Summary | Clinical Canvas";
  }, []);

  if (!id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Patient identifier is missing from the URL.
        </p>
      </div>
    );
  }

  // Render like PatientRegistrationPage - no extra wrappers, just the form with BottomBar
  return (
    <PageShell>
      <DischargeSummaryForm patientIdOrMrn={id} />
    </PageShell>
  );
}
