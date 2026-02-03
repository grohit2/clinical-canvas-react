// Screens
export { DischargeSummaryScreen } from './screens/DischargeSummaryScreen';

// Types
export type {
  DischargeSummaryData,
  DischargeMedicationItem,
  DischargeSectionData,
  DischargeSummaryVersion,
  DischargeExportFormat,
} from './core/types';

// API hooks
export { useDischargeLatest } from './api/useDischargeLatest';
export { useCreateDischargeVersion } from './api/useCreateDischargeVersion';

// Core utilities (for cross-domain use)
export { SECTION_DEFINITIONS, adaptSections } from './core/sections';
export { buildStructuredDischargeDocxBlob } from './core/export/structuredDischargeDocx';
export { sectionsToDocx } from './core/export/sectionsToDocx';

// Components
export { DischargeSummaryForm } from './components/DischargeSummaryForm';
