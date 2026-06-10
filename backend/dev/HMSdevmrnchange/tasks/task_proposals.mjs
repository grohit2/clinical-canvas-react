// task_proposals.mjs — AI proposal create/edit/commit/reject (Node 22 ESM)
// Spec: §3.9, §6.3, §8.3, §9.2-9.4 flows.
// NOTE: open scope conflict — master plan §11 keeps proposals in Phase 1;
// revised scope says skip. Operating under loop guardrail (in scope).

import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { transactWriteAll, newTaskId } from "./task_store.mjs";
import { createTask, patchTask } from "./task_crud.mjs";

export const proposalPK = (id) => `TASKPROPOSAL#${id}`;
const newProposalId = () => `proposal_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;

export async function createProposal(deps, { body, actor, nowISO }) {
  const { ddb, TABLE } = deps;
  if (!body?.intent) throw Object.assign(new Error("intent is required"), { code: "BAD_REQUEST" });
  if (!Array.isArray(body.operations) || body.operations.length === 0) {
    throw Object.assign(new Error("operations[] is required"), { code: "BAD_REQUEST" });
  }
  const proposalId = body.proposalId || newProposalId();
  const item = {
    PK: proposalPK(proposalId), SK: "META",
    entity: "TASK_PROPOSAL",
    proposal_id: proposalId,
    status: body.status || "ready",
    intent: body.intent,
    source: body.source || { kind: "agent" },
    actor: actor || body.actor || null,
    operations: body.operations,
    validation: body.validation || { ready: true, errors: [], warnings: [], assumptions: [] },
    preview: body.preview || null,
    version: 1,
    expires_at: body.expiresAt || Math.floor(Date.now() / 1000) + 60 * 60,
    created_at: nowISO,
    updated_at: nowISO,
  };
  await ddb.send(new PutCommand({
    TableName: TABLE, Item: item,
    ConditionExpression: "attribute_not_exists(PK)",
  }));
  return item;
}

export async function getProposal(deps, proposalId) {
  const { ddb, TABLE } = deps;
  const r = await ddb.send(new GetCommand({
    TableName: TABLE, Key: { PK: proposalPK(proposalId), SK: "META" },
  }));
  return r.Item || null;
}

export async function patchProposal(deps, { proposalId, body, expectedVersion, nowISO }) {
  const { ddb, TABLE } = deps;
  const current = await getProposal(deps, proposalId);
  if (!current) throw Object.assign(new Error("Proposal not found"), { code: "NOT_FOUND" });
  const expV = expectedVersion ?? current.version;
  if (expV !== current.version) {
    throw Object.assign(new Error("version conflict"), { code: "CONFLICT" });
  }
  if (["committed", "rejected"].includes(current.status)) {
    throw Object.assign(new Error(`proposal is ${current.status}`), { code: "BAD_REQUEST" });
  }
  const next = {
    ...current,
    operations: body.operations || current.operations,
    validation: body.validation || current.validation,
    preview: body.preview || current.preview,
    status: body.status || current.status,
    version: current.version + 1,
    updated_at: nowISO,
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: next }));
  return next;
}

export async function commitProposal(deps, { proposalId, actor, clientMutationId, nowISO, resolvePatientUid }) {
  const proposal = await getProposal(deps, proposalId);
  if (!proposal) throw Object.assign(new Error("Proposal not found"), { code: "NOT_FOUND" });
  if (proposal.status === "committed") return { proposal, committed: [] };
  if (proposal.status === "rejected") throw Object.assign(new Error("proposal rejected"), { code: "BAD_REQUEST" });

  const committed = [];
  for (const op of proposal.operations || []) {
    const tgt = op.target || {};
    const uid = tgt.patient_uid || (resolvePatientUid && await resolvePatientUid(tgt.mrn));
    if (!uid) throw Object.assign(new Error(`cannot resolve patient for op ${op.op_id}`), { code: "BAD_REQUEST" });

    if (op.action === "create_task") {
      const out = await createTask(deps, {
        uid, mrn: tgt.mrn, body: { ...op.after, taskId: newTaskId() },
        actor: actor || proposal.actor, clientMutationId: `${clientMutationId || proposalId}#${op.op_id}`, nowISO,
      });
      committed.push({ op_id: op.op_id, action: "create_task", task_id: out.item.task_id });
    } else if (op.action === "update_task") {
      const out = await patchTask(deps, {
        uid, taskId: tgt.task_id, body: op.after, expectedVersion: op.before?.version,
        actor: actor || proposal.actor, clientMutationId: `${clientMutationId || proposalId}#${op.op_id}`, nowISO,
      });
      committed.push({ op_id: op.op_id, action: "update_task", task_id: tgt.task_id, version: out.item.version });
    } else {
      throw Object.assign(new Error(`unsupported op action: ${op.action}`), { code: "BAD_REQUEST" });
    }
  }

  await deps.ddb.send(new UpdateCommand({
    TableName: deps.TABLE,
    Key: { PK: proposalPK(proposalId), SK: "META" },
    UpdateExpression: "SET #s = :c, committed = :cm, updated_at = :now",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":c": "committed", ":cm": committed, ":now": nowISO },
  }));
  return { proposal: { ...proposal, status: "committed", committed }, committed };
}

export async function rejectProposal(deps, { proposalId, reason, nowISO }) {
  const { ddb, TABLE } = deps;
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: proposalPK(proposalId), SK: "META" },
      UpdateExpression: "SET #s = :r, reject_reason = :rr, updated_at = :now",
      ConditionExpression: "attribute_exists(PK) AND #s <> :committed",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":r": "rejected",
        ":rr": reason || null,
        ":now": nowISO,
        ":committed": "committed",
      },
    }));
  } catch (e) {
    if (e?.name === "ConditionalCheckFailedException") {
      const cur = await getProposal(deps, proposalId);
      if (!cur) throw Object.assign(new Error("Proposal not found"), { code: "NOT_FOUND" });
      throw Object.assign(new Error(`cannot reject ${cur.status} proposal`), { code: "BAD_REQUEST" });
    }
    throw e;
  }
  return getProposal(deps, proposalId);
}
