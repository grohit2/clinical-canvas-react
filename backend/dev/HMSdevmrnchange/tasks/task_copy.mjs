// task_copy.mjs — Backend-generated copy text (human + agent) (Node 22 ESM)
// Spec: §3.6 WhatsApp/human copy; §3.7 agent context copy; §8.2 copy APIs.

import { getTypeDef } from "./task_types.mjs";

function safe(v, fallback = "—") {
  return v === undefined || v === null || v === "" ? fallback : v;
}

// Human copy: WhatsApp-friendly, ASCII only, brief.
export function humanTaskCopy(task = {}) {
  const def = getTypeDef(task.type);
  const typeLabel = def?.displayName || task.type || "Task";
  const lines = [
    `*${typeLabel}* — ${safe(task.title)}`,
    `Patient: ${safe(task.mrn)} (Bed ${safe(task.bedNo, "?")} / ${safe(task.ward, "?")})`,
    `Status: ${safe(task.status)} | Priority: ${safe(task.priority)}`,
    task.dueAt ? `Due: ${task.dueAt}` : null,
    task.assigneeName ? `Assignee: ${task.assigneeName}` : null,
    task.latestUpdate?.human_summary ? `Last: ${task.latestUpdate.human_summary}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

// Agent copy: structured context block. Local AI consumes this without
// hitting the network — that is the §10 "call economy" goal.
export function agentTaskCopy(task = {}, { checkpoint = null } = {}) {
  return {
    kind: "HMS-CONTEXT v1",
    scope: "task",
    task: {
      task_id: task.taskId,
      version: task.version || 1,
      type: task.type,
      subtype: task.subtype,
      title: task.title,
      status: task.status,
      priority: task.priority,
      due_at: task.dueAt,
      assignee_id: task.assigneeId,
      assignee_name: task.assigneeName,
      doctor_id: task.doctorId,
      patient_uid: task.patientUid,
      mrn: task.mrn,
      bed_no: task.bedNo,
      ward: task.ward,
      latest_summary: task.latestUpdate?.human_summary || null,
      verify_status: task.verifyStatus,
      alert_level: task.alert?.level || "none",
    },
    schema_hints: getTypeDef(task.type)?.updateFields || [],
    quick_actions: getTypeDef(task.type)?.quickActions || {},
    checkpoint,
  };
}

// Patient-dashboard-level agent context. Builds from a list of typed tasks.
export function agentPatientContext({ patient, tasks = [], checkpoint = null }) {
  return {
    kind: "HMS-CONTEXT v1",
    scope: "patient_dashboard",
    patient: {
      patient_uid: patient?.uid,
      mrn: patient?.mrn,
      bed_no: patient?.bed_no,
      ward: patient?.ward,
      department: patient?.department,
    },
    tasks: tasks.map((t) => ({
      task_id: t.taskId,
      version: t.version,
      type: t.type,
      status: t.status,
      priority: t.priority,
      title: t.title,
      due_at: t.dueAt,
      assignee_id: t.assigneeId,
      latest_summary: t.latestUpdate?.human_summary || null,
    })),
    checkpoint,
  };
}
