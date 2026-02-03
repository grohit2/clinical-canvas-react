// Screens
export { DocumentsRootScreen } from './screens/DocumentsRootScreen';
export { DocumentsFolderScreen } from './screens/DocumentsFolderScreen';

// Types
export type { DocumentItem, DocCategory, FolderSummary } from './core/types';

// API hooks
export { usePatientDocuments, useCategoryDocuments, useDeleteDocument, useDocumentFolderSummaries } from './api/usePatientDocuments';

// Core utilities
export { mapFromApi } from './core/mapFromApi';
export { getCategoryConfig, isValidCategory, CATEGORY_CONFIG } from './core/CategoryConfig';

// Components (if needed by other domains)
export { DocumentCard } from './components/DocumentCard';
export { DocumentGrid } from './components/DocumentGrid';
export { DocumentLightbox } from './components/DocumentLightbox';
export { CategoryChips } from './components/CategoryChips';
export { FolderCard } from './components/FolderCard';
