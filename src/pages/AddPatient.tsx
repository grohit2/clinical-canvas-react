import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import PatientRegistrationForm from "@/features/patient-details-input/PatientRegistrationForm";
import { paths } from "@/app/navigation";

export default function AddPatient() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Add Patient" showBack onBack={() => navigate(-1)} />
      <main className="p-0">
        <PatientRegistrationForm onAddPatient={(p) => navigate(paths.patient(String(p.id || p.mrn)))} />
      </main>
      <BottomBar />
    </div>
  );
}
