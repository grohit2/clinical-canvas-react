import { useQuery } from '@tanstack/react-query';
import {
  countOpsForActorDay,
  getOpsForActorDay,
  getOpsForEntity,
} from '../local-ledger/queries/ops.read';
import { getLocalDay } from '../local-ledger/utils/device';

// UI-facing activity fields:
// - createdAt: timeline timestamp
// - entityType/entityId: action target
// - opType: create/update/delete/undo/automation
// - patchJson: effective patch payload
// - causedByOpId: causal link (automation chains)
// - reason: human-readable action context
// - actorId: who performed the action
export interface ActivityOp {
  createdAt: string;
  entityType: string;
  entityId: string;
  opType: string;
  patchJson: string;
  causedByOpId: string | null;
  reason: string | null;
  actorId: string | null;
}

export function useMyActionsToday(actorId: string) {
  const today = getLocalDay();
  return useQuery({
    queryKey: ['ops', 'actor', actorId, today],
    queryFn: () => getOpsForActorDay(actorId, today),
    staleTime: 5_000,
  });
}

export function useMyActionCountToday(actorId: string) {
  const today = getLocalDay();
  return useQuery({
    queryKey: ['ops', 'actor', actorId, today, 'count'],
    queryFn: () => countOpsForActorDay(actorId, today),
    staleTime: 5_000,
  });
}

export function useTaskActivity(entityId: string) {
  return useQuery({
    queryKey: ['ops', 'entity', 'task', entityId],
    queryFn: () => getOpsForEntity('task', entityId),
  });
}
