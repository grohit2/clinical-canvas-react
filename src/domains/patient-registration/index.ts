// Screens
export { RegistrationScreen } from './screens/RegistrationScreen';
export { AddMrnScreen } from './screens/AddMrnScreen';

// Types
export type { RegistrationFormData, RegistrationStep, MrnEntry } from './core/types';

// API hooks
export { useCreatePatient } from './api/useCreatePatient';
export { useAddMrn } from './api/useAddMrn';

// Hooks (if needed by other domains)
export { useRegistrationForm } from './hooks/useRegistrationForm';
