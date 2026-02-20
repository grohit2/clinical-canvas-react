import Constants from 'expo-constants';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { createDocumentsApi } from '@patient-documents/api';
import { ImportSharedToPatientScreen } from '@patient-documents/mobile';
import { usePatients } from '../src/hooks/usePatients';
import { useSafeShareIntentContext } from '../src/lib/shareIntent-context';
import { getApiBaseUrl } from '../src/lib/api';

const documentsApi = createDocumentsApi(getApiBaseUrl());

export default function ImportSharedRoute() {
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const { data: patients = [], isLoading } = usePatients();
  const shareContext = useSafeShareIntentContext();
  const patientIdFromParams = Array.isArray(params.patientId)
    ? params.patientId[0]
    : params.patientId;
  const isExpoGo =
    Constants.executionEnvironment === 'storeClient' ||
    Constants.appOwnership === 'expo';

  // Expo Go cannot reliably emulate Android share-intent handoff.
  // Route launches without an explicit patient context should return to tabs.
  if (isExpoGo && !patientIdFromParams) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ImportSharedToPatientScreen
      documentsApi={documentsApi}
      availablePatients={patients}
      isLoading={isLoading}
      sharedFiles={shareContext.shareIntent.files || []}
      resetShareIntent={shareContext.resetShareIntent}
    />
  );
}
