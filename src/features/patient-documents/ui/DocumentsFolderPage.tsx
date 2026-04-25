// Documents Folder Page - Shows documents for a specific category
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@/app/navigation";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PhotoUploader from "@/components/PhotoUploader";
import {
  useCategoryDocuments,
  useDeleteDocument,
  DocumentGrid,
  getCategoryConfig,
  isValidCategory,
  type DocCategory,
  type DocumentItem,
} from "@entities/document";

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
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);

  if (!category || !config) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <Header title="Documents" showBack onBack={() => navigate(-1)} />
        <main className="p-4">
          <div className="text-center py-12 text-red-500">
            Invalid document category
          </div>
        </main>
        <BottomBar />
      </div>
    );
  }

  const Icon = config.icon;

  const handleSelectAll = () => {
    if (documents) {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

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
        // Single delete
        await deleteDocument.mutateAsync({
          category,
          key: documentToDelete.id,
        });
      } else {
        // Bulk delete
        for (const id of selectedIds) {
          await deleteDocument.mutateAsync({ category, key: id });
        }
      }

      // Reset state
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

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header
        title={config.title}
        showBack
        onBack={() => patientId && navigate(paths.docsRoot(patientId), { replace: true })}
      />

      <main className="p-4">
        {/* Category Header */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className={`p-3 rounded-full bg-gradient-to-r ${config.bgFrom} ${config.bgTo}`}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{config.title}</h1>
            <p className="text-sm text-gray-600">
              {documents?.length ?? 0}{" "}
              {(documents?.length ?? 0) === 1 ? "document" : "documents"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedIds.size === 0}
                  onClick={handleDeleteSelected}
                >
                  Delete ({selectedIds.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedIds.size === documents?.length) {
                      handleClearSelection();
                    } else {
                      handleSelectAll();
                    }
                  }}
                >
                  {selectedIds.size === documents?.length ? "Clear" : "Select All"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectionMode(false);
                    handleClearSelection();
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                  disabled={!documents?.length}
                >
                  Select
                </Button>
                <PhotoUploader
                  patientId={patientId}
                  category={category}
                  onUploadComplete={() => refetch()}
                />
              </>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-gray-200 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-12 text-red-500">
            Failed to load documents. Please try again.
          </div>
        )}

        {/* Documents grid */}
        {documents && documents.length > 0 && (
          <DocumentGrid
            documents={documents}
            columns={4}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onDelete={handleDeleteSingle}
          />
        )}

        {/* Empty state */}
        {documents && documents.length === 0 && (
          <div className="text-center py-12">
            <div
              className={`mx-auto w-16 h-16 rounded-full bg-gradient-to-r ${config.bgFrom} ${config.bgTo} flex items-center justify-center mb-4`}
            >
              <Icon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {config.title.toLowerCase()} yet
            </h3>
            <p className="text-gray-500 mb-6">
              Start by uploading your first document to this category
            </p>
            <PhotoUploader
              patientId={patientId}
              category={category}
              onUploadComplete={() => refetch()}
              className="inline-block"
            />
          </div>
        )}
      </main>

      <BottomBar />

      {/* Confirm delete dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteCount === 1 ? "this document" : `${deleteCount} documents`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. {deleteCount}{" "}
              {deleteCount === 1 ? "item" : "items"} will be permanently removed.
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
              {deleteDocument.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
