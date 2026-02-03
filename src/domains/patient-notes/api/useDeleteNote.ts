// useDeleteNote - TanStack Query mutation hook for deleting notes

import { useMutation, useQueryClient } from '@tanstack/react-query';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export function useDeleteNote(noteId: string, patientId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      // TODO: Implement actual API call
      // return api.notes.remove(noteId);
      throw new Error('Not implemented');
    },
    onSuccess: () => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['note', noteId] });

      // Invalidate notes list for this patient
      queryClient.invalidateQueries({
        queryKey: ['notes', { patientId }],
      });

      // Also invalidate general notes query
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
