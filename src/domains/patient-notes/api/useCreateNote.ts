// useCreateNote - TanStack Query mutation hook for creating notes

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Note, NoteCategory } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface CreateNotePayload {
  patientId: string;
  category: NoteCategory;
  content: string;
  author: string;
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation<Note, Error, CreateNotePayload>({
    mutationFn: async (payload) => {
      // TODO: Implement actual API call
      // return api.notes.create(payload);
      throw new Error('Not implemented');
    },
    onSuccess: (newNote) => {
      // Invalidate notes list for this patient
      queryClient.invalidateQueries({
        queryKey: ['notes', { patientId: newNote.patientId }],
      });

      // Also invalidate general notes query
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
