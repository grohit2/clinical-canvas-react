// Document card component for displaying a single document thumbnail
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { DocumentItem } from "../../core/types";
import { getDocumentKind, isVideoByMimeOrExt } from "../../core/utils";
import { cn } from "@/lib/utils";

interface DocumentCardProps {
  document: DocumentItem;
  index: number;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: (id: string) => void;
  onClick?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
}

export function DocumentCard({
  document,
  index,
  isSelected = false,
  selectionMode = false,
  onSelect,
  onClick,
  onDelete,
  onMove,
}: DocumentCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode && onSelect) {
      e.stopPropagation();
      onSelect(document.id);
    } else if (onClick) {
      onClick();
    }
  };

  const kind = getDocumentKind(document.contentType, document.name);
  const isVideo = isVideoByMimeOrExt(document.contentType, document.name);
  const kindLabel =
    kind === "video"
      ? "VIDEO"
      : kind === "pdf"
        ? "PDF"
        : kind === "word"
          ? "WORD"
          : kind === "spreadsheet"
            ? "SHEET"
            : kind === "presentation"
              ? "SLIDE"
              : kind === "dicom"
                ? "DICOM"
                : kind === "text"
                  ? "TEXT"
                  : "FILE";

  return (
    <div
      className={cn(
        "relative group aspect-square bg-white rounded-lg shadow-sm border overflow-hidden",
        "hover:shadow-md transition-all duration-200 cursor-pointer",
        isSelected && "ring-2 ring-blue-500"
      )}
      onClick={handleClick}
    >
      {document.fileUrl ? (
        <>
          {/* Loading skeleton */}
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-xs text-gray-400">Loading...</div>
          </div>

          {document.isImage ? (
            <img
              src={document.thumbUrl || document.fileUrl}
              alt={document.name}
              className="w-full h-full object-cover relative z-10"
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
                const parent = img.parentElement;
                if (parent) {
                  parent.innerHTML = `<div class="flex items-center justify-center h-full bg-gray-100 text-xs p-2 text-center"><span>Image unavailable</span></div>`;
                }
              }}
            />
          ) : isVideo ? (
            <div className="relative h-full bg-gray-100">
              <video
                src={document.fileUrl}
                poster={document.thumbUrl}
                className="w-full h-full object-cover relative z-10"
                preload="metadata"
                muted
                playsInline
                onLoadedData={(e) => {
                  const skeleton = e.currentTarget.parentElement?.previousElementSibling;
                  if (skeleton instanceof HTMLElement) {
                    skeleton.style.display = "none";
                  }
                }}
                onError={(e) => {
                  const video = e.currentTarget as HTMLVideoElement;
                  video.style.display = "none";
                  const parent = video.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="flex items-center justify-center h-full bg-gray-100 text-xs p-2 text-center"><span>Video unavailable</span></div>`;
                  }
                }}
              />
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <div className="h-10 w-10 rounded-full bg-black/55 text-white flex items-center justify-center text-sm font-bold">
                  ▶
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-xs p-2 text-center relative z-10 gap-2">
              <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 tracking-wide">
                {kindLabel}
              </span>
              <span className="break-all">{document.name}</span>
            </div>
          )}

          {/* Selection checkbox */}
          {selectionMode && (
            <div
              className="absolute top-2 left-2 z-20 bg-white/90 rounded-md p-1 shadow"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect?.(document.id)}
                aria-label="Select document"
              />
            </div>
          )}

          {/* Overlay with document info on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-end z-10">
            <div className="w-full p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
              <p className="text-sm font-medium truncate mb-1">{document.name}</p>
              <p className="text-xs opacity-80">
                {document.uploadedAt
                  ? new Date(document.uploadedAt).toLocaleDateString()
                  : "Unknown date"}
              </p>
            </div>
          </div>

          {/* Delete button (visible on hover when not in selection mode) */}
          {!selectionMode && onDelete && (
            <button
              className="absolute top-2 right-2 z-20 rounded-full bg-red-500 p-1 text-white opacity-100 transition-opacity duration-200 hover:bg-red-600 md:opacity-0 md:group-hover:opacity-100"
              title="Remove document"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}

          {!selectionMode && onMove && (
            <button
              className="absolute top-2 left-2 z-20 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-semibold text-white opacity-100 transition-opacity duration-200 hover:bg-slate-900 md:opacity-0 md:group-hover:opacity-100"
              title="Move document"
              onClick={(e) => {
                e.stopPropagation();
                onMove();
              }}
            >
              Move
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
