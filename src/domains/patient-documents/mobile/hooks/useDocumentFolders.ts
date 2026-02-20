import { useQuery } from '@tanstack/react-query';
import { DOC_CATEGORIES } from '../../core/categories';
import type { FolderSummary } from '../../core/types';
import { listFolderSummaries } from '../offline/db';

export function getDocumentFoldersKey(patientId: string) {
  return ['patient-documents', patientId, 'folders'] as const;
}

export function useDocumentFolders(patientId: string) {
  return useQuery({
    queryKey: getDocumentFoldersKey(patientId),
    enabled: !!patientId,
    queryFn: async () => {
      const summaries = await listFolderSummaries(patientId);
      const byCategory = new Map(summaries.map((item) => [item.category, item]));

      const complete: FolderSummary[] = DOC_CATEGORIES.map((category) => {
        const existing = byCategory.get(category);
        return (
          existing || {
            category,
            count: 0,
            pendingBackupCount: 0,
          }
        );
      });

      return complete;
    },
  });
}
