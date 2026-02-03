import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import {
  patientSchema,
  type PatientFormValues,
  SCHEME_OPTIONS,
} from "@entities/patient/model/validation";
import { toCreatePayload, toUpdatePayload } from "@entities/patient/model/payload";
import { usePatient } from "@entities/patient";
import { useToast } from "@shared/hooks/use-toast";
import { paths } from "@app/navigation";
import api from "@/lib/api";
import type { Patient } from "@/types/api";
import { parseComorbiditiesFromList } from "@entities/patient/model/comorbidities";

const normalizeScheme = (value?: string): PatientFormValues["scheme"] => {
  const raw = (value || "").trim().toUpperCase();
  if (SCHEME_OPTIONS.includes(raw as PatientFormValues["scheme"])) {
    return raw as PatientFormValues["scheme"];
  }
  if (["UNKNOWN", "GENERAL", "OTHER"].includes(raw)) {
    return "OTHERS";
  }
  return "OTHERS";
};

const defaultFormValues: PatientFormValues = {
  name: "",
  age: undefined,
  sex: "M",
  mrn: "",
  scheme: "OTHERS",
  pathway: "surgical",
  status: "ACTIVE",
  department: "",
  currentState: "onboarding",
  diagnosis: "",
  comorbidities: [],
  includeOtherComorbidity: false,
  otherComorbidity: "",
  procedureName: "",
  surgeryCode: "",
  surgeryDate: "",
  tidNumber: "",
  tidStatus: "",
  assignedDoctor: "",
  assignedDoctorId: "",
  roomNumber: "",
  filesUrl: "",
  isUrgent: false,
  urgentReason: "",
  urgentUntil: "",
  emergencyContact: {
    name: "",
    relationship: "",
    phone: "",
    altPhone: "",
    email: "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
  },
};

const mapPatientToFormValues = (patient: Patient): PatientFormValues => {
  const parsed = parseComorbiditiesFromList(patient.comorbidities);
  const sexRaw = (patient.sex || "").toLowerCase();
  const sex: PatientFormValues["sex"] =
    sexRaw === "male" ? "M" : sexRaw === "female" ? "F" : "OTHER";

  return {
    id: patient.id,
    name: patient.name || "",
    age: patient.age,
    sex,
    mrn: patient.latestMrn || "",
    scheme: normalizeScheme(patient.scheme),
    pathway: (patient.pathway as PatientFormValues["pathway"]) || "surgical",
    status: patient.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    department: patient.department || "",
    currentState:
      (patient.currentState as PatientFormValues["currentState"]) || "onboarding",
    diagnosis: patient.diagnosis || "",
    comorbidities: parsed.selections,
    includeOtherComorbidity: parsed.includeOther,
    otherComorbidity: parsed.otherValue,
    procedureName: patient.procedureName || "",
    surgeryCode: (patient as Record<string, unknown>).surgeryCode as string || "",
    surgeryDate: (patient as Record<string, unknown>).surgeryDate as string || "",
    tidNumber: (patient as Record<string, unknown>).tidNumber as string || "",
    tidStatus: (patient as Record<string, unknown>).tidStatus as string || "",
    assignedDoctor: patient.assignedDoctor || "",
    assignedDoctorId: patient.assignedDoctorId || "",
    roomNumber: patient.roomNumber || "",
    filesUrl: (patient as Record<string, unknown>).filesUrl as string || "",
    isUrgent: Boolean((patient as Record<string, unknown>).isUrgent),
    urgentReason: (patient as Record<string, unknown>).urgentReason as string || "",
    urgentUntil: (patient as Record<string, unknown>).urgentUntil as string || "",
    emergencyContact: patient.emergencyContact || defaultFormValues.emergencyContact,
  };
};

export type UsePatientRegistrationFormReturn = {
  form: UseFormReturn<PatientFormValues>;
  onSubmit: () => Promise<void>;
  isLoading: boolean;
  isEditMode: boolean;
  patientQuery: ReturnType<typeof usePatient> | null;
};

export function usePatientRegistrationForm(
  patientId?: string
): UsePatientRegistrationFormReturn {
  const isEditMode = Boolean(patientId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only fetch patient if we're in edit mode
  const patientQuery = patientId ? usePatient(patientId) : null;
  const existingPatient = patientQuery?.data;

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: defaultFormValues,
    values: existingPatient ? mapPatientToFormValues(existingPatient) : undefined,
  });

  const createMutation = useMutation({
    mutationFn: async (values: PatientFormValues) => {
      console.log("🚀 [CREATE PATIENT] Form values:", values);
      const payload = toCreatePayload(values);
      console.log("📦 [CREATE PATIENT] Payload to send:", payload);
      return api.patients.create({
        registrationNumber: payload.registrationNumber,
        name: payload.name,
        department: payload.department,
        age: payload.age,
        sex: payload.sex,
        pathway: payload.pathway,
        diagnosis: payload.diagnosis,
        comorbidities: payload.comorbidities,
        assignedDoctor: payload.assignedDoctor,
        assignedDoctorId: payload.assignedDoctorId,
        scheme: payload.scheme,
        roomNumber: payload.roomNumber,
        procedureName: payload.procedureName,
        currentState: payload.currentState,
        isUrgent: payload.isUrgent,
        urgentReason: payload.urgentReason,
        urgentUntil: payload.urgentUntil,
        filesUrl: payload.filesUrl,
        emergencyContact: payload.emergencyContact,
        latestMrn: payload.latestMrn,
        mrnHistory: payload.mrnHistory,
        surgeryCode: payload.surgeryCode,
        surgeryDate: payload.surgeryDate ? new Date(payload.surgeryDate).toISOString() : null,
        tidNumber: payload.tidNumber,
        tidStatus: payload.tidStatus,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast({
        title: "Patient added",
        description: `${res.patient.name} has been added successfully.`,
      });
      navigate(paths.patient(res.patient.id));
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: PatientFormValues) => {
      if (!patientId || !existingPatient) {
        throw new Error("Patient ID required for update");
      }
      const payload = toUpdatePayload(values, existingPatient);
      return api.patients.update(patientId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      toast({
        title: "Patient updated",
        description: "Patient details have been updated successfully.",
      });
      if (patientId) {
        navigate(paths.patient(patientId));
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit(
    async (values) => {
      console.log("✅ [SUBMIT] Form validation passed, values:", values);
      if (isEditMode) {
        console.log("📝 [SUBMIT] Edit mode - updating patient");
        await updateMutation.mutateAsync(values);
      } else {
        console.log("➕ [SUBMIT] Create mode - creating patient");
        await createMutation.mutateAsync(values);
      }
    },
    (errors) => {
      console.error("❌ [SUBMIT] Form validation failed:", errors);
      console.log("📋 [SUBMIT] Current form values:", form.getValues());
    }
  );

  return {
    form,
    onSubmit,
    isLoading: createMutation.isPending || updateMutation.isPending,
    isEditMode,
    patientQuery,
  };
}
