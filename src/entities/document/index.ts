// Document Entity
// Exports types, model utilities, and API hooks for document management

// Types
export type {
  DocCategory,
  DocumentItem,
  FolderSummary,
  SortOrder,
} from "./model/types";

export {
  DOC_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_FULL_LABELS,
  isValidCategory,
} from "./model/types";

// Mapping utilities
export {
  mapDocumentFromApi,
  mapFolderSummariesFromApi,
  mapCategoryDocumentsFromApi,
  mapAllDocumentsFromApi,
} from "./model/mapFromApi";

export type { ApiDocument, ApiDocumentsProfile } from "./model/mapFromApi";

// API hooks
export {
  usePatientDocumentsProfile,
  useDocumentFolderSummaries,
  useCategoryDocuments,
  useAllDocuments,
  useDeleteDocument,
  useDeleteDocuments,
} from "./api/usePatientDocuments";

// UI components
export {
  DocumentCard,
  DocumentGrid,
  DocumentLightbox,
  CategoryChips,
  FolderCard,
  FolderGrid,
  CATEGORY_CONFIG,
  getCategoryConfig,
  getCategoryIcon,
} from "./ui";

export type { CategoryConfigItem } from "./ui";
