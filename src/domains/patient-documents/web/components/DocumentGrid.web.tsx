// Document grid component for displaying a collection of documents
import React, { useMemo, useState } from "react";
import type { DocumentItem } from "../../core/types";
import { isVideoByMimeOrExt } from "../../core/utils";
import { DocumentCard } from "./DocumentCard.web";
import { DocumentLightbox } from "./DocumentLightbox.web";
import { cn } from "@/lib/utils";

interface DocumentGridProps {
  documents: DocumentItem[];
  className?: string;
  columns?: 2 | 3 | 4;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onDelete?: (document: DocumentItem) => void;
  onMove?: (document: DocumentItem) => void;
  emptyMessage?: string;
}

export function DocumentGrid({
  documents,
  className,
  columns = 3,
  selectionMode = false,
  selectedIds = new Set(),
  onSelectionChange,
  onDelete,
  onMove,
  emptyMessage = "No documents found",
}: DocumentGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const previewableDocuments = useMemo(
    () => documents.filter((doc) => doc.isImage || isVideoByMimeOrExt(doc.contentType, doc.name)),
    [documents]
  );

  const handleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange?.(next);
  };

  const handleLightboxNavigate = (direction: "prev" | "next") => {
    if (lightboxIndex === null) return;

    if (direction === "prev" && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else if (direction === "next" && lightboxIndex < previewableDocuments.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };

  return (
    <>
      <div className={cn("grid gap-4", gridCols[columns], className)}>
        {documents.map((doc, index) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            index={index}
            isSelected={selectedIds.has(doc.id)}
            selectionMode={selectionMode}
            onSelect={handleSelect}
            onClick={() => {
              const previewIndex = previewableDocuments.findIndex((item) => item.id === doc.id);
              if (previewIndex >= 0) {
                setLightboxIndex(previewIndex);
                return;
              }

              if (doc.fileUrl) {
                window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
              }
            }}
            onDelete={onDelete ? () => onDelete(doc) : undefined}
            onMove={onMove ? () => onMove(doc) : undefined}
          />
        ))}
      </div>

      {/* Lightbox for viewing images */}
      {lightboxIndex !== null && previewableDocuments[lightboxIndex] && (
        <DocumentLightbox
          document={previewableDocuments[lightboxIndex]}
          currentIndex={lightboxIndex}
          totalCount={previewableDocuments.length}
          onClose={() => setLightboxIndex(null)}
          onNavigate={handleLightboxNavigate}
          canNavigatePrev={lightboxIndex > 0}
          canNavigateNext={lightboxIndex < previewableDocuments.length - 1}
        />
      )}
    </>
  );
}
