import { useLocalSearchParams } from 'expo-router';
import { createDocumentsApi } from '@patient-documents/api';
import { DocumentsRootScreen } from '@patient-documents/mobile';
import { getApiBaseUrl } from '../../../../src/lib/api';

const documentsApi = createDocumentsApi(getApiBaseUrl());

export default function PatientDocumentsRootRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const patientId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!patientId) return null;

  return <DocumentsRootScreen patientId={patientId} documentsApi={documentsApi} />;
}
