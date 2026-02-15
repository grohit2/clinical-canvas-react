<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
import { runInLedgerTransaction } from '../db';
import {
  tryInsertAutomationRun,
  updateAutomationRunOpsCreated,
  updateAutomationRunStatus,
} from '../internal/ops.mutate';
import { findTaskByOriginKey, getTaskById } from '../queries/tasks.read';
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
import { readLedgerState, runInLedgerTransaction } from '../db';
import {
  tryInsertAutomationRun,
  updateAutomationRunOpsCreated,
} from '../internal/ops.mutate';
import { findTaskByOriginKey } from '../queries/tasks.read';
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
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
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
// Keep one disabled sample so the runtime path stays exercised/documented.
const RULES: AutomationRule[] = [
  {
    id: 'task_follow_up_template',
    trigger: 'task.created',
    enabled: false,
    actions: [
      {
        templateId: 'follow_up',
        title: 'Follow up on created task',
        priority: 'medium',
      },
    ],
  },
];
=======
const RULES: AutomationRule[] = [];
>>>>>>> theirs
=======
const RULES: AutomationRule[] = [];
>>>>>>> theirs
=======
const RULES: AutomationRule[] = [];
>>>>>>> theirs
=======
const RULES: AutomationRule[] = [];
>>>>>>> theirs
=======
const RULES: AutomationRule[] = [];
>>>>>>> theirs

export async function runAutomationForOp(op: OpInput & { resultVersion: number; createdAt: string }) {
  if (op.opType === 'automation' || op.opType === 'undo' || op.opType === 'delete') {
    return;
  }

  if (op.entityType === 'task' && op.opType === 'create') {
    await handleTaskCreated(op);
  }
}

async function handleTaskCreated(triggerOp: OpInput & { resultVersion: number; createdAt: string }) {
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
  const triggerTask = await getTaskById(triggerOp.entityId);
  if (!triggerTask) {
    return;
  }

=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
  const matching = RULES.filter((rule) => rule.enabled && rule.trigger === 'task.created');
  if (matching.length === 0) {
    return;
  }

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
  const { applyOp } = await import('./commandService');

=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
  for (const rule of matching) {
    const runId = ulid();
    const claimed = await runInLedgerTransaction((state) =>
      tryInsertAutomationRun(state, {
        id: runId,
        ruleId: rule.id,
        triggerOpId: triggerOp.opId,
        status: 'completed',
        opsCreated: 0,
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
        errorMessage: null,
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
        createdAt: new Date().toISOString(),
      }),
    );

    if (!claimed) {
      continue;
    }

    let opsCreated = 0;
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours

    try {
      for (const action of rule.actions) {
        const originKey = `task:${triggerOp.entityId}:rule:${rule.id}:tpl:${action.templateId}`;
        const existing = await findTaskByOriginKey(originKey);
        if (existing) {
          continue;
        }

        const taskId = ulid();
        await applyOp({
          opId: ulid(),
          opGroupId: triggerOp.opGroupId ?? triggerOp.opId,
          entityType: 'task',
          entityId: taskId,
          opType: 'automation',
          actorId: 'system',
          deviceId: triggerOp.deviceId,
          baseVersion: 0,
          patch: {
            id: taskId,
            title: action.title,
            description: '',
            priority: action.priority ?? 'medium',
            status: 'pending',
            dueDate: triggerTask.dueDate,
            patientId: triggerTask.patientId,
            patientName: triggerTask.patientName,
            assigneeId: triggerTask.assigneeId,
            assigneeName: triggerTask.assigneeName,
            departmentId: triggerTask.departmentId,
            completedAt: null,
            sortOrder: triggerTask.sortOrder,
            origin: 'automation',
            originKey,
          },
          inversePatch: {
            deletedAt: new Date().toISOString(),
          },
          causedByOpId: triggerOp.opId,
          reason: `Automation rule ${rule.id}`,
        });

        opsCreated += 1;
      }

      await runInLedgerTransaction((state) => {
        updateAutomationRunOpsCreated(state, runId, opsCreated);
      });
    } catch (error) {
      await runInLedgerTransaction((state) => {
        updateAutomationRunStatus(
          state,
          runId,
          'skipped',
          error instanceof Error ? error.message : 'Unknown automation error',
        );
      });
      throw error;
    }
  }
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
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
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
}
