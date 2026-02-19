// Screens
export { DocumentsRootPage } from './screens/DocumentsRootScreen';
export { DocumentsFolderPage } from './screens/DocumentsFolderScreen';

// Types
export type { DocumentItem, DocCategory, FolderSummary } from './core/types';

// API hooks
export { useAllDocuments, useCategoryDocuments, useDeleteDocument, useDocumentFolderSummaries } from './api/usePatientDocuments';

// Core utilities
export { getCategoryConfig, CATEGORY_CONFIG } from './core/CategoryConfig';
export { isValidCategory } from './core/types';

// Components (if needed by other domains)
export { DocumentCard } from './components/DocumentCard';
export { DocumentGrid } from './components/DocumentGrid';
export { DocumentLightbox } from './components/DocumentLightbox';
export { CategoryChips } from './components/CategoryChips';
export { FolderCard } from './components/FolderCard';
export { MemoriesCarousel } from './components/MemoriesCarousel';
export { PhotosDateGrid } from './components/PhotosDateGrid';
