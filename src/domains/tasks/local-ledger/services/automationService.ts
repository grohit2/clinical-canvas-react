import { readLedgerState, runInLedgerTransaction } from '../db';
import {
  tryInsertAutomationRun,
  updateAutomationRunOpsCreated,
} from '../internal/ops.mutate';
import { findTaskByOriginKey } from '../queries/tasks.read';
import type { OpInput } from './commandService';
import { ulid } from '../utils/ids';

export interface AutomationRule {
  id: string;
  trigger: 'task.created' | 'task.updated';
  enabled: boolean;
  actions: Array<{
    templateId: string;
    title: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }>;
}

// Patient-triggered automations are intentionally deferred in this phase.
const RULES: AutomationRule[] = [];

export async function runAutomationForOp(op: OpInput & { resultVersion: number; createdAt: string }) {
  if (op.opType === 'automation' || op.opType === 'undo' || op.opType === 'delete') {
    return;
  }

  if (op.entityType === 'task' && op.opType === 'create') {
    await handleTaskCreated(op);
  }
}

async function handleTaskCreated(triggerOp: OpInput & { resultVersion: number; createdAt: string }) {
  const matching = RULES.filter((rule) => rule.enabled && rule.trigger === 'task.created');
  if (matching.length === 0) {
    return;
  }

  for (const rule of matching) {
    const runId = ulid();
    const claimed = await runInLedgerTransaction((state) =>
      tryInsertAutomationRun(state, {
        id: runId,
        ruleId: rule.id,
        triggerOpId: triggerOp.opId,
        status: 'completed',
        opsCreated: 0,
        createdAt: new Date().toISOString(),
      }),
    );

    if (!claimed) {
      continue;
    }

    let opsCreated = 0;
    for (const action of rule.actions) {
      const originKey = `task:${triggerOp.entityId}:rule:${rule.id}:tpl:${action.templateId}`;
      const existing = await findTaskByOriginKey(originKey);
      if (existing) {
        continue;
      }

      // Action execution intentionally deferred while task-only ledger stabilizes.
      opsCreated += 0;
    }

    await runInLedgerTransaction((state) => {
      updateAutomationRunOpsCreated(state, runId, opsCreated);
    });
  }

  // Keep hook for future diagnostics.
  readLedgerState();
}
