import { useQuery } from '@tanstack/react-query';
import type { DocCategory } from '../core/types';
import { listCategoryDocuments } from '../offline/db';

export function getCategoryDocumentsKey(patientId: string, category: DocCategory) {
  return ['patient-documents', patientId, category] as const;
}

export function useCategoryDocuments(patientId: string, category: DocCategory) {
  return useQuery({
    queryKey: getCategoryDocumentsKey(patientId, category),
    enabled: !!patientId && !!category,
    queryFn: () => listCategoryDocuments(patientId, category),
  });
}
