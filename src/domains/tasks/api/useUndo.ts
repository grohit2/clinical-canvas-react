import { useMutation, useQueryClient } from '@tanstack/react-query';
import { undoLastOp } from '../local-ledger/services/undoService';
import { getActiveActorId, getDeviceId } from '../local-ledger/utils/device';

export function useUndo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const actorId = getActiveActorId() ?? 'anon';
      const deviceId = getDeviceId();
      return undoLastOp({ actorId, deviceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ops'] });
    },
  });
}
