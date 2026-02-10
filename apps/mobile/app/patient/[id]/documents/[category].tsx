import { useLocalSearchParams } from 'expo-router';
import { DocumentsFolderScreen } from '../../../../src/domains/patient-documents/screens/DocumentsFolderScreen';
import { isValidCategory } from '../../../../src/domains/patient-documents/core/types';

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

  return <DocumentsFolderScreen patientId={patientId} category={category} />;
}
