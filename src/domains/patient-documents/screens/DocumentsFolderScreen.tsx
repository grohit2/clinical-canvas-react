// Documents Folder Page - Google Photos style category view
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@/app/navigation";
import {
  ArrowLeft,
  Plus,
  CheckSquare,
  X,
  Camera,
  Upload,
  Trash2,
  Image,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { useCategoryDocuments, useDeleteDocument } from "../api/usePatientDocuments";
import { PhotosDateGrid } from "../components/PhotosDateGrid";
import { getCategoryConfig } from "../core/CategoryConfig";
import { isValidCategory } from "../core/types";
import type { DocCategory, DocumentItem } from "../core/types";

export function DocumentsFolderPage() {
  const { id: patientId, category: categoryParam } = useParams<{
    id: string;
    category: string;
  }>();
  const navigate = useNavigate();

  const category = isValidCategory(categoryParam) ? categoryParam : undefined;
  const config = category ? getCategoryConfig(category) : null;

  const {
    data: documents,
    isLoading,
    error,
    refetch,
  } = useCategoryDocuments(patientId, category);

  const deleteDocument = useDeleteDocument(patientId);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<DocumentItem | null>(null);

  if (!category || !config) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <X className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-gray-900 font-medium mb-1">Invalid category</p>
        <p className="text-gray-500 text-sm mb-4">
          This document category does not exist
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const Icon = config.icon;

  const handleDeleteSingle = (doc: DocumentItem) => {
    setDocumentToDelete(doc);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteSelected = () => {
    setDocumentToDelete(null);
    setConfirmDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!category) return;

    try {
      if (documentToDelete) {
        await deleteDocument.mutateAsync({
          category,
          key: documentToDelete.id,
        });
      } else {
        for (const id of selectedIds) {
          await deleteDocument.mutateAsync({ category, key: id });
        }
      }

      setSelectedIds(new Set());
      setSelectionMode(false);
      setDocumentToDelete(null);
      setConfirmDeleteOpen(false);
      refetch();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const deleteCount = documentToDelete ? 1 : selectedIds.size;
  const docCount = documents?.length ?? 0;

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Google Photos style header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                patientId
                  ? navigate(paths.docsRoot(patientId), { replace: true })
                  : navigate(-1)
              }
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
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-full bg-gradient-to-r ${config.bgFrom} ${config.bgTo}`}
                >
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <h1 className="text-[15px] font-semibold text-gray-900 leading-tight">
                    {config.title}
                  </h1>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    {docCount} {docCount === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {selectionMode ? (
              <>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="p-2 rounded-full hover:bg-red-50 transition-colors"
                    aria-label="Delete selected"
                  >
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </button>
                )}
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
              </>
            ) : (
              <>
                {docCount > 0 && (
                  <button
                    onClick={() => setSelectionMode(true)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Select"
                  >
                    <CheckSquare className="h-5 w-5 text-gray-700" />
                  </button>
                )}
                <button
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Add photo"
                >
                  <Plus className="h-5 w-5 text-gray-700" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-4 gap-[2px]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-16 px-6">
          <p className="text-red-500 font-medium mb-2">
            Failed to load documents
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      )}

      {/* Documents grid */}
      {documents && documents.length > 0 && (
        <PhotosDateGrid
          documents={documents}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onDelete={handleDeleteSingle}
        />
      )}

      {/* Empty state */}
      {documents && documents.length === 0 && (
        <div className="text-center py-16 px-6">
          <div
            className={`mx-auto w-20 h-20 rounded-full bg-gradient-to-br ${config.bgFrom} ${config.bgTo} flex items-center justify-center mb-5 opacity-80`}
          >
            <Icon className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {config.title.toLowerCase()} yet
          </h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
            Upload your first photo or document to this category
          </p>
          <div className="flex justify-center gap-3">
            <Button size="sm" className="gap-1.5">
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>
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
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around px-4 z-20">
        <button
          className="flex flex-col items-center justify-center gap-1 p-2 text-gray-500 hover:text-gray-700"
          onClick={() => patientId && navigate(paths.docsRoot(patientId))}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
          <span className="text-[10px] font-medium">Photos</span>
        </button>

        <button className="flex flex-col items-center justify-center gap-1 p-2 text-blue-600">
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
        >
          <Plus className="h-5 w-5" />
          <span className="text-[10px] font-medium">Upload</span>
        </button>

        <button
          className="flex flex-col items-center justify-center gap-1 p-2 text-gray-500 hover:text-gray-700"
          onClick={() =>
            patientId
              ? navigate(paths.docsRoot(patientId))
              : navigate(-1)
          }
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-[10px] font-medium">Back</span>
        </button>
      </nav>

      {/* Confirm delete dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {deleteCount === 1
                ? "this document"
                : `${deleteCount} documents`}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. {deleteCount}{" "}
              {deleteCount === 1 ? "item" : "items"} will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDocument.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={deleteDocument.isPending}
            >
              {deleteDocument.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
