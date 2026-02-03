// Screens
export { AddMedicationScreen } from './screens/AddMedicationScreen';
export { EditMedicationScreen } from './screens/EditMedicationScreen';

// Types
export type {
  Medication,
  MedPriority,
  MedStatus,
  MedRoute,
  MedFrequency,
  RouteConfig,
  FrequencyConfig,
} from './core/types';

// Core utilities
export { ROUTES, FREQUENCIES, getRouteConfig, getFrequencyConfig } from './core/types';

export {
  PRIORITY_CONFIG,
  PRIORITY_ORDER,
  PRIORITY_COLORS,
  getPriorityConfig,
  getPriorityColor,
  getPriorityBgColor,
  getPriorityLabel,
  comparePriority,
} from './core/priorities';

// API hooks
export { useMedications, useMedication, useMedicationsByPatient, useActiveMedications } from './api/useMedications';
export { useCreateMedication } from './api/useCreateMedication';
export { useUpdateMedication, useDiscontinueMedication } from './api/useUpdateMedication';

// Components
export { MedicationCard } from './components/MedicationCard';
export { MedicationForm } from './components/MedicationForm';
