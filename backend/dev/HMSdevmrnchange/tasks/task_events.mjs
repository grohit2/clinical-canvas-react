// task_events.mjs — TASK_UPDATE append-only event records (Node 22 ESM)
// Spec: §6.2 task update item; §3.4 timeline integration.

import { taskPK, taskUpdateSK, newUpdateId, newEventId } from "./task_store.mjs";

// Build a row that lands in the existing patient timeline (PK=PATIENT#<uid>,
// SK=TL#...). The timeline endpoint already reads begins_with(SK,"TL#"),
// so adding TL#<ts>#TASK#<updateId> makes task events visible without
// touching timeline.mjs's read path.
export function buildTaskTimelineRow({ uid, task, update, nowISO }) {
  const sk = `TL#${update.changed_at || nowISO}#TASK#${update.update_id}`;
  return {
    PK: taskPK(uid),
    SK: sk,
    entity: "TIMELINE_TASK",
    timeline_id: `tl_${update.event_id}`,
    patient_uid: uid,
    mrn: task.mrn || null,

    // Existing mapper fields (kept nullable; not an episode transition)
    state: null,
    date_in: update.changed_at || nowISO,
    date_out: null,
    required_in: [],
    required_out: [],
    checklist_in_done: [],
    checklist_out_done: [],
    actor_id: update.actor_id || null,

    // Task-specific fields (surfaced via timeline mapper extension)
    task_id: task.task_id,
    task_title: task.title,
    task_type: task.type,
    task_status_after: update.status_after || task.status,
    task_change_type: update.change_type,
    task_summary: update.human_summary || null,
    task_update_id: update.update_id,

    notes: update.human_summary || null,
    created_at: update.changed_at || nowISO,
    updated_at: update.changed_at || nowISO,
  };
}

export function buildTaskUpdate({
  uid, taskId, changeType, statusAfter,
  structured = null, humanSummary = null, originalText = null,
  files = [], actor = {}, proposal = null, nowISO,
}) {
  const updateId = newUpdateId();
  const eventId = newEventId();
  const changedAt = nowISO;
  return {
    PK: taskPK(uid),
    SK: taskUpdateSK(taskId, changedAt, updateId),

    entity: "TASK_UPDATE",
    update_id: updateId,
    event_id: eventId,
    task_id: taskId,
    patient_uid: uid,

    change_type: changeType,
    status_after: statusAfter || null,

    structured_data: structured,
    human_summary: humanSummary,
    original_text: originalText,

    files: Array.isArray(files) ? files : [],

    actor_id: actor.user_id || actor.id || null,
    actor_name: actor.name || null,
    actor_role: actor.role || null,

    proposal: proposal || null,

    changed_at: changedAt,
    created_at: changedAt,
  };
}
