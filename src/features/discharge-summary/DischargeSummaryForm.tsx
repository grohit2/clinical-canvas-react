import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Check, Loader2, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import type { DischargeSummaryVersion } from "@/types/api";

type FieldType = "text" | "textarea" | "date";

type SectionFieldDefinition = {
  key: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  rows?: number;
};

type SectionDefinition = {
  key: "administrative" | "presentingComplaint" | "pastHistory" | "examination" | "localExam" | "systemicExam" | "impression";
  shortLabel: string;
  title: string;
  description?: string;
  fields: SectionFieldDefinition[];
};

const SECTION_DEFINITIONS: SectionDefinition[] = [
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
      {
        key: "pastHistory",
        label: "Past History",
        type: "textarea",
        rows: 4,
        placeholder: "Significant medical or surgical history",
      },
      {
        key: "personalHistory",
        label: "Personal History",
        type: "textarea",
        rows: 3,
        placeholder: "Lifestyle, habits, occupational exposure",
      },
      {
        key: "familyHistory",
        label: "Family History",
        type: "textarea",
        rows: 3,
        placeholder: "Genetic or familial conditions of note",
      },
    ],
  },
  {
    key: "examination",
    shortLabel: "Clinical",
    title: "Clinical Examination",
    description: "Document general examination and current vitals.",
    fields: [
      {
        key: "generalExamination",
        label: "General Examination",
        type: "textarea",
        rows: 4,
        placeholder: "General appearance, orientation, build, nourishment",
      },
      {
        key: "generalFindings",
        label: "General Physical Findings",
        type: "textarea",
        rows: 4,
        placeholder: "Pallor, icterus, clubbing, edema, lymphadenopathy, etc.",
      },
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
      {
        key: "perRectal",
        label: "Per Rectal Examination",
        type: "textarea",
        rows: 3,
        placeholder: "Per rectal examination findings",
      },
    ],
  },
  {
    key: "systemicExam",
    shortLabel: "Systemic",
    title: "Systemic Examination",
    description: "Summarise findings for each major system.",
    fields: [
      { key: "cvs", label: "Cardiovascular System (CVS)", type: "textarea", rows: 3, placeholder: "CVS findings" },
      { key: "cns", label: "Central Nervous System (CNS)", type: "textarea", rows: 3, placeholder: "CNS findings" },
      { key: "resp", label: "Respiratory System (RESP)", type: "textarea", rows: 3, placeholder: "Respiratory findings" },
      { key: "pa", label: "Per Abdomen (P/A)", type: "textarea", rows: 3, placeholder: "Per abdomen findings" },
    ],
  },
  {
    key: "impression",
    shortLabel: "Impression",
    title: "Clinical Impression",
    description: "Capture the working diagnosis and discharge advice.",
    fields: [
      {
        key: "provisionalDiagnosis",
        label: "Impression / Provisional Diagnosis",
        type: "textarea",
        rows: 4,
        placeholder: "Final diagnosis or key impression at discharge",
      },
      {
        key: "dischargePlan",
        label: "Discharge Plan / Advice",
        type: "textarea",
        rows: 4,
        placeholder: "Medications, follow-up, rehabilitation, and precautions",
      },
    ],
  },
];

type SectionKey = SectionDefinition["key"];
type SectionState = Record<SectionKey, Record<string, string>>;

const SECTION_MAP: Record<SectionKey, SectionDefinition> = SECTION_DEFINITIONS.reduce(
  (acc, section) => {
    acc[section.key] = section;
    return acc;
  },
  {} as Record<SectionKey, SectionDefinition>,
);

const buildEmptySectionState = (): SectionState => {
  return SECTION_DEFINITIONS.reduce((acc, section) => {
    const fields = section.fields.reduce<Record<string, string>>((fieldAcc, field) => {
      fieldAcc[field.key] = "";
      return fieldAcc;
    }, {});
    acc[section.key] = fields;
    return acc;
  }, {} as SectionState);
};

const adaptSections = (sections: DischargeSummaryVersion["sections"]): SectionState => {
  const draft = buildEmptySectionState();
  if (!sections || typeof sections !== "object") {
    return draft;
  }

  for (const [sectionKey, sectionValue] of Object.entries(sections)) {
    if (!(sectionKey in SECTION_MAP)) continue;
    const sectionDefinition = SECTION_MAP[sectionKey as SectionKey];
    const current = draft[sectionDefinition.key];
    if (!current) continue;

    if (sectionValue && typeof sectionValue === "object") {
      for (const [fieldKey, fieldValue] of Object.entries(sectionValue as Record<string, unknown>)) {
        if (typeof fieldValue === "string" && fieldKey in current) {
          current[fieldKey] = fieldValue;
        }
      }
      continue;
    }

    if (typeof sectionValue === "string" && sectionDefinition.fields.length > 0) {
      const firstField = sectionDefinition.fields[0];
      current[firstField.key] = sectionValue;
    }
  }

  return draft;
};

const deriveSummary = (state: SectionState) => {
  const diagnosis = state.impression?.provisionalDiagnosis?.trim() ?? "";
  const dod = state.administrative?.dod?.trim() ?? "";
  if (!diagnosis && !dod) return undefined;
  return {
    diagnosis: diagnosis || undefined,
    dod: dod || undefined,
  };
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
};

export default function DischargeSummaryForm({ patientIdOrMrn }: { patientIdOrMrn: string }) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SectionKey>(SECTION_DEFINITIONS[0].key);
  const [sectionState, setSectionState] = useState<SectionState>(() => buildEmptySectionState());
  const [latest, setLatest] = useState<DischargeSummaryVersion | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [savingStatus, setSavingStatus] = useState<"draft" | "published" | null>(null);
  const [authorId, setAuthorId] = useState<string>(() => {
    if (typeof window === "undefined") return "anon";
    return localStorage.getItem("dischargeAuthorId") || "anon";
  });
  const [authorName, setAuthorName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("dischargeAuthorName") || "";
  });

  const hasContent = useMemo(() => {
    return SECTION_DEFINITIONS.some((section) =>
      Object.values(sectionState[section.key] || {}).some((value) => value.trim().length > 0),
    );
  }, [sectionState]);

  const persistAuthor = useCallback(
    (id: string, name: string) => {
      if (typeof window === "undefined") return;
      localStorage.setItem("dischargeAuthorId", id || "anon");
      localStorage.setItem("dischargeAuthorName", name || "");
    },
    [],
  );

  const applyVersion = useCallback(
    (version: DischargeSummaryVersion | null) => {
      if (!version) {
        setLatest(null);
        setSectionState(buildEmptySectionState());
        return;
      }
      setLatest(version);
      setSectionState(adaptSections(version.sections));
      if (typeof version.authorId === "string" && version.authorId.trim()) {
        setAuthorId(version.authorId);
      }
      if (typeof version.authorName === "string") {
        setAuthorName(version.authorName);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const loadLatest = async () => {
      setLoading(true);
      try {
        const response = await api.discharge.getLatest(patientIdOrMrn);
        if (cancelled) return;
        applyVersion(response?.latest ?? null);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && /not\s+found/i.test(error.message)) {
          applyVersion(null);
        } else {
          toast({
            title: "Unable to load discharge summary",
            description: error instanceof Error ? error.message : "Please try again shortly.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLatest();
    return () => {
      cancelled = true;
    };
  }, [applyVersion, patientIdOrMrn, toast]);

  const handleFieldChange = useCallback((sectionKey: SectionKey, fieldKey: string, value: string) => {
    setSectionState((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [fieldKey]: value,
      },
    }));
  }, []);

  const handleSave = useCallback(
    async (nextStatus: "draft" | "published") => {
      if (!hasContent) {
        toast({
          title: "Nothing to save",
          description: "Fill at least one field before saving.",
        });
        return;
      }

      setSavingStatus(nextStatus);
      const normalizedAuthorId = authorId.trim() || "anon";
      const normalizedAuthorName = authorName.trim();

      try {
        persistAuthor(normalizedAuthorId, normalizedAuthorName);
        const sectionsPayload = SECTION_DEFINITIONS.reduce<Record<string, Record<string, string>>>(
          (acc, section) => {
            acc[section.key] = { ...sectionState[section.key] };
            return acc;
          },
          {},
        );
        const summaryPayload = deriveSummary(sectionState) ?? null;

        const response = await api.discharge.create(patientIdOrMrn, {
          status: nextStatus,
          sections: sectionsPayload,
          summary: summaryPayload,
          authorId: normalizedAuthorId,
          authorName: normalizedAuthorName,
          commitMessage:
            nextStatus === "published" ? "Publish discharge summary" : "Save discharge summary draft",
        });

        applyVersion(response.latest);
        toast({
          title: nextStatus === "published" ? "Discharge summary published" : "Draft saved",
          description: "A new discharge version has been recorded.",
        });
      } catch (error) {
        toast({
          title: "Save failed",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setSavingStatus(null);
      }
    },
    [applyVersion, authorId, authorName, hasContent, patientIdOrMrn, persistAuthor, sectionState, toast],
  );

  const activeDefinition = SECTION_MAP[activeSection];
  const isSaving = savingStatus !== null;
  const lastUpdatedLabel = formatDateTime(latest?.updatedAt);
  const currentStatus = latest?.status ?? "draft";

  const renderField = (sectionKey: SectionKey, field: SectionFieldDefinition) => {
    const value = sectionState[sectionKey]?.[field.key] ?? "";
    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleFieldChange(sectionKey, field.key, event.target.value);
    const fieldId = `${sectionKey}-${field.key}`;

    if ((field.type ?? "textarea") === "textarea") {
      return (
        <div key={field.key} className="space-y-1">
          <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
            {field.label}
          </label>
          <Textarea
            id={fieldId}
            value={value}
            onChange={handleChange}
            placeholder={field.placeholder}
            disabled={loading || isSaving}
            rows={field.rows ?? 4}
          />
        </div>
      );
    }

    const inputType = field.type === "date" ? "date" : "text";
    return (
      <div key={field.key} className="space-y-1">
        <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
          {field.label}
        </label>
        <Input
          id={fieldId}
          value={value}
          onChange={handleChange}
          placeholder={field.placeholder}
          disabled={loading || isSaving}
          type={inputType}
        />
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="hidden w-full max-w-[220px] flex-shrink-0 border-r bg-white lg:flex lg:flex-col">
          <div className="px-5 py-4 text-sm font-semibold text-foreground">Sections</div>
          <nav className="flex flex-1 flex-col">
            {SECTION_DEFINITIONS.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={cn(
                  "flex w-full items-center gap-2 border-l-4 px-5 py-3 text-left text-sm transition",
                  activeSection === section.key
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:bg-muted",
                )}
              >
                <span>{section.shortLabel}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 overflow-y-auto">
          <div className="border-b bg-white px-4 py-3 lg:hidden">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="discharge-section-select">
              Section
            </label>
            <select
              id="discharge-section-select"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={activeSection}
              onChange={(event) => setActiveSection(event.target.value as SectionKey)}
              disabled={loading || isSaving}
            >
              {SECTION_DEFINITIONS.map((section) => (
                <option key={section.key} value={section.key}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-foreground sm:text-xl">Discharge Summary</h1>
                  <p className="text-sm text-muted-foreground">
                    Complete each clinical section to capture the patient's discharge narrative.
                  </p>
                </div>
                <Badge variant={currentStatus === "published" ? "default" : "outline"} className="uppercase">
                  {currentStatus}
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="author-id" className="text-xs font-medium uppercase text-muted-foreground">
                    Author ID
                  </label>
                  <Input
                    id="author-id"
                    value={authorId}
                    onChange={(event) => setAuthorId(event.target.value)}
                    placeholder="e.g. staff001"
                    disabled={loading || isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="author-name" className="text-xs font-medium uppercase text-muted-foreground">
                    Author Name
                  </label>
                  <Input
                    id="author-name"
                    value={authorName}
                    onChange={(event) => setAuthorName(event.target.value)}
                    placeholder="Display name (optional)"
                    disabled={loading || isSaving}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground sm:text-lg">{activeDefinition.title}</h2>
                  {activeDefinition.description ? (
                    <p className="text-sm text-muted-foreground">{activeDefinition.description}</p>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">{activeDefinition.shortLabel}</div>
              </div>
              <div className="grid gap-4">
                {activeDefinition.fields.map((field) => renderField(activeDefinition.key, field))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Last updated: <span className="font-medium text-foreground">{lastUpdatedLabel}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              disabled={!hasContent || isSaving}
              onClick={() => handleSave("draft")}
              className="w-full sm:w-auto"
            >
              {isSaving && savingStatus === "draft" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save draft
            </Button>
            <Button
              disabled={!hasContent || isSaving}
              onClick={() => handleSave("published")}
              className="w-full sm:w-auto"
            >
              {isSaving && savingStatus === "published" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
