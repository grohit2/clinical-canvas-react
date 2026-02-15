import { runInLedgerTransaction } from '../db';
import {
  tryInsertAutomationRun,
  updateAutomationRunOpsCreated,
  updateAutomationRunStatus,
} from '../internal/ops.mutate';
import { findTaskByOriginKey, getTaskById } from '../queries/tasks.read';
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

export async function runAutomationForOp(op: OpInput & { resultVersion: number; createdAt: string }) {
  if (op.opType === 'automation' || op.opType === 'undo' || op.opType === 'delete') {
    return;
  }

  if (op.entityType === 'task' && op.opType === 'create') {
    await handleTaskCreated(op);
  }
}

async function handleTaskCreated(triggerOp: OpInput & { resultVersion: number; createdAt: string }) {
  const triggerTask = await getTaskById(triggerOp.entityId);
  if (!triggerTask) {
    return;
  }

  const matching = RULES.filter((rule) => rule.enabled && rule.trigger === 'task.created');
  if (matching.length === 0) {
    return;
  }

  const { applyOp } = await import('./commandService');

  for (const rule of matching) {
    const runId = ulid();
    const claimed = await runInLedgerTransaction((state) =>
      tryInsertAutomationRun(state, {
        id: runId,
        ruleId: rule.id,
        triggerOpId: triggerOp.opId,
        status: 'completed',
        opsCreated: 0,
        errorMessage: null,
        createdAt: new Date().toISOString(),
      }),
    );

    if (!claimed) {
      continue;
    }

    let opsCreated = 0;

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
}
