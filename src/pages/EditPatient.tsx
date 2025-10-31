import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import PatientRegistrationForm from "@/features/patient-details-input/PatientRegistrationForm";
import api from "@/lib/api";
import type { Patient } from "@/types/api";
import { paths } from "@/app/navigation";

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [mrnHistory, setMrnHistory] = useState<Patient["mrnHistory"] | undefined>(undefined);
  const [latestMrn, setLatestMrn] = useState<string | undefined>(undefined);

  useEffect(() => {
    document.title = "Edit Patient | Clinical Canvas";
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const p: Patient = await api.patients.get(id);
        const toFormSex = (s?: string) => (s === "male" ? "M" : s === "female" ? "F" : "Other");
        setMrnHistory(p.mrnHistory);
        setLatestMrn(p.latestMrn);
        setInitial({
          name: p.name || "",
          age: p.age ? String(p.age) : "",
          sex: toFormSex(p.sex),

          scheme: p.scheme || "",
          roomNumber: p.roomNumber || "",
          mrn: p.latestMrn || "",
          department: p.department || "",
          status: p.status || "ACTIVE",

          pathway: p.pathway || "",
          diagnosis: p.diagnosis || "",
          comorbidities: p.comorbidities || [],
          procedureName: p.procedureName || "",
          surgeryCode: (p as any).surgeryCode || "",
          surgeryDate: (p as any).surgeryDate ? new Date((p as any).surgeryDate).toISOString().slice(0,10) : "",
          assignedDoctor: p.assignedDoctor || "",
          assignedDoctorId: p.assignedDoctorId || "",
          filesUrl: p.filesUrl || "",
          isUrgent: p.isUrgent || false,
          urgentReason: p.urgentReason || "",
          urgentUntil: p.urgentUntil || "",
          emergencyContact: p.emergencyContact || { name: "", relationship: "", phone: "" },
        });
        setLoading(false);
      } catch (e) {
        console.error("Failed to load patient", e);
        navigate(paths.patients());
      }
    })();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Edit Patient" showBack onBack={() => navigate(-1)} />
        <div className="p-4 text-center text-muted-foreground">Loading patient…</div>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Edit Patient" showBack onBack={() => navigate(-1)} />
      <main className="p-0">
        <PatientRegistrationForm
          mode="edit"
          patientId={id!}
          initial={initial!}
          onAddPatient={() => navigate(paths.patient(id!))}
        />
      </main>
      <BottomBar />
    </div>
  );
}
