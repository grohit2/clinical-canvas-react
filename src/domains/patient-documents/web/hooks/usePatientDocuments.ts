import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDocumentsApi, type DocumentsApi } from '../../api/documentsApi';
import {
  mapAllDocumentsFromApi,
  mapCategoryDocumentsFromApi,
  mapFolderSummariesFromApi,
  type ApiDocumentsProfile,
} from '../../core/mapFromApi';
import type { DocCategory, SortOrder } from '../../core/types';

const DOCUMENTS_QUERY_KEY = 'patient-documents';
const defaultDocumentsApi = createDocumentsApi(import.meta.env.VITE_API_BASE_URL || '/api');

export interface MoveDocumentInput {
  fromCategory: DocCategory;
  toCategory: DocCategory;
  key: string;
}

type DetachErrorLike = {
  status?: number;
  message?: string;
  body?: { error?: string };
};

function invalidatePatientDocuments(queryClient: ReturnType<typeof useQueryClient>, patientId: string | undefined) {
  if (!patientId) return;
  queryClient.invalidateQueries({
    queryKey: [DOCUMENTS_QUERY_KEY, patientId],
  });
}

export function usePatientDocumentsProfile(
  patientId: string | undefined,
  documentsApi: DocumentsApi = defaultDocumentsApi
) {
  return useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, patientId, 'profile'],
    queryFn: async () => {
      if (!patientId) throw new Error('Patient ID required');
      return (await documentsApi.getDocuments(patientId)) as ApiDocumentsProfile;
    },
    enabled: !!patientId,
    staleTime: 30_000,
  });
}

export function useDocumentFolderSummaries(
  patientId: string | undefined,
  documentsApi: DocumentsApi = defaultDocumentsApi
) {
  const profileQuery = usePatientDocumentsProfile(patientId, documentsApi);

  return {
    ...profileQuery,
    data:
      profileQuery.data && patientId
        ? mapFolderSummariesFromApi(patientId, profileQuery.data)
        : undefined,
  };
}

export function useCategoryDocuments(
  patientId: string | undefined,
  category: DocCategory | undefined,
  sortOrder: SortOrder = 'desc',
  documentsApi: DocumentsApi = defaultDocumentsApi
) {
  const profileQuery = usePatientDocumentsProfile(patientId, documentsApi);

  return {
    ...profileQuery,
    data:
      profileQuery.data && patientId && category
        ? mapCategoryDocumentsFromApi(patientId, profileQuery.data, category, undefined, sortOrder)
        : undefined,
  };
}

export function useAllDocuments(
  patientId: string | undefined,
  sortOrder: SortOrder = 'desc',
  documentsApi: DocumentsApi = defaultDocumentsApi
) {
  const profileQuery = usePatientDocumentsProfile(patientId, documentsApi);

  return {
    ...profileQuery,
    data:
      profileQuery.data && patientId
        ? mapAllDocumentsFromApi(patientId, profileQuery.data, undefined, sortOrder)
        : undefined,
  };
}

export function useDeleteDocument(
  patientId: string | undefined,
  documentsApi: DocumentsApi = defaultDocumentsApi
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      category,
      key,
    }: {
      category: DocCategory;
      key: string;
    }) => {
      if (!patientId) throw new Error('Patient ID required');

      let lastError: Error | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await documentsApi.detachDocument(patientId, { category, key });
          return { success: true };
        } catch (err: unknown) {
          const typedErr = err as DetachErrorLike;
          const fallbackErr = err instanceof Error ? err : new Error('Failed to detach document');

          lastError = fallbackErr;
          const status = typedErr.status ?? 0;
          const msg = typedErr.body?.error || typedErr.message || '';
          const is409 = status === 409 || String(msg).includes('retry detach');

          if (!is409 || attempt === 2) {
            throw fallbackErr;
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      throw lastError;
    },
    onSuccess: () => {
      invalidatePatientDocuments(queryClient, patientId);
    },
  });
}

export function useDeleteDocuments(
  patientId: string | undefined,
  documentsApi: DocumentsApi = defaultDocumentsApi
) {
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteDocument(patientId, documentsApi);

  return useMutation({
    mutationFn: async (items: Array<{ category: DocCategory; key: string }>) => {
      const results = { succeeded: 0, failed: 0 };

      for (const item of items) {
        try {
          await deleteMutation.mutateAsync(item);
          results.succeeded += 1;
        } catch {
          results.failed += 1;
        }
      }

      return results;
    },
    onSuccess: () => {
      invalidatePatientDocuments(queryClient, patientId);
    },
  });
}

export function useMoveDocument(
  patientId: string | undefined,
  documentsApi: DocumentsApi = defaultDocumentsApi
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fromCategory, toCategory, key }: MoveDocumentInput) => {
      if (!patientId) throw new Error('Patient ID required');

      return documentsApi.moveDocument(patientId, {
        fromCategory,
        toCategory,
        key,
      });
    },
    onSuccess: () => {
      invalidatePatientDocuments(queryClient, patientId);
    },
  });
}

export function useMoveDocuments(
  patientId: string | undefined,
  documentsApi: DocumentsApi = defaultDocumentsApi
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: MoveDocumentInput[]) => {
      const results = { succeeded: 0, failed: 0 };

      if (!patientId) throw new Error('Patient ID required');

      for (const item of items) {
        try {
          await documentsApi.moveDocument(patientId, item);
          results.succeeded += 1;
        } catch {
          results.failed += 1;
        }
      }

      return results;
    },
    onSuccess: () => {
      invalidatePatientDocuments(queryClient, patientId);
    },
  });
}
