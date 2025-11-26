import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocuments, detachDocument as apiDetachDocument } from "@/lib/filesApi";
import type { DocCategory, DocumentItem, FolderSummary, SortOrder } from "../model/types";
import {
  mapFolderSummariesFromApi,
  mapCategoryDocumentsFromApi,
  mapAllDocumentsFromApi,
  type ApiDocumentsProfile,
} from "../model/mapFromApi";

const DOCUMENTS_QUERY_KEY = "patient-documents";

/**
 * Hook to fetch all documents for a patient (raw profile)
 */
export function usePatientDocumentsProfile(patientId: string | undefined) {
  return useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, patientId, "profile"],
    queryFn: async () => {
      if (!patientId) throw new Error("Patient ID required");
      return (await getDocuments(patientId)) as ApiDocumentsProfile;
    },
    enabled: !!patientId,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Hook to fetch folder summaries (counts per category)
 */
export function useDocumentFolderSummaries(patientId: string | undefined) {
  const profileQuery = usePatientDocumentsProfile(patientId);

  return {
    ...profileQuery,
    data: profileQuery.data ? mapFolderSummariesFromApi(profileQuery.data) : undefined,
  };
}

/**
 * Hook to fetch documents for a specific category
 */
export function useCategoryDocuments(
  patientId: string | undefined,
  category: DocCategory | undefined,
  sortOrder: SortOrder = "desc"
) {
  const profileQuery = usePatientDocumentsProfile(patientId);

  return {
    ...profileQuery,
    data:
      profileQuery.data && category
        ? mapCategoryDocumentsFromApi(profileQuery.data, category, sortOrder)
        : undefined,
  };
}

/**
 * Hook to fetch all documents across all categories
 */
export function useAllDocuments(
  patientId: string | undefined,
  sortOrder: SortOrder = "desc"
) {
  const profileQuery = usePatientDocumentsProfile(patientId);

  return {
    ...profileQuery,
    data: profileQuery.data
      ? mapAllDocumentsFromApi(profileQuery.data, sortOrder)
      : undefined,
  };
}

/**
 * Hook to delete/detach a document
 */
export function useDeleteDocument(patientId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      category,
      key,
    }: {
      category: DocCategory;
      key: string;
    }) => {
      if (!patientId) throw new Error("Patient ID required");

      // Retry logic for 409 conflicts
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await apiDetachDocument(patientId, { category, key });
          return { success: true };
        } catch (err: any) {
          lastError = err;
          const status = err?.status || 0;
          const msg = err?.body?.error || err?.message || "";
          const is409 = status === 409 || String(msg).includes("retry detach");

          if (!is409 || attempt === 2) {
            throw err;
          }
          // Wait a bit before retrying
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      throw lastError;
    },
    onSuccess: () => {
      // Invalidate the documents query to refetch
      queryClient.invalidateQueries({
        queryKey: [DOCUMENTS_QUERY_KEY, patientId],
      });
    },
  });
}

/**
 * Hook to delete multiple documents
 */
export function useDeleteDocuments(patientId: string | undefined) {
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteDocument(patientId);

  return useMutation({
    mutationFn: async (
      items: Array<{ category: DocCategory; key: string }>
    ) => {
      const results = { succeeded: 0, failed: 0 };

      for (const item of items) {
        try {
          await deleteMutation.mutateAsync(item);
          results.succeeded++;
        } catch {
          results.failed++;
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [DOCUMENTS_QUERY_KEY, patientId],
      });
    },
  });
}
