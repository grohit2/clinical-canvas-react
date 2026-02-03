// useUpdateNote - TanStack Query mutation hook for updating notes

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Note, NoteCategory } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface UpdateNotePayload {
  category?: NoteCategory;
  content?: string;
  author?: string;
}

export function useUpdateNote(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation<Note, Error, UpdateNotePayload>({
    mutationFn: async (payload) => {
      // TODO: Implement actual API call
      // return api.notes.update(noteId, payload);
      throw new Error('Not implemented');
    },
    onSuccess: (updatedNote) => {
      // Update the specific note in cache
      queryClient.setQueryData(['note', noteId], updatedNote);

      // Invalidate notes list for this patient
      queryClient.invalidateQueries({
        queryKey: ['notes', { patientId: updatedNote.patientId }],
      });
    },
  });
}
