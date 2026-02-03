// useNotes - TanStack Query hook for fetching notes

import { useQuery } from '@tanstack/react-query';
import type { Note, NoteCategory } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface UseNotesOptions {
  patientId?: string;
  category?: NoteCategory;
  enabled?: boolean;
}

export function useNotes(options: UseNotesOptions = {}) {
  const { patientId, category, enabled = true } = options;

  return useQuery<Note[]>({
    queryKey: ['notes', { patientId, category }],
    queryFn: async () => {
      // TODO: Implement actual API call
      // return api.notes.list({ patientId, category });
      throw new Error('Not implemented');
    },
    enabled: enabled && !!patientId,
  });
}

export function useNotesByPatient(patientId: string, options: Omit<UseNotesOptions, 'patientId'> = {}) {
  return useNotes({
    ...options,
    patientId,
    enabled: options.enabled !== false && !!patientId,
  });
}

export function useNote(noteId: string, options: { enabled?: boolean } = {}) {
  return useQuery<Note>({
    queryKey: ['note', noteId],
    queryFn: async () => {
      // TODO: Implement actual API call
      // return api.notes.get(noteId);
      throw new Error('Not implemented');
    },
    enabled: options.enabled !== false && !!noteId,
  });
}
