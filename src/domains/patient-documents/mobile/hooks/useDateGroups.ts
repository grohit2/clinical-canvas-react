import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  extractYearSummaries,
  groupDocumentsByDate,
} from '../../core';
import { listPatientDocuments } from '../offline/db';
import {
  debugBreadcrumb,
  debugBreadcrumbError,
} from '../debug/breadcrumbs';

export function getPatientDocumentsKey(patientId: string) {
  return ['patient-documents', patientId, 'all-documents'] as const;
}

export function useDateGroups(patientId: string) {
  const query = useQuery({
    queryKey: getPatientDocumentsKey(patientId),
    enabled: !!patientId,
    queryFn: async () => {
      debugBreadcrumb('date_groups.query.start', { patientId });
      try {
        const docs = await listPatientDocuments(patientId);
        debugBreadcrumb('date_groups.query.success', {
          patientId,
          documentCount: docs.length,
        });
        return docs;
      } catch (error) {
        debugBreadcrumbError('date_groups.query.failed', error, { patientId });
        throw error;
      }
    },
  });

  const documents = useMemo(() => query.data || [], [query.data]);

  const sections = useMemo(() => groupDocumentsByDate(documents), [documents]);
  const years = useMemo(() => extractYearSummaries(sections), [sections]);

  useEffect(() => {
    debugBreadcrumb('date_groups.recomputed', {
      patientId,
      documentCount: documents.length,
      sectionCount: sections.length,
      yearCount: years.length,
    });
  }, [documents.length, patientId, sections.length, years.length]);

  return {
    documents,
    sections,
    years,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
