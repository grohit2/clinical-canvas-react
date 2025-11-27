// Converts persisted discharge `sections` (from /discharge.mjs) into the
// builder-friendly summary + date overrides.
//
// Drop this next to structuredDischargeDocx.ts

import type {
  DischargeSummaryData,
} from "./structuredDischargeDocx";

type Sections = Record<string, Record<string, string> | undefined | null>;

const pick = (obj: Record<string, unknown> | undefined | null, k: string) =>
  (obj && typeof obj[k] === "string" ? String(obj[k]).trim() : "");

const splitLines = (s?: string) =>
  (s || "")
    .split(/\r?\n+/)
    .map((x) => x.trim())
    .filter(Boolean);

function parseTitledBlocks(text: string): { title?: string; lines: string[] }[] | null {
  const out: { title?: string; lines: string[] }[] = [];
  let curTitle: string | undefined;
  let cur: string[] = [];

  for (const raw of splitLines(text)) {
    const m = raw.match(/\s*([^:]+)\s*:\s*$/); // e.g., "RIGHT INGUINOSCROTAL REGION:"
    if (m) {
      if (cur.length) out.push({ title: curTitle, lines: cur });
      curTitle = m[1].trim();
      cur = [];
      continue;
    }
    cur.push(raw);
  }
  if (cur.length) out.push({ title: curTitle, lines: cur });
  return out.length ? out : null;
}

export function composeDocxSummaryFromSections(sections?: Sections): {
  summary: DischargeSummaryData;
  overrideDates: { doa?: string | null; dos?: string | null; dod?: string | null };
} {
  const s = (sections || {}) as Sections;

  // ------------- Administrative Dates -------------
  // Support both old "administrative" and new "administrativeDates" keys
  const adminDates = (s["administrativeDates"] || s["administrative"] || {}) as Record<string, string>;
  const doa = pick(adminDates, "doa") || undefined;
  const dos = pick(adminDates, "dos") || undefined;
  const dod = pick(adminDates, "dod") || undefined;

  // ------------- Patient Info -------------
  const patientInfo = (s["patientInfo"] || {}) as Record<string, string>;
  const patientName = pick(patientInfo, "name");
  const patientDistrict = pick(patientInfo, "district");

  // ------------- Clinical Info (new section) -------------
  const clinicalInfo = (s["clinicalInfo"] || {}) as Record<string, string>;
  const finalDiagnosis = pick(clinicalInfo, "finalDiagnosis");
  const procedure = pick(clinicalInfo, "procedure");
  const consultant = pick(clinicalInfo, "consultant");

  // ------------- Presenting Complaint -------------
  const pc = (s["presentingComplaint"] || {}) as Record<string, string>;
  const chief = pick(pc, "chiefComplaints");
  const hopi = pick(pc, "hopi");
  const hpi = [chief ? `Chief complaints: ${chief}` : "", hopi].filter(Boolean).join("\n\n") || undefined;

  // ------------- Past/Personal/Family → Previous History -------------
  const ph = (s["pastHistory"] || {}) as Record<string, string>;
  const prevParts: string[] = [];
  if (pick(ph, "pastHistory")) prevParts.push(`Past History:\n${pick(ph, "pastHistory")}`);
  if (pick(ph, "personalHistory")) prevParts.push(`Personal History:\n${pick(ph, "personalHistory")}`);
  if (pick(ph, "familyHistory")) prevParts.push(`Family History:\n${pick(ph, "familyHistory")}`);
  const previousHistory = prevParts.length ? prevParts.join("\n\n") : undefined;

  // ------------- Clinical Examination (General + vitals) -------------
  // Support both old "examination" and new "clinicalExamination" keys
  const ex = (s["clinicalExamination"] || s["examination"] || {}) as Record<string, string>;
  const examBlocks: { title?: string; lines: string[] }[] = [];

  if (pick(ex, "generalExamination")) {
    examBlocks.push({ title: "General Examination", lines: splitLines(pick(ex, "generalExamination")) });
  }
  if (pick(ex, "generalFindings")) {
    examBlocks.push({ title: "General Physical Findings", lines: splitLines(pick(ex, "generalFindings")) });
  }

  const vitals: string[] = [];
  if (pick(ex, "pulse")) vitals.push(`Pulse Rate: ${pick(ex, "pulse")}`);
  if (pick(ex, "bloodPressure")) vitals.push(`Blood Pressure: ${pick(ex, "bloodPressure")}`);
  if (pick(ex, "respirationRate")) vitals.push(`Respiratory Rate: ${pick(ex, "respirationRate")}`);
  if (pick(ex, "temperature")) vitals.push(`Temperature: ${pick(ex, "temperature")}`);
  if (pick(ex, "spo2")) vitals.push(`SpO₂: ${pick(ex, "spo2")}`);
  if (pick(ex, "grbs")) vitals.push(`GRBS: ${pick(ex, "grbs")}`);
  if (vitals.length) examBlocks.push({ title: "Vitals", lines: vitals });

  // ------------- Local Examination -------------
  const le = (s["localExam"] || {}) as Record<string, string>;
  const localFields: Array<{ key: string; label: string }> = [
    { key: "inspection", label: "Inspection" },
    { key: "palpation", label: "Palpation" },
    { key: "percussion", label: "Percussion" },
    { key: "auscultation", label: "Auscultation" },
    { key: "perRectal", label: "Per Rectal Examination" },
  ];
  for (const { key, label } of localFields) {
    const txt = pick(le, key);
    if (!txt) continue;
    const titled = parseTitledBlocks(txt);
    if (titled) {
      for (const b of titled) {
        examBlocks.push({ title: b.title || label, lines: b.lines });
      }
    } else {
      examBlocks.push({ title: label, lines: splitLines(txt) });
    }
  }

  // ------------- Systemic Examination -------------
  const se = (s["systemicExam"] || {}) as Record<string, string>;
  const sysMap: Array<{ key: string; label: string }> = [
    { key: "cvs", label: "CVS" },
    { key: "cns", label: "CNS" },
    { key: "resp", label: "Respiratory" },
    { key: "pa", label: "Per Abdomen" },
  ];
  for (const { key, label } of sysMap) {
    const txt = pick(se, key);
    if (txt) examBlocks.push({ title: label, lines: splitLines(txt) });
  }

  // ------------- Condition at Discharge -------------
  const condAtDischarge = (s["conditionAtDischarge"] || {}) as Record<string, string>;
  const conditionAtDischarge = pick(condAtDischarge, "conditionAtDischarge");

  // ------------- Hospital Course -------------
  const hospitalCourse = (s["hospitalCourse"] || {}) as Record<string, string>;
  const courseOfStay = pick(hospitalCourse, "courseOfStay") || undefined;

  // ------------- Investigations -------------
  const investigations = (s["investigations"] || {}) as Record<string, string>;
  const labInv = pick(investigations, "labInvestigations");
  const radioInv = pick(investigations, "radiologicalInvestigations");
  const investigationsList: (string | { title?: string; lines: string[] })[] = [];
  if (labInv) investigationsList.push({ title: "Laboratory", lines: splitLines(labInv) });
  if (radioInv) investigationsList.push({ title: "Radiological", lines: splitLines(radioInv) });

  // ------------- Discharge Medication -------------
  const dischargeMed = (s["dischargeMedication"] || {}) as Record<string, string>;
  const dischargeMedication = splitLines(pick(dischargeMed, "dischargeMedication"));

  // ------------- Advice & Review -------------
  const adviceReview = (s["adviceReview"] || {}) as Record<string, string>;
  const advice = splitLines(pick(adviceReview, "advice"));
  const reviewPlan = pick(adviceReview, "reviewPlan") || undefined;

  // ------------- Fallback: old "impression" section -------------
  const imp = (s["impression"] || {}) as Record<string, string>;
  const oldDiagnosis = pick(imp, "provisionalDiagnosis");
  const oldPlan = pick(imp, "dischargePlan");

  // Use old values as fallback if new ones are empty
  const diagnosis = finalDiagnosis || oldDiagnosis || undefined;

  // If old dischargePlan exists and new fields are empty, parse it
  if (!dischargeMedication.length && !advice.length && oldPlan) {
    for (const ln of splitLines(oldPlan)) {
      if (/^\s*(tab\.|cap\.|syp\.|inj\.|tablet|capsule|syrup|drop)\b/i.test(ln) ||
          /\b(OD|BD|TID|QID|HS|PRN|mg|ml|\d+-\d+-\d+)\b/i.test(ln)) {
        dischargeMedication.push(ln);
      } else if (/^review/i.test(ln) && !reviewPlan) {
        // skip - already parsed
      } else {
        advice.push(ln);
      }
    }
  }

  // Build management line from procedure
  const management = procedure
    ? `${procedure.toUpperCase()} under SA` + (dos ? ` on ${new Date(dos).toLocaleDateString()}` : "")
    : undefined;

  const summary: DischargeSummaryData = {
    diagnosis,
    management,
    hpi,
    previousHistory,
    examinationBlocks: examBlocks.length ? examBlocks : undefined,
    investigations: investigationsList.length ? investigationsList : undefined,
    courseOfStay: conditionAtDischarge
      ? (courseOfStay ? `${courseOfStay}\n\nCondition at Discharge: ${conditionAtDischarge}` : `Condition at Discharge: ${conditionAtDischarge}`)
      : courseOfStay,
    dischargeMedication: dischargeMedication.length ? dischargeMedication : undefined,
    advice: advice.length ? advice : undefined,
    reviewPlan,
    doctorName: consultant || undefined,
  };

  return {
    summary,
    overrideDates: { doa: doa || null, dos: dos || null, dod: dod || null },
  };
}
