// Documents Root Page - Shows folder overview for all document categories
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@/app/navigation";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Plus } from "lucide-react";
import {
  useDocumentFolderSummaries,
  FolderGrid,
  type DocCategory,
} from "@entities/document";

export function DocumentsRootPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: summaries, isLoading, error } = useDocumentFolderSummaries(patientId);

  const handleOpenFolder = (category: DocCategory) => {
    if (patientId) {
      navigate(paths.docsCategory(patientId, category));
    }
  };

  const totalDocuments = summaries?.reduce((acc, s) => acc + s.count, 0) ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header title="Documents" showBack onBack={() => navigate(-1)} />

      <main className="p-4">
        <h2 className="text-[#0d141c] text-[22px] font-bold tracking-[-0.015em] pb-3 pt-1">
          All Documents
        </h2>

        {isLoading && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-lg border border-gray-200 bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-red-500">
            Failed to load documents. Please try again.
          </div>
        )}

        {summaries && (
          <>
            <FolderGrid summaries={summaries} onOpenFolder={handleOpenFolder} />

            {/* Total summary */}
            <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-white">
              <p className="text-gray-600 text-sm">
                Total: <span className="font-semibold">{totalDocuments}</span>{" "}
                {totalDocuments === 1 ? "document" : "documents"} across all categories
              </p>
            </div>
          </>
        )}
      </main>

      {/* Floating Action Button for Quick Upload */}
      {patientId && (
        <button
          onClick={() => {
            // TODO: Show category selector modal
            // For now, navigate to first category
            navigate(paths.docsCategory(patientId, "preop_pics"));
          }}
          className="fixed bottom-24 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors z-40"
          title="Add Photo"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <BottomBar />
    </div>
  );
}
