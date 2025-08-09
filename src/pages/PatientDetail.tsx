import { useLocation, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { patientService } from "@/services/patientService";

import type { PatientMeta } from "@/types/models";

type LocState = { patient?: PatientMeta };

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation() as { state?: LocState };
  const qc = useQueryClient();

  const initialFromState = location.state?.patient;
  const list = qc.getQueryData<PatientMeta[]>(["patients"]);
  const initialFromCache = list?.find((p) => p.id === id);

  const {
    data: patient,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => patientService.getPatientById(id!),
    initialData: initialFromState ?? initialFromCache,
    initialDataUpdatedAt: qc.getQueryState(["patients"])?.dataUpdatedAt,
    staleTime: 30_000,
  });

  if (isLoading && !patient) return <div>Loading…</div>;
  if (isError || !patient) return <div>Patient not found</div>;

  return (
    <div className="space-y-2 p-4">
      <h1 className="text-xl font-semibold">{patient.name}</h1>
      <div>MRN: {patient.mrn}</div>
      <div>Department: {patient.department}</div>
      <div>Status: {patient.status}</div>
      <div>State: {patient.currentState ?? "—"}</div>
    </div>
  );
}

