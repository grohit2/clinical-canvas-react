// Document card component - Google Photos style minimal thumbnail
import React from "react";
import { Check } from "lucide-react";
import type { DocumentItem } from "../core/types";
import { cn } from "@/lib/utils";

interface DocumentCardProps {
  document: DocumentItem;
  index: number;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: (id: string) => void;
  onClick?: () => void;
  onDelete?: () => void;
  /** Use tight layout (no rounded corners, no shadow) for Google Photos grid */
  tight?: boolean;
}

export function DocumentCard({
  document,
  index,
  isSelected = false,
  selectionMode = false,
  onSelect,
  onClick,
  onDelete,
  tight = false,
}: DocumentCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode && onSelect) {
      e.stopPropagation();
      onSelect(document.id);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "relative group aspect-square overflow-hidden cursor-pointer",
        tight
          ? "bg-gray-100"
          : "bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200",
        isSelected && !tight && "ring-2 ring-blue-500"
      )}
      onClick={handleClick}
    >
      {document.fileUrl ? (
        <>
          {/* Loading skeleton */}
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />

          {document.isImage ? (
            <img
              src={document.thumbUrl || document.fileUrl}
              alt={document.name}
              className="absolute inset-0 w-full h-full object-cover z-[1]"
              loading="lazy"
              decoding="async"
              onLoad={(e) => {
                const skeleton = e.currentTarget.previousElementSibling;
                if (skeleton instanceof HTMLElement) {
                  skeleton.style.display = "none";
                }
              }}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.style.display = "none";
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-xs p-2 text-center z-[1]">
              <span className="break-all text-gray-600">{document.name}</span>
            </div>
          )}

          {/* Selection checkbox - Google Photos circle style */}
          {selectionMode && (
            <div
              className={cn(
                "absolute top-1.5 left-1.5 z-[3] w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-blue-500 border-blue-500"
                  : "border-white bg-black/20"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(document.id);
              }}
            >
              {isSelected && <Check className="h-3 w-3 text-white" />}
            </div>
          )}

          {/* Selection overlay tint */}
          {selectionMode && isSelected && (
            <div className="absolute inset-0 bg-blue-500/20 z-[2]" />
          )}

          {/* Hover overlay with info (non-tight mode) */}
          {!tight && !selectionMode && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-end z-[2]">
              <div className="w-full p-2.5 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                <p className="text-xs font-medium truncate">{document.name}</p>
                <p className="text-[10px] opacity-80 mt-0.5">
                  {document.uploadedAt
                    ? new Date(document.uploadedAt).toLocaleDateString()
                    : "Unknown date"}
                </p>
              </div>
            </div>
          )}

          {/* Delete button (non-tight, hover) */}
          {!tight && !selectionMode && onDelete && (
            <button
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 z-[3]"
              title="Remove document"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-100 text-sm text-gray-500">
          <span>No preview</span>
        </div>
      )}
    </div>
  );
}
