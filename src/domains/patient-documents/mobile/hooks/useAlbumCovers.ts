import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DOC_CATEGORIES } from '../../core/categories';
import type { DocCategory } from '../../core/types';
import { listPatientDocuments } from '../offline/db';
import { getPatientDocumentsKey } from './useDateGroups';

function resolveThumbnailUri(item: {
  localThumbUri?: string;
  thumbUrl?: string;
  localUri?: string;
  fileUrl?: string;
  geo?: unknown;
}) {
  if (item.geo) {
    return item.localUri || item.fileUrl || item.thumbUrl || item.localThumbUri;
  }
  return item.localThumbUri || item.thumbUrl || item.localUri || item.fileUrl;
}

export function useAlbumCovers(patientId: string): {
  data: Map<DocCategory, string[]>;
  isLoading: boolean;
  isFetching: boolean;
} {
  const query = useQuery({
    queryKey: getPatientDocumentsKey(patientId),
    enabled: !!patientId,
    queryFn: () => listPatientDocuments(patientId),
  });

  const coverMap = useMemo(() => {
    const allDocs = query.data || [];
    const map = new Map<DocCategory, string[]>();

    for (const category of DOC_CATEGORIES) {
      const categoryDocs = allDocs
        .filter((item) => item.category === category && item.isImage)
        .slice(0, 4);
      const uris = categoryDocs.map(resolveThumbnailUri).filter((uri): uri is string => !!uri);
      map.set(category, uris);
    }

    return map;
  }, [query.data]);

  return {
    data: coverMap,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
