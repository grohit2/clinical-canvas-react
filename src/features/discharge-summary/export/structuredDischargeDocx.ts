// Front-end .docx builder for Discharge Summary (uses `docx`)
import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  Footer,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

/* --------------------------------- Types ---------------------------------- */
export type PatientLite = {
  id?: string | null;            // patient_uid
  patientId?: string | null;     // alias if needed
  name?: string | null;
  age?: number | null;
  sex?: string | null;           // 'M' | 'F' | 'Male' | 'Female' | etc.
  latestMrn?: string | null;     // Reg No
  department?: string | null;    // e.g., GES
  roomNumber?: string | null;    // e.g., G31A third floor
  assignedDoctor?: string | null;// Dr. ...
  surgeryDate?: string | null;   // ISO
  procedureName?: string | null; // Optional
};

export type TimelineLite = {
  state: string;           // onboarding | preop | intraop | postop | discharge-init | discharge | ...
  date_in?: string | null; // ISO
  date_out?: string | null;// ISO
};

export type DischargeMedicationItem =
  | string
  | {
      name: string;
      dose?: string;
      freq?: string;
      schedule?: string;
      duration?: string;
      notes?: string;
    };

export type DischargeSummaryData = {
  diagnosis?: string;
  management?: string;
  hpi?: string;
  previousHistory?: string;
  // New: generic examination blocks (preferred if provided)
  examinationBlocks?: { title?: string; lines: string[] }[];
  // Back-compat (used if examinationBlocks not provided)
  examination?: {
    rightInguinoScrotal?: string[];
    leftInguinoScrotal?: string[];
    percussion?: string[];
    auscultation?: string[];
  };
  investigations?: (string | { title?: string; lines: string[] })[];
  courseOfStay?: string;
  intraOpFindings?: string[];
  referrals?: string[];
  postopCare?: string;
  dischargeMedication?: DischargeMedicationItem[];
  advice?: string[];
  reviewPlan?: string;
  doctorName?: string;
};

export type Letterhead = {
  hospitalName: string;
  addressLines?: string[];
  department?: string;
};

export type BuildOpts = {
  title?: string; // default 'DISCHARGE SUMMARY'
  patient: PatientLite;
  timeline?: TimelineLite[];
  summary: DischargeSummaryData;
  bulletInvestigations?: boolean;
  letterhead?: Letterhead;
  overrideDates?: { doa?: string | null; dos?: string | null; dod?: string | null };
};

/* ------------------------------ Public API -------------------------------- */
export async function buildStructuredDischargeDocxBlob({
  title = "DISCHARGE SUMMARY",
  patient,
  timeline = [],
  summary,
  bulletInvestigations = false,
  letterhead,
  overrideDates,
}: BuildOpts): Promise<Blob> {
  const docChildren: (Paragraph | Table)[] = [];

  // Optional letterhead
  if (letterhead) {
    docChildren.push(...letterheadBlocks(letterhead));
  }

  // Title block
  docChildren.push(titleBlock(title));

  // Patient Details
  const { doa, dod, dos } = deriveDates(timeline, patient, overrideDates);
  const detailsTable = makePatientDetailsTable({ patient, doa, dos, dod });

  // Assemble body
  docChildren.push(
    sectionRule(),
    sectionHeading("Patient Details"),
    new Paragraph({ text: "" }),
    detailsTable,
    new Paragraph({ text: "" }),
  );

  pushColonLine(docChildren, "DIAGNOSIS", summary.diagnosis);
  pushColonLine(
    docChildren,
    "MANAGEMENT",
    summary.management || autoManagementLine(patient, dos)
  );

  pushParagraphIfAny(docChildren, summary.hpi);
  pushParagraphIfAny(docChildren, summary.previousHistory, "Previous History");

  // Examination — prefer generic blocks, else legacy keys
  const blocks = (summary.examinationBlocks || []).filter(b => b && b.lines && b.lines.length);
  if (blocks.length) {
    docChildren.push(sectionHeading("ON EXAMINATION"));
    for (const b of blocks) {
      if (b.title) docChildren.push(subHeading(b.title));
      for (const ln of b.lines) {
        docChildren.push(new Paragraph({ text: ln, numbering: { reference: NUMREF_BULLET, level: 0 } }));
      }
    }
  } else if (summary.examination && hasAnyExamination(summary.examination)) {
    docChildren.push(sectionHeading("ON EXAMINATION"));
    pushBulletBlock(docChildren, summary.examination.rightInguinoScrotal, "RIGHT INGUINOSCROTAL REGION");
    pushBulletBlock(docChildren, summary.examination.leftInguinoScrotal, "LEFT INGUINAL SCROTAL REGION");
    pushBulletBlock(docChildren, summary.examination.percussion, "Percussion");
    pushBulletBlock(docChildren, summary.examination.auscultation, "Auscultation");
  }

  // Investigations
  if (summary.investigations && summary.investigations.length) {
    docChildren.push(sectionHeading("INVESTIGATIONS: ENCLOSED"));
    for (const inv of summary.investigations) {
      if (typeof inv === "string") {
        docChildren.push(
          bulletInvestigations
            ? new Paragraph({ text: inv, numbering: { reference: NUMREF_BULLET, level: 0 } })
            : new Paragraph({ text: inv }),
        );
      } else if (inv && inv.lines?.length) {
        if (inv.title) docChildren.push(subHeading(inv.title));
        for (const ln of inv.lines) docChildren.push(new Paragraph({ text: ln }));
      }
    }
  }

  // Course of stay
  pushParagraphIfAny(docChildren, summary.courseOfStay, "COURSE OF HOSPITAL STAY");

  // Intra‑op findings
  pushBulletBlock(docChildren, summary.intraOpFindings, "INTRA OP FINDINGS");

  // Referrals & Post‑op care
  pushBulletBlock(docChildren, summary.referrals, "Referrals");
  pushParagraphIfAny(docChildren, summary.postopCare, "Postoperative Care");

  // Discharge medication (numbered)
  if (summary.dischargeMedication && summary.dischargeMedication.length) {
    docChildren.push(sectionHeading("DISCHARGE MEDICATION"));
    for (const item of summary.dischargeMedication) {
      const line = typeof item === "string" ? item : medLine(item);
      docChildren.push(
        new Paragraph({
          text: line,
          numbering: { reference: NUMREF_NUMBERED, level: 0 },
        })
      );
    }
  }

  // Advice (bulleted)
  if (summary.advice && summary.advice.length) {
    docChildren.push(sectionHeading("ADVICE"));
    for (const a of summary.advice) {
      docChildren.push(
        new Paragraph({
          text: a,
          numbering: { reference: NUMREF_BULLET, level: 0 },
        })
      );
    }
  }

  // Review plan
  pushParagraphIfAny(docChildren, summary.reviewPlan, "Review Plan");

  // Signature
  const signName = summary.doctorName || patient.assignedDoctor || "";
  if (signName) {
    docChildren.push(new Paragraph({ text: "" }));
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "SIGNATURE OF DOCTOR", bold: true })],
      })
    );
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: signName, bold: true })],
      })
    );
  }

  // Footer with page numbers
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun("Page "),
          PageNumber.CURRENT,
          new TextRun(" of "),
          PageNumber.TOTAL_PAGES,
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: defaultStyles(),
    numbering: numberingConfig(),
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.7),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.7),
            },
          },
        },
        footers: { default: footer },
        children: docChildren,
      },
    ],
  });

  return Packer.toBlob(doc);
}

/* ------------------------------ File name util --------------------------- */
export function safeFileName(base: string, ext = ".docx"): string {
  const cleaned = base
    .replace(/[^a-z0-9_\-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const yyyy_mm_dd = new Date().toISOString().slice(0, 10);
  return `${cleaned || "Discharge_Summary"}_${yyyy_mm_dd}${ext}`;
}

/* ------------------------------ Styles & Num ----------------------------- */
const NUMREF_BULLET = "cc-bullet";
const NUMREF_NUMBERED = "cc-numbered";

function defaultStyles() {
  return {
    default: {
      document: {
        run: { font: "Times New Roman", size: 22 }, // 11pt
        paragraph: { spacing: { after: 120 } },
      },
    },
    paragraphStyles: [
      {
        id: "cc-heading-2",
        name: "CC Heading 2",
        basedOn: "Heading2",
        next: "Normal",
        quickFormat: true,
        run: { bold: true, size: 26 },
        paragraph: { spacing: { before: 120, after: 60 } },
      },
      {
        id: "cc-subheading",
        name: "CC Subheading",
        basedOn: "Normal",
        run: { bold: true },
        paragraph: { spacing: { before: 80, after: 40 } },
      },
      {
        id: "cc-kv-label",
        name: "CC Key Label",
        basedOn: "Normal",
        run: { bold: true },
      },
    ],
  } as const;
}

function numberingConfig() {
  return {
    config: [
      {
        reference: NUMREF_BULLET,
        levels: [{ level: 0, format: "bullet", text: "\u2022", alignment: AlignmentType.LEFT }],
      },
      {
        reference: NUMREF_NUMBERED,
        levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT }],
      },
    ],
  } as const;
}

/* ------------------------------ Builders -------------------------------- */
function titleBlock(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 160 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true })],
  });
}

function letterheadBlocks(lh: Letterhead): Paragraph[] {
  const arr: Paragraph[] = [];
  if (lh.hospitalName) {
    arr.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 40 },
      children: [new TextRun({ text: lh.hospitalName.toUpperCase(), bold: true })],
    }));
  }
  if (lh.addressLines?.length) {
    for (const line of lh.addressLines) {
      arr.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: line })],
      }));
    }
  }
  if (lh.department) {
    arr.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 20 },
      children: [new TextRun({ text: lh.department })],
    }));
  }
  // spacer
  arr.push(new Paragraph({ text: "" }));
  return arr;
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    style: "cc-heading-2",
    children: [new TextRun({ text: text.toUpperCase(), bold: true })],
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    style: "cc-subheading",
    children: [new TextRun({ text, bold: true })],
  });
}

function sectionRule(): Paragraph {
  return new Paragraph({
    border: {
      bottom: { color: "BFBFBF", space: 1, size: 6, style: BorderStyle.SINGLE },
    },
  });
}

function kvRow(label: string, value?: string | null): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        width: { size: 32, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            style: "cc-kv-label",
            children: [new TextRun({ text: label })],
          }),
        ],
      }),
      new TableCell({
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        width: { size: 68, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ text: value || "—" })],
      }),
    ],
  });
}

function makePatientDetailsTable({
  patient,
  doa,
  dos,
  dod,
}: {
  patient: PatientLite;
  doa?: string | null;
  dos?: string | null;
  dod?: string | null;
}): Table {
  const ageSex = compactJoin(
    [patient.age != null ? `${patient.age}Y` : null, sexCompact(patient.sex)],
    "/"
  );
  const ward = compactJoin([patient.department, patient.roomNumber], " ");

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      kvRow("Name", patient.name || ""),
      kvRow("Age / Sex", ageSex || ""),
      kvRow("Ward", ward || ""),
      kvRow("RegNo", patient.latestMrn || ""),
      kvRow("IP NO", patient.id || patient.patientId || ""),
      kvRow("Doctor Name", patient.assignedDoctor || ""),
      kvRow("DOA", fmtDate(doa)),
      kvRow("DOS", fmtDate(dos)),
      kvRow("DOD", fmtDate(dod)),
    ],
  });
}

function pushColonLine(arr: (Paragraph | Table)[], label: string, value?: string | null) {
  if (!value) return;
  arr.push(
    new Paragraph({
      children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })],
    })
  );
}

function pushParagraphIfAny(
  arr: (Paragraph | Table)[],
  text?: string | null,
  heading?: string
) {
  if (!text) return;
  if (heading) arr.push(sectionHeading(heading));
  const parts = text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) arr.push(new Paragraph({ text: p }));
}

function pushBulletBlock(
  arr: (Paragraph | Table)[],
  lines?: string[] | null,
  heading?: string
) {
  if (!lines || !lines.length) return;
  if (heading) arr.push(subHeading(heading));
  for (const ln of lines) {
    arr.push(new Paragraph({ text: ln, numbering: { reference: NUMREF_BULLET, level: 0 } }));
  }
}

/* ----------------------------- Derivations ------------------------------- */
function deriveDates(
  timeline: TimelineLite[],
  patient: PatientLite,
  overrides?: { doa?: string | null; dos?: string | null; dod?: string | null }
) {
  const sorted = [...(timeline || [])]
    .map((t) => ({ ...t, t: new Date(t.date_in || t.date_out || 0).getTime() }))
    .sort((a, b) => a.t - b.t);

  const doaCalc = sorted[0]?.date_in || sorted[0]?.date_out || null;

  const dischargeEntry = timeline.find((t) => (t.state || "").toLowerCase() === "discharge");
  const dodCalc = dischargeEntry?.date_in || dischargeEntry?.date_out || null;

  const intra = timeline.find((t) => (t.state || "").toLowerCase() === "intraop");
  const dosCalc = patient.surgeryDate || intra?.date_in || intra?.date_out || null;

  // Prefer explicit overrides from Admin section if present
  return {
    doa: overrides?.doa ?? doaCalc,
    dos: overrides?.dos ?? dosCalc,
    dod: overrides?.dod ?? dodCalc,
  };
}

function sexCompact(sex?: string | null): string | null {
  if (!sex) return null;
  const s = sex.toString().trim().toUpperCase();
  if (["MALE", "M"].includes(s)) return "M";
  if (["FEMALE", "F"].includes(s)) return "F";
  return s.slice(0, 1);
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function compactJoin(parts: (string | null | undefined)[], sep: string): string | null {
  const ok = parts.map((p) => (p ?? "").trim()).filter(Boolean);
  return ok.length ? ok.join(sep) : null;
}

function autoManagementLine(patient: PatientLite, dos?: string | null) {
  const proc = patient?.procedureName || undefined;
  const base = proc ? String(proc).toUpperCase() : "SURGERY";
  const anaes = "SA"; // default
  return `${base} under ${anaes}${dos ? ` on ${fmtDate(dos)}` : ""}`;
}

function medLine(m: Exclude<DischargeMedicationItem, string>): string {
  const parts = [m.name];
  if (m.dose) parts.push(m.dose);
  if (m.freq) parts.push(m.freq);
  if (m.schedule) parts.push(m.schedule);
  if (m.duration) parts.push(m.duration);
  const core = parts.filter(Boolean).join(" ");
  return m.notes ? `${core} — ${m.notes}` : core;
}

function hasAnyExamination(ex?: DischargeSummaryData["examination"]): boolean {
  if (!ex) return false;
  return Boolean(
    (ex.rightInguinoScrotal && ex.rightInguinoScrotal.length) ||
      (ex.leftInguinoScrotal && ex.leftInguinoScrotal.length) ||
      (ex.percussion && ex.percussion.length) ||
      (ex.auscultation && ex.auscultation.length)
  );
}
