// Screens
export { PatientDetailScreen } from './screens/PatientDetailScreen';

// Types (for cross-domain use)
export type { PatientDetail, LabResult, VitalSign, TimelineEvent } from './core/types';

// API hooks (other domains may need these)
export { usePatient } from './api/usePatient';
export { useUpdatePatient } from './api/useUpdatePatient';

// Components (only if reused elsewhere)
export { PatientQRView } from './components/PatientQRView';
