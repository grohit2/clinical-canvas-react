// Converts persisted discharge `sections` (from /discharge.mjs) into the
// builder-friendly summary + date overrides.
//
// Drop this next to structuredDischargeDocx.ts

import type {
  DischargeSummaryData,
} from "./structuredDischargeDocx";

type Sections = Record<string, Record<string, string> | undefined | null>;

const pick = (obj: Record<string, any> | undefined | null, k: string) =>
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
    const m = raw.match(/\s*([^\:]+)\s*:\s*$/); // e.g., "RIGHT INGUINOSCROTAL REGION:"
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

  // ------------- Administrative (date overrides) -------------
  const admin = (s["administrative"] || {}) as Record<string, string>;
  const doa = pick(admin, "doa") || undefined;
  const dos = pick(admin, "dos") || undefined;
  const dod = pick(admin, "dod") || undefined;

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

  // ------------- Examination (general + vitals) -------------
  const ex = (s["examination"] || {}) as Record<string, string>;
  const examBlocks: { title?: string; lines: string[] }[] = [];

  if (pick(ex, "generalExamination")) {
    examBlocks.push({ title: "General Examination", lines: splitLines(pick(ex, "generalExamination")) });
  }
  if (pick(ex, "generalFindings")) {
    examBlocks.push({ title: "General Physical Findings", lines: splitLines(pick(ex, "generalFindings")) });
  }

  const vitals: string[] = [];
  if (pick(ex, "temperature")) vitals.push(`Temperature: ${pick(ex, "temperature")}`);
  if (pick(ex, "pulse")) vitals.push(`Pulse: ${pick(ex, "pulse")}`);
  if (pick(ex, "respirationRate")) vitals.push(`Respiration Rate: ${pick(ex, "respirationRate")}`);
  if (pick(ex, "bloodPressure")) vitals.push(`Blood Pressure: ${pick(ex, "bloodPressure")}`);
  if (pick(ex, "spo2")) vitals.push(`SpO₂: ${pick(ex, "spo2")}`);
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
      // allow clinicians to define sub‑blocks like:
      // RIGHT INGUINOSCROTAL REGION:
      //   ...
      // LEFT INGUINAL SCROTAL REGION:
      //   ...
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
    { key: "cvs", label: "Cardiovascular System (CVS)" },
    { key: "cns", label: "Central Nervous System (CNS)" },
    { key: "resp", label: "Respiratory System (RESP)" },
    { key: "pa", label: "Per Abdomen (P/A)" },
  ];
  for (const { key, label } of sysMap) {
    const txt = pick(se, key);
    if (txt) examBlocks.push({ title: label, lines: splitLines(txt) });
  }

  // ------------- Impression / Diagnosis / Plan -------------
  const imp = (s["impression"] || {}) as Record<string, string>;
  const diagnosis = pick(imp, "provisionalDiagnosis") || undefined;
  const plan = pick(imp, "dischargePlan");

  // Naive heuristics to split plan → meds / advice / review line
  const dischargeMedication: string[] = [];
  const advice: string[] = [];
  let reviewPlan: string | undefined;

  for (const ln of splitLines(plan)) {
    if (/^\s*(tab\.|cap\.|syp\.|inj\.|tablet|capsule|syrup|drop)\b/i.test(ln) ||
        /\b(OD|BD|TID|QID|HS|PRN|mg|ml|\d+-\d+-\d+)\b/i.test(ln)) {
      dischargeMedication.push(ln);
    } else if (/^review/i.test(ln)) {
      reviewPlan = reviewPlan || ln;
    } else {
      advice.push(ln);
    }
  }

  const summary: DischargeSummaryData = {
    diagnosis,
    hpi,
    previousHistory,
    // Examination: use generic blocks so your inguinal subheads (if typed with ":")
    // render exactly as separate blocks under "ON EXAMINATION".
    examinationBlocks: examBlocks.length ? examBlocks : undefined,

    // You can enrich these from a dedicated section later if you add fields:
    // management, investigations, courseOfStay, intraOpFindings, referrals, postopCare
    dischargeMedication: dischargeMedication.length ? dischargeMedication : undefined,
    advice: advice.length ? advice : undefined,
    reviewPlan,
    // doctorName is picked from patient.assignedDoctor at export time
  };

  return {
    summary,
    overrideDates: { doa: doa || null, dos: dos || null, dod: dod || null },
  };
}
