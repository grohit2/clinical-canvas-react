import { useLocalSearchParams } from 'expo-router';
import { createDocumentsApi } from '@patient-documents/api';
import { isValidCategory } from '@patient-documents/core';
import { DocumentsFolderScreen } from '@patient-documents/mobile';
import { getApiBaseUrl } from '../../../../src/lib/api';

const documentsApi = createDocumentsApi(getApiBaseUrl());

export default function PatientDocumentsCategoryRoute() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    category?: string | string[];
  }>();
  const patientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const category = Array.isArray(params.category) ? params.category[0] : params.category;

  if (!patientId || !isValidCategory(category)) {
    return null;
  }

  return (
    <DocumentsFolderScreen
      patientId={patientId}
      category={category}
      documentsApi={documentsApi}
    />
  );
}
