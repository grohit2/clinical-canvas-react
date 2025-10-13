import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import DischargeSummaryForm from "@/features/discharge-summary/DischargeSummaryForm";

export default function DischargeSummaryPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    document.title = "Discharge Summary | Clinical Canvas";
  }, []);

  if (!id) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Discharge Summary" showBack onBack={() => navigate(-1)} />
        <main className="flex min-h-[60vh] items-center justify-center p-6 text-sm text-muted-foreground">
          Patient identifier is missing from the URL.
        </main>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header title="Discharge Summary" showBack onBack={() => navigate(-1)} />
      <main className="flex-1 overflow-hidden">
        <DischargeSummaryForm patientIdOrMrn={id} />
      </main>
      <BottomBar />
    </div>
  );
}
