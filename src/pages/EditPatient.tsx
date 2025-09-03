import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import PatientRegistrationForm from "@/features/patient-details-input/PatientRegistrationForm";
import api from "@/lib/api";

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<any | null>(null);

  useEffect(() => { document.title = `Edit Patient | Clinical Canvas`; }, []);

  useEffect(() => {
    if (!id) return;
    api.patients.get(id).then(p => {
      // Map API patient -> form initial values
      const sexMap: Record<string,string> = { male: "M", female: "F", other: "Other" };
      setInitial({
        name: p.name || "",
        age: p.age ? String(p.age) : "",
        sex: sexMap[(p.sex || "other").toLowerCase()] || "Other",
        scheme: "", // unknown in existing API; leave blank
        mrn: p.mrn || id,
        department: p.department || "",
        status: p.status || "ACTIVE",
        pathway: (p.pathway as any) || "",
        diagnosis: p.diagnosis || "",
        comorbidities: p.comorbidities || [],
        assignedDoctor: p.assignedDoctor || "",
        assignedDoctorId: p.assignedDoctorId || "",
      });
    }).catch(() => {});
  }, [id]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Edit Patient" showBack onBack={() => navigate(-1)} />
      <main className="p-0">
        {id && initial && (
          <PatientRegistrationForm
            mode="edit"
            patientId={id}
            initial={initial}
            onAddPatient={() => navigate(`/patients/${id}`)}
            onClose={() => navigate(`/patients/${id}`)}
          />
        )}
      </main>
      <BottomBar />
    </div>
  );
}
