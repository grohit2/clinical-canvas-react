// Document grid component for displaying a collection of documents
import React, { useState } from "react";
import type { DocumentItem } from "../model/types";
import { DocumentCard } from "./DocumentCard";
import { DocumentLightbox } from "./DocumentLightbox";
import { cn } from "@/lib/utils";

interface DocumentGridProps {
  documents: DocumentItem[];
  className?: string;
  columns?: 2 | 3 | 4;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onDelete?: (document: DocumentItem) => void;
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
  emptyMessage = "No documents found",
}: DocumentGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
    } else if (direction === "next" && lightboxIndex < documents.length - 1) {
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
            onClick={() => doc.isImage && setLightboxIndex(index)}
            onDelete={onDelete ? () => onDelete(doc) : undefined}
          />
        ))}
      </div>

      {/* Lightbox for viewing images */}
      {lightboxIndex !== null && documents[lightboxIndex] && (
        <DocumentLightbox
          document={documents[lightboxIndex]}
          currentIndex={lightboxIndex}
          totalCount={documents.length}
          onClose={() => setLightboxIndex(null)}
          onNavigate={handleLightboxNavigate}
          canNavigatePrev={lightboxIndex > 0}
          canNavigateNext={lightboxIndex < documents.length - 1}
        />
      )}
    </>
  );
}
