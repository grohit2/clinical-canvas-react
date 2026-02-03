import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Check, Loader2, Save, Maximize2, Paperclip, X, Download, Pencil, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import type { DischargeSummaryVersion, Patient } from "@/types/api";
import {
  SECTION_DEFINITIONS,
  type SectionFieldDefinition,
  type SectionKey,
  type SectionState,
  buildEmptySectionState,
  adaptSections,
  sectionHasAnyValue,
  getAutoFillMappings,
} from "./discharge.sections";
import {
  buildStructuredDischargeDocxBlob,
  safeFileName,
} from "./export/structuredDischargeDocx";
import { composeDocxSummaryFromSections } from "./export/sectionsToDocx";

const deriveSummary = (state: SectionState) => {
  const diagnosis = state.clinicalInfo?.finalDiagnosis?.trim() ?? "";
  const dod = state.administrativeDates?.dod?.trim() ?? "";
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
  } catch {
    return value ?? "—";
  }
};

export default function DischargeSummaryForm({ patientIdOrMrn }: { patientIdOrMrn: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SectionKey>(SECTION_DEFINITIONS[0].key);
  const [sectionState, setSectionState] = useState<SectionState>(() => buildEmptySectionState());
  const [latest, setLatest] = useState<DischargeSummaryVersion | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [savingStatus, setSavingStatus] = useState<"draft" | "published" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [authorId, setAuthorId] = useState<string>(() => {
    if (typeof window === "undefined") return "anon";
    return localStorage.getItem("dischargeAuthorId") || "anon";
  });
  const [authorName, setAuthorName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("dischargeAuthorName") || "";
  });

  // Track which field is being edited
  const [editingField, setEditingField] = useState<string | null>(null);
  // Track full-screen editor
  const [fullScreenField, setFullScreenField] = useState<string | null>(null);

  const hasContent = useMemo(() => {
    return SECTION_DEFINITIONS.some((section) =>
      Object.values(sectionState[section.key] || {}).some((value) => value.trim().length > 0),
    );
  }, [sectionState]);

  const getSectionCompletionStatus = useCallback(
    (key: SectionKey) => sectionHasAnyValue(sectionState, key),
    [sectionState],
  );

  const persistAuthor = useCallback((id: string, name: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("dischargeAuthorId", id || "anon");
    localStorage.setItem("dischargeAuthorName", name || "");
  }, []);

  const applyVersion = useCallback((version: DischargeSummaryVersion | null) => {
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
  }, []);

  // Load patient data
  useEffect(() => {
    let cancelled = false;
    const loadPatient = async () => {
      try {
        const p = await api.patients.get(patientIdOrMrn);
        if (!cancelled && p) {
          setPatient(p);
        }
      } catch {
        // Silent failure for patient load
      }
    };
    loadPatient();
    return () => { cancelled = true; };
  }, [patientIdOrMrn]);

  // Load discharge summary
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
        if (!cancelled) setLoading(false);
      }
    };
    loadLatest();
    return () => { cancelled = true; };
  }, [applyVersion, patientIdOrMrn, toast]);

  // Auto-fill from patient data
  useEffect(() => {
    if (!patient) return;

    const mappings = getAutoFillMappings();
    setSectionState((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const { section, field, patientKey } of mappings) {
        // Only auto-fill if the field is empty
        if (!next[section][field]?.trim()) {
          const value = (patient as Record<string, unknown>)[patientKey];
          if (value !== undefined && value !== null) {
            const stringValue = typeof value === "number" ? String(value) :
                               typeof value === "string" ? value : "";
            if (stringValue) {
              next[section] = { ...next[section], [field]: stringValue };
              changed = true;
            }
          }
        }
      }

      return changed ? next : prev;
    });
  }, [patient]);

  const handleFieldChange = useCallback(
    (sectionKey: SectionKey, fieldKey: string, value: string) => {
      setSectionState((prev) => ({
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          [fieldKey]: value,
        },
      }));
    },
    [],
  );

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
        setEditingField(null);
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

  const handleExportDocx = useCallback(async () => {
    try {
      setExporting(true);

      const patientData = patient || await api.patients.get(patientIdOrMrn);
      const timeline = await api.patients.timeline(patientIdOrMrn);

      const sectionsPayload = SECTION_DEFINITIONS.reduce<Record<string, Record<string, string>>>(
        (acc, section) => {
          acc[section.key] = { ...sectionState[section.key] };
          return acc;
        },
        {},
      );

      const { summary: docxSummary, overrideDates } =
        composeDocxSummaryFromSections(sectionsPayload);

      if (!docxSummary.doctorName && authorName?.trim()) {
        docxSummary.doctorName = authorName.trim();
      }

      const blob = await buildStructuredDischargeDocxBlob({
        title: "DISCHARGE SUMMARY",
        letterhead: {
          hospitalName: "Narayana General Hospital",
          addressLines: ["Chintareddypalem, Nellore – ph. 0861-2317963 A.P India."],
          department: "Department of General Surgery",
        },
        patient: {
          id: patientData.id,
          patientId: patientData.patientId ?? patientData.id,
          name: patientData.name,
          age: patientData.age,
          sex: patientData.sex,
          latestMrn: patientData.latestMrn,
          department: patientData.department,
          roomNumber: patientData.roomNumber ?? undefined,
          assignedDoctor: patientData.assignedDoctor ?? undefined,
          surgeryDate: (patientData as Record<string, unknown>).surgeryDate as string | undefined,
          procedureName: (patientData as Record<string, unknown>).procedureName as string | undefined,
        },
        timeline,
        summary: docxSummary,
        overrideDates,
        bulletInvestigations: true,
      });

      const filename = safeFileName(
        `Discharge_${patientData.latestMrn ?? patientData.id ?? patientData.name ?? "Patient"}`
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Discharge summary has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [authorName, patient, patientIdOrMrn, sectionState, toast]);

  // Scroll to section
  const handleScrollToSection = useCallback((sectionId: SectionKey) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = rect.top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  // Track active section while scrolling (using window scroll like patient registration)
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const viewport = window.innerHeight;

      // If at bottom, select last section
      if (scrollTop + viewport >= docHeight - 50) {
        setActiveSection(SECTION_DEFINITIONS[SECTION_DEFINITIONS.length - 1].key);
        return;
      }

      // Find current section based on scroll position
      let current: SectionKey = SECTION_DEFINITIONS[0].key;
      for (const section of SECTION_DEFINITIONS) {
        const el = document.getElementById(section.key);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 150) {
          current = section.key;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const isSaving = savingStatus !== null;
  const lastUpdatedLabel = formatDateTime(latest?.updatedAt);
  const currentStatus = latest?.status ?? "draft";

  // Render a field - either in edit mode or readonly view
  const renderField = (sectionKey: SectionKey, field: SectionFieldDefinition) => {
    const value = sectionState[sectionKey]?.[field.key] ?? "";
    const fieldId = `${sectionKey}-${field.key}`;
    const isEditing = editingField === fieldId;
    const isReadOnly = field.readOnly === true;
    const hasValue = value.trim().length > 0;

    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleFieldChange(sectionKey, field.key, event.target.value);

    // Edit mode
    if (isEditing && !isReadOnly) {
      if ((field.type ?? "textarea") === "textarea") {
        return (
          <div key={field.key} className="space-y-2">
            <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
              {field.label}
            </label>
            <div className="rounded-lg border border-blue-400 ring-2 ring-blue-100 bg-white">
              <Textarea
                id={fieldId}
                value={value}
                onChange={handleChange}
                placeholder={field.placeholder}
                disabled={loading || isSaving}
                rows={field.rows ?? 4}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
                autoFocus
              />
              <div className="border-t bg-gray-50 px-3 py-2 flex items-center justify-between rounded-b-lg">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title="Expand to full screen"
                    onClick={() => setFullScreenField(fieldId)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title="Attach files"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingField(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      handleSave("draft");
                    }}
                    disabled={!hasContent || isSaving}
                  >
                    <Save className="mr-1 h-3 w-3" />
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Text/date input edit mode
      const inputType = field.type === "date" ? "date" : "text";
      return (
        <div key={field.key} className="space-y-2">
          <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
            {field.label}
          </label>
          <div className="flex gap-2">
            <Input
              id={fieldId}
              value={value}
              onChange={handleChange}
              placeholder={field.placeholder}
              disabled={loading || isSaving}
              type={inputType}
              className="flex-1"
              autoFocus
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingField(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                handleSave("draft");
              }}
              disabled={!hasContent || isSaving}
            >
              <Save className="mr-1 h-3 w-3" />
              Save
            </Button>
          </div>
        </div>
      );
    }

    // Readonly view (grey background with full content visible)
    const displayValue = hasValue ? value : field.placeholder || "Not specified";
    const isTextArea = (field.type ?? "textarea") === "textarea";

    return (
      <div key={field.key} className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-600">
            {field.label}
          </label>
          {!isReadOnly && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-gray-500 hover:text-gray-700"
              onClick={() => setEditingField(fieldId)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          )}
        </div>
        <div
          className={`rounded-lg px-3 py-2.5 ${
            hasValue
              ? "bg-gray-100 text-gray-900"
              : "bg-gray-50 text-gray-400 italic"
          } ${isReadOnly ? "bg-gray-200" : ""}`}
          onClick={() => !isReadOnly && setEditingField(fieldId)}
          role={isReadOnly ? undefined : "button"}
          tabIndex={isReadOnly ? undefined : 0}
          onKeyDown={(e) => !isReadOnly && (e.key === "Enter" || e.key === " ") && setEditingField(fieldId)}
        >
          {isTextArea ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {displayValue}
            </div>
          ) : (
            <div className="text-sm">
              {field.type === "date" && hasValue
                ? new Date(value).toLocaleDateString()
                : displayValue}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Full-screen editor
  if (fullScreenField) {
    const [sectionKey, fieldKey] = fullScreenField.split("-") as [SectionKey, string];
    const section = SECTION_DEFINITIONS.find((s) => s.key === sectionKey);
    const field = section?.fields.find((f) => f.key === fieldKey);
    const value = sectionState[sectionKey]?.[fieldKey] ?? "";

    if (!field) {
      setFullScreenField(null);
      return null;
    }

    return (
      <div className="flex h-screen flex-col bg-white pb-16">
        <div className="flex items-center justify-between border-b px-6 py-4 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setFullScreenField(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{field.label}</h1>
              <p className="text-sm text-muted-foreground">{section?.title}</p>
            </div>
          </div>
          <Badge variant={currentStatus === "published" ? "default" : "outline"} className="uppercase">
            {currentStatus}
          </Badge>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-5xl mx-auto px-8 py-6">
            <Textarea
              value={value}
              onChange={(e) => handleFieldChange(sectionKey, fieldKey, e.target.value)}
              placeholder={field.placeholder}
              disabled={loading || isSaving}
              className="h-full w-full resize-none text-base leading-relaxed border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-4"
              autoFocus
            />
          </div>
        </div>

        <div className="border-t bg-gray-50 px-6 py-4 sticky bottom-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {value.length} characters
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  handleSave("draft");
                  setFullScreenField(null);
                }}
                disabled={!hasContent || isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
              <Button
                onClick={() => {
                  handleSave("published");
                  setFullScreenField(null);
                }}
                disabled={!hasContent || isSaving}
              >
                <Check className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50">
      {/* LEFT: Sticky Navigation Sidebar */}
      <aside className="w-20 bg-white border-r border-gray-200 sticky top-0 h-screen flex flex-col">
        <nav className="flex-1 overflow-y-auto p-2">
          {SECTION_DEFINITIONS.map((section) => {
            const isActive = activeSection === section.key;
            const isDone = getSectionCompletionStatus(section.key);
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => handleScrollToSection(section.key)}
                className={`w-full flex flex-col items-center p-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-50 border-2 border-blue-200 text-blue-700"
                    : "hover:bg-gray-50 border-2 border-transparent text-gray-700"
                }`}
                title={section.title}
              >
                <div className="flex items-center justify-center mb-1 h-4">
                  {isDone && <Check size={12} className="text-green-500" />}
                </div>
                <span className="font-medium text-xs leading-tight text-center truncate w-14">
                  {section.shortLabel}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* RIGHT: Main Content */}
      <div className="flex-1 p-6 pb-28">
        {/* Back button header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Discharge Summary</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-8">
          {/* Author & Status Card */}
          <div className="space-y-4 rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Complete each section to create the patient&apos;s discharge narrative.
              </p>
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground">
                  Updated: <span className="font-medium text-foreground">{lastUpdatedLabel}</span>
                </div>
                <Badge variant={currentStatus === "published" ? "default" : "outline"} className="uppercase text-xs">
                  {currentStatus}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="author-id" className="text-xs font-medium uppercase text-muted-foreground">
                  Author ID
                </label>
                <Input
                  id="author-id"
                  value={authorId}
                  onChange={(e) => setAuthorId(e.target.value)}
                  placeholder="e.g. staff001"
                  disabled={loading || isSaving}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="author-name" className="text-xs font-medium uppercase text-muted-foreground">
                  Author Name
                </label>
                <Input
                  id="author-name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Display name (optional)"
                  disabled={loading || isSaving}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Sections */}
          {SECTION_DEFINITIONS.map((section) => (
            <div key={section.key} id={section.key} className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-lg font-bold text-gray-800">{section.title}</h2>
                {section.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
                )}
              </div>
              <div className="space-y-4">
                {section.fields.map((field) => renderField(section.key, field))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating actions */}
      <div className="fixed bottom-24 right-8 z-50 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          disabled={exporting || loading || !hasContent}
          onClick={handleExportDocx}
          className="shadow-lg h-11 w-11 bg-white"
          title="Export .docx"
        >
          {exporting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </Button>
        <Button
          size="icon"
          disabled={!hasContent || isSaving}
          onClick={() => handleSave("published")}
          className="shadow-lg h-11 w-11"
          title="Publish"
        >
          {isSaving && savingStatus === "published" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Check className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
