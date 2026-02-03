// Screens
export { AddNoteScreen } from './screens/AddNoteScreen';
export { EditNoteScreen } from './screens/EditNoteScreen';
export { NoteDetailScreen } from './screens/NoteDetailScreen';

// Types
export type { Note, NoteCategory, NoteAttachment, NoteCategoryConfig } from './core/types';

// Core utilities
export {
  NOTE_CATEGORIES,
  CATEGORY_COLORS,
  getCategoryConfig,
  getCategoryLabel,
  getCategoryColor,
  getCategoryBgColor,
} from './core/types';

// API hooks
export { useNotes, useNote, useNotesByPatient } from './api/useNotes';
export { useCreateNote } from './api/useCreateNote';
export { useUpdateNote } from './api/useUpdateNote';
export { useDeleteNote } from './api/useDeleteNote';

// Components
export { NoteCard } from './components/NoteCard';
export { NoteForm } from './components/NoteForm';
