// Date-grouped photo grid - Google Photos style layout
import React, { useState, useMemo } from "react";
import { Check, MoreVertical } from "lucide-react";
import type { DocumentItem } from "../core/types";
import { CATEGORY_CONFIG } from "../core/CategoryConfig";
import { DocumentLightbox } from "./DocumentLightbox";
import { cn } from "@/lib/utils";

interface DateGroup {
  label: string;
  sublabel?: string;
  documents: DocumentItem[];
}

function formatDateGroup(dateStr: string): { label: string; sublabel?: string } {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const docDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor(
    (today.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return {
      label: "Today",
      sublabel: date.toLocaleDateString(undefined, { month: "long", day: "numeric" }),
    };
  }
  if (diffDays === 1) {
    return {
      label: "Yesterday",
      sublabel: date.toLocaleDateString(undefined, { month: "long", day: "numeric" }),
    };
  }
  if (diffDays < 7) {
    return {
      label: date.toLocaleDateString(undefined, { weekday: "long" }),
      sublabel: date.toLocaleDateString(undefined, { month: "long", day: "numeric" }),
    };
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  return {
    label: date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    }),
  };
}

function groupByDate(documents: DocumentItem[]): DateGroup[] {
  const groups = new Map<string, DocumentItem[]>();

  for (const doc of documents) {
    const dateKey = new Date(doc.uploadedAt).toLocaleDateString();
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(doc);
    } else {
      groups.set(dateKey, [doc]);
    }
  }

  return Array.from(groups.entries()).map(([, docs]) => {
    const { label, sublabel } = formatDateGroup(docs[0].uploadedAt);
    return { label, sublabel, documents: docs };
  });
}

interface PhotosDateGridProps {
  documents: DocumentItem[];
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onDelete?: (document: DocumentItem) => void;
  className?: string;
}

export function PhotosDateGrid({
  documents,
  selectionMode = false,
  selectedIds = new Set(),
  onSelectionChange,
  onDelete,
  className,
}: PhotosDateGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const dateGroups = useMemo(() => groupByDate(documents), [documents]);

  // Flat list for lightbox navigation
  const allDocs = useMemo(
    () => dateGroups.flatMap((g) => g.documents),
    [dateGroups]
  );

  const handleLightboxNavigate = (direction: "prev" | "next") => {
    if (lightboxIndex === null) return;
    if (direction === "prev" && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else if (direction === "next" && lightboxIndex < allDocs.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const handleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange?.(next);
  };

  const handleSelectGroup = (docs: DocumentItem[]) => {
    const allSelected = docs.every((d) => selectedIds.has(d.id));
    const next = new Set(selectedIds);
    if (allSelected) {
      docs.forEach((d) => next.delete(d.id));
    } else {
      docs.forEach((d) => next.add(d.id));
    }
    onSelectionChange?.(next);
  };

  // Track running index for lightbox
  let runningIndex = 0;

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("space-y-1", className)}>
        {dateGroups.map((group, gi) => {
          const startIndex = runningIndex;
          runningIndex += group.documents.length;
          const allGroupSelected = group.documents.every((d) =>
            selectedIds.has(d.id)
          );

          return (
            <div key={gi}>
              {/* Date section header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {selectionMode && (
                    <button
                      onClick={() => handleSelectGroup(group.documents)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        allGroupSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-400"
                      )}
                    >
                      {allGroupSelected && (
                        <Check className="h-3.5 w-3.5 text-white" />
                      )}
                    </button>
                  )}
                  <div>
                    <h3 className="text-[15px] font-semibold text-gray-900 leading-tight">
                      {group.label}
                    </h3>
                    {group.sublabel && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {group.sublabel}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!selectionMode && (
                    <button className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Photo grid - tight 4-column */}
              <div className="grid grid-cols-4 gap-[2px]">
                {group.documents.map((doc, di) => {
                  const globalIndex = startIndex + di;
                  const isSelected = selectedIds.has(doc.id);
                  const categoryConfig = CATEGORY_CONFIG[doc.category];

                  return (
                    <div
                      key={doc.id}
                      className="relative aspect-square overflow-hidden cursor-pointer group"
                      onClick={() => {
                        if (selectionMode) {
                          handleSelect(doc.id);
                        } else if (doc.isImage) {
                          setLightboxIndex(globalIndex);
                        }
                      }}
                    >
                      {doc.isImage && doc.fileUrl ? (
                        <>
                          {/* Loading skeleton */}
                          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                          <img
                            src={doc.thumbUrl || doc.fileUrl}
                            alt={doc.name}
                            className="absolute inset-0 w-full h-full object-cover z-[1]"
                            loading="lazy"
                            decoding="async"
                            onLoad={(e) => {
                              const skeleton =
                                e.currentTarget.previousElementSibling;
                              if (skeleton instanceof HTMLElement) {
                                skeleton.style.display = "none";
                              }
                            }}
                          />
                        </>
                      ) : (
                        <div
                          className={cn(
                            "absolute inset-0 flex flex-col items-center justify-center p-2",
                            "bg-gradient-to-br",
                            categoryConfig.bgFrom,
                            categoryConfig.bgTo
                          )}
                        >
                          <categoryConfig.icon className="h-6 w-6 text-white/80 mb-1" />
                          <span className="text-[10px] text-white/80 text-center leading-tight truncate w-full">
                            {doc.name}
                          </span>
                        </div>
                      )}

                      {/* Selection overlay */}
                      {selectionMode && (
                        <div
                          className={cn(
                            "absolute inset-0 z-[2] transition-colors",
                            isSelected ? "bg-blue-500/20" : ""
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-1.5 left-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "border-white bg-black/20"
                            )}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Category indicator dot */}
                      {!selectionMode && (
                        <div
                          className={cn(
                            "absolute bottom-1 right-1 w-2 h-2 rounded-full z-[2] opacity-0 group-hover:opacity-100 transition-opacity",
                            `bg-gradient-to-r ${categoryConfig.bgFrom} ${categoryConfig.bgTo}`
                          )}
                          title={categoryConfig.title}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && allDocs[lightboxIndex] && (
        <DocumentLightbox
          document={allDocs[lightboxIndex]}
          currentIndex={lightboxIndex}
          totalCount={allDocs.length}
          onClose={() => setLightboxIndex(null)}
          onNavigate={handleLightboxNavigate}
          canNavigatePrev={lightboxIndex > 0}
          canNavigateNext={lightboxIndex < allDocs.length - 1}
        />
      )}
    </>
  );
}
