// task_mapper.mjs — DB row <-> typed UI shape (Node 22 ESM)
// Spec: §6.1 task item; §1.4 legacy bridge.

import {
  mapLegacyType,
  mapLegacyStatus,
  mapLegacyPriority,
  isValidTaskType,
  isValidTaskStatus,
  isValidTaskPriority,
} from "./task_types.mjs";

// Read-side: legacy or typed DB row -> typed UI shape (§6.1)
export function toTypedTask(row = {}) {
  if (!row || !row.task_id) return null;
  const isLegacy = !row.entity || row.entity !== "TASK";
  const type = isValidTaskType(row.type) ? row.type : mapLegacyType(row.type);
  const status = isValidTaskStatus(row.status) ? row.status : mapLegacyStatus(row.status);
  const priority = isValidTaskPriority(row.priority) ? row.priority : mapLegacyPriority(row.priority);

  return {
    taskId: row.task_id,
    patientUid: row.patient_uid || row.patient_id || null,
    mrn: row.mrn || (isLegacy ? row.patient_id : null) || null,
    scheme: row.scheme || null,
    bedNo: row.bed_no || null,
    ward: row.ward || null,

    title: row.title || "",
    type,
    subtype: row.subtype || null,

    status,
    priority,

    assigneeId: row.assignee_id || null,
    assigneeName: row.assignee_name || null,
    assigneeRole: row.assignee_role || null,
    assignedById: row.assigned_by_id || null,
    assignedByName: row.assigned_by_name || null,
    doctorId: row.doctor_id || null,
    consultantId: row.consultant_id || null,
    consultantName: row.consultant_name || null,

    dueAt: row.due_at || row.due || null,
    dueDate: row.due_date || null,

    source: row.source || null,
    clinicalData: row.clinical_data || row.details || null,
    blocker: row.blocker || null,
    alert: row.alert || { level: "none", reason: null, acknowledgedBy: null, acknowledgedAt: null },

    requiresVerification: !!row.requires_verification,
    verifyStatus: row.verify_status || "not_required",

    latestUpdate: row.latest_update || null,
    files: Array.isArray(row.files) ? row.files : [],

    version: typeof row.version === "number" ? row.version : 1,
    latestChangeAt: row.latest_change_at || row.updated_at || null,
    latestChangeId: row.latest_change_id || null,
    latestCursor: row.latest_cursor || null,

    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,

    _legacy: isLegacy || undefined,
  };
}

// Write-side: typed input -> DB row (§6.1). Caller sets PK/SK/GSI keys.
export function fromTypedTaskInput(input = {}, { taskId, nowISO, patientUid, mrn }) {
  const type = isValidTaskType(input.type) ? input.type : mapLegacyType(input.type);
  const status = isValidTaskStatus(input.status) ? input.status : mapLegacyStatus(input.status || "todo");
  const priority = isValidTaskPriority(input.priority) ? input.priority : mapLegacyPriority(input.priority || "routine");

  return {
    entity: "TASK",
    task_id: taskId,
    patient_uid: patientUid,
    mrn: mrn || null,
    scheme: input.scheme || null,
    bed_no: input.bedNo || null,
    ward: input.ward || null,

    title: input.title || "",
    type,
    subtype: input.subtype || null,

    status,
    priority,

    assignee_id: input.assigneeId || null,
    assignee_name: input.assigneeName || null,
    assignee_role: input.assigneeRole || null,
    assigned_by_id: input.assignedById || null,
    assigned_by_name: input.assignedByName || null,
    doctor_id: input.doctorId || null,
    consultant_id: input.consultantId || null,
    consultant_name: input.consultantName || null,

    due_at: input.dueAt || input.due || null,
    due_date: input.dueDate || null,

    source: input.source || { kind: "ui", original_text: null },

    clinical_data: input.clinicalData || null,
    blocker: null,
    alert: { level: "none", reason: null, acknowledged_by: null, acknowledged_at: null },

    requires_verification: !!input.requiresVerification,
    verify_status: input.requiresVerification ? "needs_senior_review" : "not_required",

    latest_update: null,
    files: [],

    version: 1,
    latest_change_at: nowISO,
    latest_change_id: null,
    latest_cursor: null,

    created_at: nowISO,
    updated_at: nowISO,
  };
}

// Compute GSI2 keys for duty/dept dashboard queries (§6.1 GSI2)
export function taskGSI2({ status, department, assigneeId, dueAt, taskId }) {
  return {
    GSI2PK: `TASK#${String(status || "todo").toUpperCase()}#DEPT#${department || "_"}`,
    GSI2SK: `ASSIGNEE#${assigneeId || "_"}#DUE#${dueAt || "_"}#TASK#${taskId}`,
  };
}
