import { useLocalSearchParams } from 'expo-router';
import { PatientRegistrationScreen } from '../../../../src/domains/patient-registration/screens/PatientRegistrationScreen';

export default function EditPatientRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PatientRegistrationScreen patientId={typeof id === 'string' ? id : undefined} />;
}
