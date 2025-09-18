import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import PatientRegistrationForm from "@/components/patient/patinet_form/PatientRegistrationForm";
import type { Patient } from "@/types/api";

export default function AddPatientPage() {
  const navigate = useNavigate();

  const handleAddPatient = (patient: Patient) => {
    // Navigate back to patients list after successful creation
    // The PatientsList component will re-fetch data when it mounts
    navigate("/patients");
  };

  const handleClose = () => {
    // Navigate back to patients list
    navigate("/patients");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Add New Patient" 
        showBack
        onBack={handleClose}
      />
      
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          <PatientRegistrationForm
            onAddPatient={handleAddPatient}
            onClose={handleClose}
          />
        </div>
      </div>

      <BottomBar />
    </div>
  );
}