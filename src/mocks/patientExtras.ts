import type { PatientDemographics, TimelineEntry } from "@/types/models";

export const MOCK_PATIENT_DEMOGRAPHICS: Record<string, PatientDemographics> = {
  "patient-001": {
    mrn: "patient-001", dob: "1975-03-15", age: 46, gender: "Female",
    room: "Room 204B", admissionDate: "2025-07-18", lengthOfStay: 3,
    nextMilestone: "Discharge Planning", nextMilestoneTime: "Expected tomorrow",
    allergies: ["Penicillin", "Latex"],
    emergencyContact: { name: "John Doe (Spouse)", phone: "+1-555-0123" },
  },
  "patient-002": {
    mrn: "patient-002", dob: "1980-08-22", age: 58, gender: "Male",
    room: "ICU Room 12", admissionDate: "2025-07-19", lengthOfStay: 1,
    nextMilestone: "Cardiology Consult", nextMilestoneTime: "This afternoon",
    allergies: ["Aspirin"],
    emergencyContact: { name: "Mary Smith (Wife)", phone: "+1-555-0456" },
  },
};

export const MOCK_TIMELINES: Record<string, TimelineEntry[]> = {
  "patient-001": [
    {
      patientId: "patient-001",
      state: "Admission",
      dateIn: "2025-07-18T08:00:00Z",
      dateOut: "2025-07-18T10:00:00Z",
      checklistIn: ["vitals-recorded", "allergies-checked"],
      checklistOut: ["pre-op-clearance"],
    },
    {
      patientId: "patient-001",
      state: "Pre-Op",
      dateIn: "2025-07-18T10:00:00Z",
      dateOut: "2025-07-18T14:00:00Z",
      checklistIn: ["consent-signed", "fasting-confirmed"],
      checklistOut: ["anesthesia-cleared"],
    },
    { patientId: "patient-001",
      state: "Surgery",
      dateIn: "2025-07-18T14:00:00Z",
      dateOut: "2025-07-18T16:30:00Z",
      checklistIn: ["timeout-completed","antibiotics-given"],
      checklistOut: ["procedure-completed","counts-correct"],
    },
    { patientId: "patient-001",
      state: "Post-Op",
      dateIn: "2025-07-18T16:30:00Z",
      checklistIn: ["recovery-stable","pain-managed"],
      checklistOut: [],
    },
  ],
  "patient-002": [
    {
      patientId: "patient-002",
      state: "Emergency",
      dateIn: "2025-07-19T12:00:00Z",
      dateOut: "2025-07-19T14:00:00Z",
      checklistIn: ["triage-completed","vitals-stable"],
      checklistOut: ["ecg-completed"],
    },
    {
      patientId: "patient-002",
      state: "ICU",
      dateIn: "2025-07-19T14:00:00Z",
      checklistIn: ["monitoring-active","medications-administered"],
      checklistOut: [],
    },
  ],
};