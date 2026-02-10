import { useLocalSearchParams } from 'expo-router';
import { DocumentsRootScreen } from '../../../../src/domains/patient-documents/screens/DocumentsRootScreen';

export default function PatientDocumentsRootRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const patientId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!patientId) return null;

  return <DocumentsRootScreen patientId={patientId} />;
}
