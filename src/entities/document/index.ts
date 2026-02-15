export {
  useDocumentFolderSummaries,
  useCategoryDocuments,
  useDeleteDocument,
} from '../../domains/patient-documents/api/usePatientDocuments';
export { FolderGrid } from '../../domains/patient-documents/components/FolderCard';
export { DocumentGrid } from '../../domains/patient-documents/components/DocumentGrid';
export { getCategoryConfig } from '../../domains/patient-documents/core/CategoryConfig';
export {
  isValidCategory,
  type DocCategory,
  type DocumentItem,
} from '../../domains/patient-documents/core/types';
