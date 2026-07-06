// task_types.mjs — Task Type Registry (Node 22 ESM)
//
// Single source of truth for typed clinical tasks. Powers:
// - frontend dynamic forms
// - local AI understanding
// - proposal validation
// - default values
// - quick actions
// - required fields by action
// - alert rules
// - copy generation
//
// Spec: Docs/tasks/1draft/task_agent_first_backend_review_requirements_plan.md §7
// Scope: Phase 1 — see Docs/tasks/1draft/phase 1/ralph-loop.md

export const TASK_STATUSES = Object.freeze([
  "todo",
  "in_progress",
  "pending",
  "blocked",
  "done",
  "cancelled",
]);

export const TASK_PRIORITIES = Object.freeze([
  "routine",
  "important",
  "urgent",
  "critical",
]);

export const TASK_VERIFICATION_STATUSES = Object.freeze([
  "not_required",
  "needs_senior_review",
  "verified",
  "rejected",
]);

export const TASK_TYPES = Object.freeze([
  "investigation",
  "lab_followup",
  "report_followup",
  "photo_upload",
  "medication",
  "vitals",
  "clearance",
  "discharge",
  "consent",
  "blood_arrangement",
  "preop_checklist",
  "postop_review",
  "round_order",
  "generic",
]);

// Registry seed. Only `investigation` is fleshed out per §7.5 example.
// Other types start as minimal stubs — fill them in subsequent iterations as
// downstream modules (forms, proposals, copy) need them.
export const TASK_TYPE_DEFS = Object.freeze({
  lab_followup: {
    displayName: "Lab follow-up",
    createDefaults: {
      status: "todo",
      priority: "important",
      duePolicy: "24h",
    },
    updateFields: [
      { key: "lab_order_id", type: "string", label: "Lab OS order ID" },
      { key: "test_codes", type: "array", label: "Test codes" },
      { key: "summary", type: "string", label: "Result summary" },
    ],
  },
  investigation: {
    displayName: "Investigation",
    aliases: ["cbc", "hb", "tlc", "rft", "lft", "culture", "biopsy"],
    createDefaults: {
      status: "todo",
      priority: "important",
      duePolicy: "same_day",
      titleTemplate: "Send {subtypeLabel} and update report",
      requiresVerification: false,
      createsReportAwaited: true,
    },
    subtypes: {
      cbc: {
        label: "CBC",
        titleTemplate: "Send CBC and update report",
        defaultDueTime: "08:00",
        defaultPriority: "important",
      },
      biopsy: {
        label: "Biopsy report",
        titleTemplate: "Follow biopsy report",
        defaultDuePolicy: "next_working_day",
        defaultPriority: "important",
      },
    },
    updateFields: [
      { key: "sampleSent", type: "boolean", label: "Sample sent?" },
      { key: "sentTime", type: "datetime", label: "Sent time" },
      { key: "reportReceived", type: "boolean", label: "Report received?" },
      { key: "reportValue", type: "string", label: "Report value" },
      { key: "abnormal", type: "boolean", label: "Abnormal?" },
      { key: "nextFollowupAt", type: "datetime", label: "Next follow-up time" },
    ],
    quickActions: {
      sample_sent: {
        status: "pending",
        data: { sampleSent: true, sentTime: "$now", reportReceived: false },
      },
      report_received: {
        status: "done",
        requiredFields: ["reportReceived"],
      },
    },
  },

  report_followup: { displayName: "Report follow-up", createDefaults: { status: "todo", priority: "important" } },
  photo_upload: { displayName: "Photo upload", createDefaults: { status: "todo", priority: "important" } },
  medication: { displayName: "Medication", createDefaults: { status: "todo", priority: "important" } },
  vitals: { displayName: "Vitals", createDefaults: { status: "todo", priority: "important" } },
  clearance: { displayName: "Clearance", createDefaults: { status: "todo", priority: "important" } },
  discharge: { displayName: "Discharge", createDefaults: { status: "todo", priority: "important" } },
  consent: { displayName: "Consent", createDefaults: { status: "todo", priority: "important" } },
  blood_arrangement: { displayName: "Blood arrangement", createDefaults: { status: "todo", priority: "urgent" } },
  preop_checklist: { displayName: "Pre-op checklist", createDefaults: { status: "todo", priority: "important" } },
  postop_review: { displayName: "Post-op review", createDefaults: { status: "todo", priority: "important" } },
  round_order: { displayName: "Round order", createDefaults: { status: "todo", priority: "routine" } },
  generic: { displayName: "Generic", createDefaults: { status: "todo", priority: "routine" } },
});

// ---- validators ----------------------------------------------------------

const _statusSet = new Set(TASK_STATUSES);
const _prioritySet = new Set(TASK_PRIORITIES);
const _verifSet = new Set(TASK_VERIFICATION_STATUSES);
const _typeSet = new Set(TASK_TYPES);

export const isValidTaskType = (t) => _typeSet.has(t);
export const isValidTaskStatus = (s) => _statusSet.has(s);
export const isValidTaskPriority = (p) => _prioritySet.has(p);
export const isValidVerificationStatus = (v) => _verifSet.has(v);

export const getTypeDef = (type) => TASK_TYPE_DEFS[type] || null;

// ---- legacy bridge -------------------------------------------------------
// The existing tasks.mjs uses the old 5-type / 4-status vocabulary. Keep
// reads working while we migrate writes to the typed registry. Used by
// task_mapper.mjs (iter 2).

export const LEGACY_TYPE_MAP = Object.freeze({
  lab: "investigation",
  medication: "medication",
  procedure: "round_order",
  assessment: "vitals",
  discharge: "discharge",
});

export const LEGACY_STATUS_MAP = Object.freeze({
  open: "todo",
  "in-progress": "in_progress",
  done: "done",
  cancelled: "cancelled",
});

export const LEGACY_PRIORITY_MAP = Object.freeze({
  low: "routine",
  medium: "routine",
  high: "important",
  urgent: "urgent",
});

export const mapLegacyType = (t) => LEGACY_TYPE_MAP[t] || (isValidTaskType(t) ? t : "generic");
export const mapLegacyStatus = (s) => LEGACY_STATUS_MAP[s] || (isValidTaskStatus(s) ? s : "todo");
export const mapLegacyPriority = (p) => LEGACY_PRIORITY_MAP[p] || (isValidTaskPriority(p) ? p : "routine");
