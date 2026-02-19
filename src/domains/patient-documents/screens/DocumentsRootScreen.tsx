// Documents Root Page - Google Photos style layout
// Shows all documents across categories with memories carousel and date-grouped grid
import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@/app/navigation";
import { ArrowLeft, Plus, Bell, User, Search, CheckSquare, X, Image } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import {
  useDocumentFolderSummaries,
  useAllDocuments,
} from "../api/usePatientDocuments";
import { MemoriesCarousel } from "../components/MemoriesCarousel";
import { PhotosDateGrid } from "../components/PhotosDateGrid";
import { CategoryChips } from "../components/CategoryChips";
import type { DocCategory } from "../core/types";

export function DocumentsRootPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: summaries, isLoading: loadingSummaries } =
    useDocumentFolderSummaries(patientId);
  const { data: allDocuments, isLoading: loadingDocs } =
    useAllDocuments(patientId);

  const [selectedCategory, setSelectedCategory] = useState<DocCategory | "all">(
    "all"
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter documents by selected category
  const filteredDocuments = useMemo(() => {
    if (!allDocuments) return [];
    if (selectedCategory === "all") return allDocuments;
    return allDocuments.filter((d) => d.category === selectedCategory);
  }, [allDocuments, selectedCategory]);

  // Build counts for category chips
  const categoryCounts = useMemo(() => {
    if (!allDocuments) return undefined;
    const counts: Record<string, number> = {};
    for (const doc of allDocuments) {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    }
    return counts as Record<DocCategory, number>;
  }, [allDocuments]);

  const handleOpenCategory = (category: DocCategory) => {
    if (patientId) {
      navigate(paths.docsCategory(patientId, category));
    }
  };

  const totalDocuments = allDocuments?.length ?? 0;
  const isLoading = loadingSummaries || loadingDocs;

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Google Photos style header */}
      <header className="sticky top-0 z-30 bg-white">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-800" />
            </button>

            {selectionMode ? (
              <span className="text-base font-medium text-gray-900">
                {selectedIds.size} selected
              </span>
            ) : (
              <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {totalDocuments} {totalDocuments === 1 ? "photo" : "photos"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {selectionMode ? (
              <button
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedIds(new Set());
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Cancel selection"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            ) : (
              <>
                {totalDocuments > 0 && (
                  <button
                    onClick={() => setSelectionMode(true)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Select"
                  >
                    <CheckSquare className="h-5 w-5 text-gray-700" />
                  </button>
                )}
                <button
                  onClick={() =>
                    patientId &&
                    navigate(paths.docsCategory(patientId, "preop_pics"))
                  }
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Add photo"
                >
                  <Plus className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="ml-0.5 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center"
                  aria-label="Profile"
                >
                  <User className="h-4 w-4 text-white" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Loading state */}
      {isLoading && (
        <div>
          {/* Memories skeleton */}
          <div className="flex gap-3 overflow-hidden px-4 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-28 h-40 rounded-2xl bg-gray-100 animate-pulse"
              />
            ))}
          </div>
          {/* Grid skeleton */}
          <div className="grid grid-cols-4 gap-[2px] mt-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <>
          {/* Memories carousel - category highlights */}
          {summaries && (
            <MemoriesCarousel
              summaries={summaries}
              onOpenCategory={handleOpenCategory}
            />
          )}

          {/* Category filter chips */}
          {totalDocuments > 0 && (
            <CategoryChips
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              counts={categoryCounts}
              className="px-4 pb-3"
            />
          )}

          {/* Date-grouped photo grid */}
          {filteredDocuments.length > 0 ? (
            <PhotosDateGrid
              documents={filteredDocuments}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          ) : (
            <div className="text-center py-16 px-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
                <Image className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedCategory === "all"
                  ? "No documents yet"
                  : "No documents in this category"}
              </h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                {selectedCategory === "all"
                  ? "Upload photos and documents to see them organized here"
                  : "Try selecting a different category or upload new documents"}
              </p>
              {patientId && selectedCategory === "all" && (
                <Button
                  onClick={() =>
                    navigate(paths.docsCategory(patientId, "preop_pics"))
                  }
                  className="mt-6"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Upload Photos
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Selection action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t shadow-lg z-30 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.size}{" "}
            {selectedIds.size === 1 ? "item" : "items"} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Google Photos style bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around px-4 z-20">
        <button className="flex flex-col items-center justify-center gap-1 p-2 text-blue-600">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
          <span className="text-[10px] font-medium">Photos</span>
        </button>

        <button
          className="flex flex-col items-center justify-center gap-1 p-2 text-gray-500 hover:text-gray-700"
          onClick={() =>
            patientId && navigate(paths.docsRoot(patientId))
          }
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span className="text-[10px] font-medium">Categories</span>
        </button>

        <button
          className="flex flex-col items-center justify-center gap-1 p-2 text-gray-500 hover:text-gray-700"
          onClick={() =>
            patientId &&
            navigate(paths.docsCategory(patientId, "preop_pics"))
          }
        >
          <Plus className="h-5 w-5" />
          <span className="text-[10px] font-medium">Upload</span>
        </button>

        <button
          className="flex flex-col items-center justify-center gap-1 p-2 text-gray-500 hover:text-gray-700"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-[10px] font-medium">Back</span>
        </button>
      </nav>
    </div>
  );
}
