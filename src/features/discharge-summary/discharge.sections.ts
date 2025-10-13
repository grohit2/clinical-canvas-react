// Shared section contract used by Discharge form and Notes list rendering.

export type FieldType = "text" | "textarea" | "date";

export type SectionFieldDefinition = {
  key: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  rows?: number;
};

export type SectionDefinition = {
  key:
    | "administrative"
    | "presentingComplaint"
    | "pastHistory"
    | "examination"
    | "localExam"
    | "systemicExam"
    | "impression";
  shortLabel: string; // very compact for left nav
  title: string;      // full title for the right panel
  description?: string;
  fields: SectionFieldDefinition[];
};

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "administrative",
    shortLabel: "Admin",
    title: "Administrative Details",
    description: "Admission, surgery, and discharge milestones.",
    fields: [
      { key: "ipNumber", label: "IP No.", type: "text", placeholder: "Hospital in-patient number" },
      { key: "doa", label: "Date of Admission (DOA)", type: "date" },
      { key: "dos", label: "Date of Surgery (DOS)", type: "date" },
      { key: "dod", label: "Date of Discharge (DOD)", type: "date" },
    ],
  },
  {
    key: "presentingComplaint",
    shortLabel: "Complaint",
    title: "Presenting Complaint",
    description: "Capture the patient's chief complaints and history of presenting illness.",
    fields: [
      {
        key: "chiefComplaints",
        label: "Chief Complaints",
        type: "textarea",
        rows: 4,
        placeholder: "Key complaints at the time of admission",
      },
      {
        key: "hopi",
        label: "History of Present Illness (HOPI)",
        type: "textarea",
        rows: 4,
        placeholder: "Chronological narrative of the illness progression",
      },
    ],
  },
  {
    key: "pastHistory",
    shortLabel: "History",
    title: "Past and Personal History",
    description: "Summarise relevant medical, personal, and family history.",
    fields: [
      { key: "pastHistory", label: "Past History", type: "textarea", rows: 4, placeholder: "Significant medical or surgical history" },
      { key: "personalHistory", label: "Personal History", type: "textarea", rows: 3, placeholder: "Lifestyle, habits, occupational exposure" },
      { key: "familyHistory", label: "Family History", type: "textarea", rows: 3, placeholder: "Genetic or familial conditions of note" },
    ],
  },
  {
    key: "examination",
    shortLabel: "Clinical",
    title: "Clinical Examination",
    description: "Document general examination and current vitals.",
    fields: [
      { key: "generalExamination", label: "General Examination", type: "textarea", rows: 4, placeholder: "General appearance, orientation, build, nourishment" },
      { key: "generalFindings", label: "General Physical Findings", type: "textarea", rows: 4, placeholder: "Pallor, icterus, clubbing, edema, lymphadenopathy, etc." },
      { key: "temperature", label: "Temperature", type: "text", placeholder: "e.g. 98.6 °F" },
      { key: "pulse", label: "Pulse", type: "text", placeholder: "e.g. 78 bpm" },
      { key: "respirationRate", label: "Respiration Rate", type: "text", placeholder: "e.g. 18 / min" },
      { key: "bloodPressure", label: "Blood Pressure", type: "text", placeholder: "e.g. 120/80 mmHg" },
      { key: "spo2", label: "SpO₂", type: "text", placeholder: "e.g. 98 % on RA" },
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
    description: "Summarise findings for each major system.",
    fields: [
      { key: "cvs",  label: "Cardiovascular System (CVS)", type: "textarea", rows: 3, placeholder: "CVS findings" },
      { key: "cns",  label: "Central Nervous System (CNS)", type: "textarea", rows: 3, placeholder: "CNS findings" },
      { key: "resp", label: "Respiratory System (RESP)",   type: "textarea", rows: 3, placeholder: "Respiratory findings" },
      { key: "pa",   label: "Per Abdomen (P/A)",            type: "textarea", rows: 3, placeholder: "Per abdomen findings" },
    ],
  },
  {
    key: "impression",
    shortLabel: "Impression",
    title: "Clinical Impression",
    description: "Capture the working diagnosis and discharge advice.",
    fields: [
      { key: "provisionalDiagnosis", label: "Impression / Provisional Diagnosis", type: "textarea", rows: 4, placeholder: "Final diagnosis or key impression at discharge" },
      { key: "dischargePlan",        label: "Discharge Plan / Advice",           type: "textarea", rows: 4, placeholder: "Medications, follow-up, rehabilitation, and precautions" },
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
  return draft;
};

export const sectionHasAnyValue = (state: SectionState, key: SectionKey) =>
  Object.values(state[key] || {}).some(v => (v ?? "").trim().length > 0);
