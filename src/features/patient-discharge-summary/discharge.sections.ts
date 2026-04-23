// Shared section contract used by Discharge form and Notes list rendering.

export type FieldType = "text" | "textarea" | "date";

export type SectionFieldDefinition = {
  key: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  rows?: number;
  autoFillKey?: string; // Key to auto-fill from patient data
  readOnly?: boolean;   // Read-only field (auto-filled)
};

export type SectionDefinition = {
  key:
    | "patientInfo"
    | "administrativeDates"
    | "clinicalInfo"
    | "presentingComplaint"
    | "pastHistory"
    | "clinicalExamination"
    | "localExam"
    | "systemicExam"
    | "conditionAtDischarge"
    | "hospitalCourse"
    | "investigations"
    | "dischargeMedication"
    | "adviceReview";
  shortLabel: string; // very compact for left nav
  title: string;      // full title for the right panel
  description?: string;
  fields: SectionFieldDefinition[];
};

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "patientInfo",
    shortLabel: "Patient",
    title: "Patient Information",
    description: "Basic patient identification details.",
    fields: [
      { key: "name", label: "Name", type: "text", placeholder: "Patient full name", autoFillKey: "name", readOnly: true },
      { key: "age", label: "Age", type: "text", placeholder: "e.g. 45", autoFillKey: "age", readOnly: true },
      { key: "sex", label: "Sex", type: "text", placeholder: "Male / Female", autoFillKey: "sex", readOnly: true },
      { key: "mrn", label: "MRN / Reg No.", type: "text", placeholder: "Registration number", autoFillKey: "latestMrn", readOnly: true },
      { key: "ipNumber", label: "IP No.", type: "text", placeholder: "In-patient number" },
      { key: "district", label: "District", type: "text", placeholder: "Patient's district" },
    ],
  },
  {
    key: "administrativeDates",
    shortLabel: "Dates",
    title: "Administrative Dates",
    description: "Key dates during hospital stay.",
    fields: [
      { key: "doa", label: "Date of Admission (DOA)", type: "date" },
      { key: "dos", label: "Date of Surgery (DOS)", type: "date", autoFillKey: "surgeryDate" },
      { key: "dod", label: "Date of Discharge (DOD)", type: "date" },
    ],
  },
  {
    key: "clinicalInfo",
    shortLabel: "Clinical",
    title: "Clinical Information",
    description: "Diagnosis, procedure, and consultant details.",
    fields: [
      { key: "finalDiagnosis", label: "Final Diagnosis", type: "textarea", rows: 3, placeholder: "Final diagnosis at discharge", autoFillKey: "diagnosis" },
      { key: "procedure", label: "Procedure", type: "textarea", rows: 2, placeholder: "Surgical/medical procedure performed", autoFillKey: "procedureName" },
      { key: "consultant", label: "Consultant", type: "text", placeholder: "Treating consultant name", autoFillKey: "assignedDoctor" },
    ],
  },
  {
    key: "presentingComplaint",
    shortLabel: "Complaint",
    title: "Presenting Complaint",
    description: "Chief complaints and history of presenting illness.",
    fields: [
      { key: "chiefComplaints", label: "Chief Complaints", type: "textarea", rows: 4, placeholder: "Key complaints at the time of admission" },
      { key: "hopi", label: "History of Presenting Illness", type: "textarea", rows: 4, placeholder: "Chronological narrative of the illness progression" },
    ],
  },
  {
    key: "pastHistory",
    shortLabel: "History",
    title: "Past, Personal & Family History",
    description: "Relevant medical, personal, and family history.",
    fields: [
      { key: "pastHistory", label: "Past History", type: "textarea", rows: 3, placeholder: "Significant medical or surgical history" },
      { key: "personalHistory", label: "Personal History", type: "textarea", rows: 3, placeholder: "Lifestyle, habits, occupational exposure" },
      { key: "familyHistory", label: "Family History", type: "textarea", rows: 3, placeholder: "Genetic or familial conditions of note" },
    ],
  },
  {
    key: "clinicalExamination",
    shortLabel: "General",
    title: "Clinical Examination",
    description: "General examination and vital signs.",
    fields: [
      { key: "generalExamination", label: "General Examination", type: "textarea", rows: 3, placeholder: "General appearance, orientation, build, nourishment" },
      { key: "generalFindings", label: "General Physical Findings", type: "textarea", rows: 3, placeholder: "Pallor, icterus, clubbing, edema, lymphadenopathy, etc." },
      { key: "pulse", label: "Pulse Rate", type: "text", placeholder: "e.g. 78 bpm" },
      { key: "bloodPressure", label: "Blood Pressure", type: "text", placeholder: "e.g. 120/80 mmHg" },
      { key: "respirationRate", label: "Respiratory Rate", type: "text", placeholder: "e.g. 18 / min" },
      { key: "temperature", label: "Temperature", type: "text", placeholder: "e.g. 98.6 °F" },
      { key: "spo2", label: "SpO₂", type: "text", placeholder: "e.g. 98 % on RA" },
      { key: "grbs", label: "GRBS", type: "text", placeholder: "e.g. 120 mg/dL" },
    ],
  },
  {
    key: "localExam",
    shortLabel: "Local",
    title: "Local Examination",
    description: "Focused examination relevant to the presenting complaint.",
    fields: [
      { key: "inspection", label: "Inspection", type: "textarea", rows: 3, placeholder: "Inspection findings" },
      { key: "palpation", label: "Palpation", type: "textarea", rows: 3, placeholder: "Palpation findings" },
      { key: "percussion", label: "Percussion", type: "textarea", rows: 3, placeholder: "Percussion findings" },
      { key: "auscultation", label: "Auscultation", type: "textarea", rows: 3, placeholder: "Auscultation findings" },
      { key: "perRectal", label: "Per Rectal Examination", type: "textarea", rows: 3, placeholder: "Per rectal examination findings" },
    ],
  },
  {
    key: "systemicExam",
    shortLabel: "Systemic",
    title: "Systemic Examination",
    description: "Findings for each major system.",
    fields: [
      { key: "cvs", label: "CVS", type: "textarea", rows: 2, placeholder: "e.g. S1S2 heard" },
      { key: "cns", label: "CNS", type: "textarea", rows: 2, placeholder: "e.g. No focal neurological deficits" },
      { key: "resp", label: "Respiratory", type: "textarea", rows: 2, placeholder: "e.g. Normal Vesicular Breath Sounds" },
      { key: "pa", label: "Per Abdomen", type: "textarea", rows: 2, placeholder: "Per abdomen findings" },
    ],
  },
  {
    key: "conditionAtDischarge",
    shortLabel: "Condition",
    title: "Condition at Discharge",
    description: "Patient's condition at the time of discharge.",
    fields: [
      { key: "conditionAtDischarge", label: "Condition at Time of Discharge", type: "textarea", rows: 4, placeholder: "Describe the patient's clinical condition at discharge" },
    ],
  },
  {
    key: "hospitalCourse",
    shortLabel: "Course",
    title: "Course of Hospital Stay",
    description: "Summary of treatment and events during hospital stay.",
    fields: [
      { key: "courseOfStay", label: "Course of Hospital Stay", type: "textarea", rows: 6, placeholder: "Detailed summary of treatment, procedures, and clinical progress during admission" },
    ],
  },
  {
    key: "investigations",
    shortLabel: "Labs",
    title: "Investigations",
    description: "Laboratory and radiological investigations.",
    fields: [
      { key: "labInvestigations", label: "Laboratory Investigations", type: "textarea", rows: 4, placeholder: "Blood tests, urine analysis, etc." },
      { key: "radiologicalInvestigations", label: "Radiological Investigations", type: "textarea", rows: 4, placeholder: "X-ray, CT, MRI, USG findings" },
    ],
  },
  {
    key: "dischargeMedication",
    shortLabel: "Meds",
    title: "Discharge Medication",
    description: "Medications prescribed at discharge.",
    fields: [
      { key: "dischargeMedication", label: "Discharge Medication", type: "textarea", rows: 8, placeholder: "List all medications with dosage, frequency, and duration\n\n1. Tab. ...\n2. Cap. ...\n3. Inj. ..." },
    ],
  },
  {
    key: "adviceReview",
    shortLabel: "Advice",
    title: "Advice & Review",
    description: "Post-discharge advice and follow-up plan.",
    fields: [
      { key: "advice", label: "Advice", type: "textarea", rows: 6, placeholder: "Diet, activity, wound care, warning signs, etc." },
      { key: "reviewPlan", label: "Review", type: "text", placeholder: "e.g. Review at OPD after 7 days" },
    ],
  },
];

export type SectionKey = (typeof SECTION_DEFINITIONS)[number]["key"];
export type SectionState = Record<SectionKey, Record<string, string>>;

export const buildEmptySectionState = (): SectionState =>
  SECTION_DEFINITIONS.reduce((acc, section) => {
    acc[section.key] = Object.fromEntries(section.fields.map(f => [f.key, ""])) as Record<string, string>;
    return acc;
  }, {} as SectionState);

export const adaptSections = (sections: Record<string, unknown> | undefined | null): SectionState => {
  const draft = buildEmptySectionState();
  if (!sections || typeof sections !== "object") return draft;

  for (const [sectionKey, sectionValue] of Object.entries(sections)) {
    if (!Object.prototype.hasOwnProperty.call(draft, sectionKey)) continue;
    const current = draft[sectionKey as SectionKey];
    if (sectionValue && typeof sectionValue === "object") {
      for (const [fieldKey, fieldValue] of Object.entries(sectionValue as Record<string, unknown>)) {
        if (typeof fieldValue === "string" && Object.prototype.hasOwnProperty.call(current, fieldKey)) {
          current[fieldKey] = fieldValue;
        }
      }
    } else if (typeof sectionValue === "string") {
      const firstField = SECTION_DEFINITIONS.find(s => s.key === sectionKey)?.fields[0];
      if (firstField) current[firstField.key] = sectionValue;
    }
  }

  // Migration: map old section keys to new ones
  const oldToNew: Record<string, { section: SectionKey; field: string }> = {
    // Old administrative -> new sections
    "administrative.ipNumber": { section: "patientInfo", field: "ipNumber" },
    "administrative.doa": { section: "administrativeDates", field: "doa" },
    "administrative.dos": { section: "administrativeDates", field: "dos" },
    "administrative.dod": { section: "administrativeDates", field: "dod" },
    // Old presentingComplaint -> new
    "presentingComplaint.chiefComplaints": { section: "presentingComplaint", field: "chiefComplaints" },
    "presentingComplaint.hopi": { section: "presentingComplaint", field: "hopi" },
    // Old pastHistory -> new
    "pastHistory.pastHistory": { section: "pastHistory", field: "pastHistory" },
    "pastHistory.personalHistory": { section: "pastHistory", field: "personalHistory" },
    "pastHistory.familyHistory": { section: "pastHistory", field: "familyHistory" },
    // Old examination -> new clinicalExamination
    "examination.generalExamination": { section: "clinicalExamination", field: "generalExamination" },
    "examination.generalFindings": { section: "clinicalExamination", field: "generalFindings" },
    "examination.temperature": { section: "clinicalExamination", field: "temperature" },
    "examination.pulse": { section: "clinicalExamination", field: "pulse" },
    "examination.respirationRate": { section: "clinicalExamination", field: "respirationRate" },
    "examination.bloodPressure": { section: "clinicalExamination", field: "bloodPressure" },
    "examination.spo2": { section: "clinicalExamination", field: "spo2" },
    // Old localExam -> new
    "localExam.inspection": { section: "localExam", field: "inspection" },
    "localExam.palpation": { section: "localExam", field: "palpation" },
    "localExam.percussion": { section: "localExam", field: "percussion" },
    "localExam.auscultation": { section: "localExam", field: "auscultation" },
    "localExam.perRectal": { section: "localExam", field: "perRectal" },
    // Old systemicExam -> new
    "systemicExam.cvs": { section: "systemicExam", field: "cvs" },
    "systemicExam.cns": { section: "systemicExam", field: "cns" },
    "systemicExam.resp": { section: "systemicExam", field: "resp" },
    "systemicExam.pa": { section: "systemicExam", field: "pa" },
    // Old impression -> new clinicalInfo + adviceReview
    "impression.provisionalDiagnosis": { section: "clinicalInfo", field: "finalDiagnosis" },
    "impression.dischargePlan": { section: "adviceReview", field: "advice" },
  };

  // Apply migrations from old format
  if (sections && typeof sections === "object") {
    for (const [oldSectionKey, oldSectionValue] of Object.entries(sections)) {
      if (oldSectionValue && typeof oldSectionValue === "object") {
        for (const [oldFieldKey, value] of Object.entries(oldSectionValue as Record<string, unknown>)) {
          const mapping = oldToNew[`${oldSectionKey}.${oldFieldKey}`];
          if (mapping && typeof value === "string" && value.trim()) {
            // Only migrate if target is empty
            if (!draft[mapping.section][mapping.field]?.trim()) {
              draft[mapping.section][mapping.field] = value;
            }
          }
        }
      }
    }
  }

  return draft;
};

export const sectionHasAnyValue = (state: SectionState, key: SectionKey) =>
  Object.values(state[key] || {}).some(v => (v ?? "").trim().length > 0);

// Helper to get all auto-fill mappings
export const getAutoFillMappings = (): { section: SectionKey; field: string; patientKey: string }[] => {
  const mappings: { section: SectionKey; field: string; patientKey: string }[] = [];
  for (const section of SECTION_DEFINITIONS) {
    for (const field of section.fields) {
      if (field.autoFillKey) {
        mappings.push({
          section: section.key,
          field: field.key,
          patientKey: field.autoFillKey,
        });
      }
    }
  }
  return mappings;
};
