import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Check, Loader2, Save, Maximize2, Paperclip, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import type { DischargeSummaryVersion } from "@/types/api";
import {
  SECTION_DEFINITIONS,
  type SectionFieldDefinition,
  type SectionDefinition,
  type FieldType,
  type SectionKey,
  type SectionState,
  buildEmptySectionState,
  adaptSections,
  sectionHasAnyValue,
} from "./discharge.sections";

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
  } catch {
    return value ?? "—";
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

  // NEW: right panel scroll container ref (mirrors Patient Registration)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Track focused field for small expansion
  const [focusedField, setFocusedField] = useState<string | null>(null);
  // Track full-screen editor
  const [fullScreenField, setFullScreenField] = useState<string | null>(null);

  const hasContent = useMemo(() => {
    return SECTION_DEFINITIONS.some((section) =>
      Object.values(sectionState[section.key] || {}).some((value) => value.trim().length > 0),
    );
  }, [sectionState]);

  // NEW: section completion check for left ticks
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
    return () => {
      cancelled = true;
    };
  }, [applyVersion, patientIdOrMrn, toast]);

  // Prefill from patient META if no prior discharge exists (or if key fields are blank)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (latest) return; // a version already hydrated
      try {
        const patient = await api.patients.get(patientIdOrMrn); // accepts UID or MRN
        if (cancelled || !patient) return;
        setSectionState((prev) => {
          const next = { ...prev };
          // Administrative → IP number
          if (!next.administrative.ipNumber?.trim()) {
            next.administrative.ipNumber = patient.mrn || patient.latestMrn || "";
          }
          // Impression → provisional diagnosis
          if (!next.impression.provisionalDiagnosis?.trim() && patient.diagnosis) {
            next.impression.provisionalDiagnosis = patient.diagnosis;
          }
          return next;
        });
      } catch {
        /* silent prefill failure */
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [latest, patientIdOrMrn]);

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

  // NEW: scroll-to-section like Patient Registration
  const handleScrollToSection = useCallback((sectionId: SectionKey) => {
    const el = document.getElementById(sectionId);
    if (el && scrollContainerRef.current) {
      const offsetTop = el.offsetTop - 20;
      scrollContainerRef.current.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  }, []);

  // NEW: track active section while scrolling (mirrors your registration scroll listener)
  useEffect(() => {
    const handler = () => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // If scrolled to bottom, highlight the last section
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setActiveSection(SECTION_DEFINITIONS[SECTION_DEFINITIONS.length - 1].key);
        return;
      }

      let current: SectionKey = SECTION_DEFINITIONS[0].key;
      for (const section of SECTION_DEFINITIONS) {
        const el = document.getElementById(section.key);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        // section whose top is closest to the top inside container
        if (rect.top <= containerRect.top + 150) {
          current = section.key;
        }
      }
      setActiveSection(current);
    };

    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handler);
    return () => container.removeEventListener("scroll", handler);
  }, [sectionState]); // reattach if layout changes

  const isSaving = savingStatus !== null;
  const lastUpdatedLabel = formatDateTime(latest?.updatedAt);
  const currentStatus = latest?.status ?? "draft";

  const renderField = (sectionKey: SectionKey, field: SectionFieldDefinition) => {
    const value = sectionState[sectionKey]?.[field.key] ?? "";
    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleFieldChange(sectionKey, field.key, event.target.value);
    const fieldId = `${sectionKey}-${field.key}`;
    const isFocused = focusedField === fieldId;

    if ((field.type ?? "textarea") === "textarea") {
      return (
        <div key={field.key} className="space-y-1">
          <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
            {field.label}
          </label>
          <div
            className={`relative rounded-lg border transition-all ${
              isFocused ? "border-blue-400 ring-2 ring-blue-100" : "border-input"
            }`}
          >
            <Textarea
              id={fieldId}
              value={value}
              onChange={handleChange}
              onFocus={() => setFocusedField(fieldId)}
              onBlur={(e) => {
                // Only blur if clicking outside the container
                if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                  setFocusedField(null);
                }
              }}
              placeholder={field.placeholder}
              disabled={loading || isSaving}
              rows={isFocused ? 6 : field.rows ?? 4}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {isFocused && (
              <div className="border-t bg-gray-50 px-3 py-2 flex items-center justify-between">
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
                    onClick={() => {
                      handleSave("draft");
                      setFocusedField(null);
                    }}
                    disabled={!hasContent || isSaving}
                  >
                    <Save className="mr-1 h-3 w-3" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      handleSave("published");
                      setFocusedField(null);
                    }}
                    disabled={!hasContent || isSaving}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Publish
                  </Button>
                </div>
              </div>
            )}
          </div>
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

  // Full-screen editor as a complete new page
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
        {/* Header */}
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
          <div className="flex items-center gap-2">
            <Badge variant={currentStatus === "published" ? "default" : "outline"} className="uppercase">
              {currentStatus}
            </Badge>
          </div>
        </div>

        {/* Editor body */}
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

        {/* Footer toolbar */}
        <div className="border-t bg-gray-50 px-6 py-4 sticky bottom-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {value.length} characters
              </span>
            </div>
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
      {/* LEFT: skinny nav like PatientRegistrationForm */}
      <div className="w-20 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-2 overflow-y-auto flex-1">
          {SECTION_DEFINITIONS.map((section) => {
            const isActive = activeSection === section.key;
            const isDone = getSectionCompletionStatus(section.key);
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => handleScrollToSection(section.key)}
                className={`w-full flex flex-col items-center p-3 mb-2 rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-50 border-2 border-blue-200 text-blue-700"
                    : "hover:bg-gray-50 border-2 border-transparent text-gray-700"
                }`}
                title={section.title}
                aria-label={section.shortLabel}
              >
                <div className="flex items-center justify-center mb-1">
                  {isDone && <Check size={12} className="text-green-500" />}
                </div>
                <span className="font-medium text-xs leading-tight text-center truncate w-12">
                  {section.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: scrollable content area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 pb-28">
        <div className="max-w-xl space-y-10">
          {/* Header card (kept) */}
          <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-lg font-semibold text-foreground sm:text-xl">Discharge Summary</h1>
                <p className="text-sm text-muted-foreground">
                  Complete each clinical section to capture the patient&apos;s discharge narrative.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  Last updated: <span className="font-medium text-foreground">{lastUpdatedLabel}</span>
                </div>
                <Badge variant={currentStatus === "published" ? "default" : "outline"} className="uppercase">
                  {currentStatus}
                </Badge>
              </div>
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

          {/* All sections stacked (IDs used for scroll/spy) */}
          {SECTION_DEFINITIONS.map((section) => (
            <div key={section.key} id={section.key} className="space-y-4">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-gray-800 mb-1">{section.title}</h2>
                {section.description ? (
                  <p className="text-sm text-gray-600">{section.description}</p>
                ) : null}
              </div>
              <div className="grid gap-4">
                {section.fields.map((field) => renderField(section.key, field))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating actions (replaces full-width sticky footer) */}
      <div className="fixed bottom-24 right-8 z-50 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          disabled={!hasContent || isSaving}
          onClick={() => handleSave("draft")}
          className="shadow-lg h-10 w-10"
          title="Save draft"
        >
          {isSaving && savingStatus === "draft" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
        </Button>
        <Button
          size="icon"
          disabled={!hasContent || isSaving}
          onClick={() => handleSave("published")}
          className="shadow-lg h-10 w-10"
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
