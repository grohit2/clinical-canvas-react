import { useEffect } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import {
  patientSchema,
  type PatientFormValues,
  SCHEME_OPTIONS,
} from '@/domains/patient-list/core/validation';
import type { Patient as SharedApiPatient } from '@/types/api';
import { toCreatePayload, toUpdatePayload } from '@/domains/patient-detail/core/payload';
import { parseComorbiditiesFromList } from '@/domains/patient-list/core/comorbidities';
import type { Patient } from '@clinical-canvas/core';

import { usePatient } from '../../../hooks/usePatients';
import { api } from '../../../lib/api';
import { useToast } from '../../../shared/hooks/useToast';

const normalizeScheme = (value?: string): PatientFormValues['scheme'] => {
  const raw = (value || '').trim().toUpperCase();
  if (SCHEME_OPTIONS.includes(raw as PatientFormValues['scheme'])) {
    return raw as PatientFormValues['scheme'];
  }
  if (['UNKNOWN', 'GENERAL', 'OTHER'].includes(raw)) {
    return 'OTHERS';
  }
  return 'OTHERS';
};

const defaultFormValues: PatientFormValues = {
  name: '',
  age: undefined,
  sex: 'M',
  mrn: '',
  scheme: 'OTHERS',
  pathway: 'surgical',
  status: 'ACTIVE',
  department: '',
  currentState: 'onboarding',
  diagnosis: '',
  comorbidities: [],
  includeOtherComorbidity: false,
  otherComorbidity: '',
  procedureName: '',
  surgeryCode: '',
  surgeryDate: '',
  tidNumber: '',
  tidStatus: '',
  assignedDoctor: '',
  assignedDoctorId: '',
  roomNumber: '',
  filesUrl: '',
  isUrgent: false,
  urgentReason: '',
  urgentUntil: '',
  emergencyContact: {
    name: '',
    relationship: '',
    phone: '',
    altPhone: '',
    email: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  },
};

const mapPatientToFormValues = (patient: Patient): PatientFormValues => {
  const patientExtras = patient as unknown as Record<string, unknown>;
  const parsed = parseComorbiditiesFromList(patient.comorbidities);
  const sexRaw = (patient.sex || '').toLowerCase();
  const sex: PatientFormValues['sex'] =
    sexRaw === 'male' ? 'M' : sexRaw === 'female' ? 'F' : 'OTHER';

  return {
    id: patient.id,
    name: patient.name || '',
    age: patient.age,
    sex,
    mrn: patient.latestMrn || '',
    scheme: normalizeScheme(patient.scheme),
    pathway: (patient.pathway as PatientFormValues['pathway']) || 'surgical',
    status: patient.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    department: patient.department || '',
    currentState:
      (patient.currentState as PatientFormValues['currentState']) || 'onboarding',
    diagnosis: patient.diagnosis || '',
    comorbidities: parsed.selections,
    includeOtherComorbidity: parsed.includeOther,
    otherComorbidity: parsed.otherValue,
    procedureName: patient.procedureName || '',
    surgeryCode: (patientExtras.surgeryCode as string) || '',
    surgeryDate: (patientExtras.surgeryDate as string) || '',
    tidNumber: (patientExtras.tidNumber as string) || '',
    tidStatus: (patientExtras.tidStatus as string) || '',
    assignedDoctor: patient.assignedDoctor || '',
    assignedDoctorId: patient.assignedDoctorId || '',
    roomNumber: patient.roomNumber || '',
    filesUrl: (patientExtras.filesUrl as string) || '',
    isUrgent: Boolean(patientExtras.isUrgent),
    urgentReason: (patientExtras.urgentReason as string) || '',
    urgentUntil: (patientExtras.urgentUntil as string) || '',
    emergencyContact:
      (patient.emergencyContact as PatientFormValues['emergencyContact']) ||
      defaultFormValues.emergencyContact,
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const patientQueryResult = usePatient(patientId || '');
  const patientQuery = patientId ? patientQueryResult : null;
  const existingPatient = patientQueryResult.data;

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (existingPatient) {
      form.reset(mapPatientToFormValues(existingPatient));
    }
  }, [existingPatient, form]);

  const createMutation = useMutation({
    mutationFn: async (values: PatientFormValues) => {
      const payload = toCreatePayload(values);
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
        surgeryDate: payload.surgeryDate
          ? new Date(payload.surgeryDate).toISOString()
          : null,
        tidNumber: payload.tidNumber,
        tidStatus: payload.tidStatus,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({
        title: 'Patient added',
        description: `${res.patient.name} has been added successfully.`,
      });
      router.replace(`/patients/${res.patient.id}` as never);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add patient. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: PatientFormValues) => {
      if (!patientId || !existingPatient) {
        throw new Error('Patient ID required for update');
      }
      const payload = toUpdatePayload(
        values,
        existingPatient as unknown as SharedApiPatient
      );
      return api.patients.update(patientId, payload as unknown as Partial<Patient>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast({
        title: 'Patient updated',
        description: 'Patient details have been updated successfully.',
      });
      if (patientId) {
        router.replace(`/patients/${patientId}` as never);
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update patient. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const submitHandler = form.handleSubmit(
    async (values) => {
      if (isEditMode) {
        await updateMutation.mutateAsync(values);
      } else {
        await createMutation.mutateAsync(values);
      }
    },
    (errors) => {
      console.log('Validation failed:', errors);
    }
  );

  const onSubmit = async () => {
    await submitHandler();
  };

  return {
    form,
    onSubmit,
    isLoading: createMutation.isPending || updateMutation.isPending,
    isEditMode,
    patientQuery,
  };
}
