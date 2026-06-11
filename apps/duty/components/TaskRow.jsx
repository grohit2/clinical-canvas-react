/* TaskRow.jsx — single-line task row, scorecard density.
   Layout: [TYPE] · title · who · STATUS · due
   No subtype tile, no version chip — title carries the meaning. */

const TYPE_ABBR = {
  investigation: "INV", report_followup: "RPT", photo_upload: "PHO",
  medication: "MED", vitals: "VIT", clearance: "CLR", discharge: "DCH",
  consent: "CSN", blood_arrangement: "BLD", preop_checklist: "PRE",
  postop_review: "POS", round_order: "RND", generic: "TSK",
};

// WhatsApp-style compact time. Past = "2h late", future = "5m" / "tmrw",
// completed/cancelled = absolute HH:MM.
function compactTime(t) {
  if (!t.dueAt && !t.updatedAt) return "—";
  if (t.status === "done" || t.status === "cancelled") {
    const ts = t.updatedAt || t.latestChangeAt || t.dueAt;
    if (!ts) return "—";
    const d = new Date(ts);
    const diff = Math.round((Date.now() - d.getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.round(diff/60)}h ago`;
    return d.toISOString().slice(5, 10);
  }
  if (!t.dueAt) return "no due";
  const due = new Date(t.dueAt).getTime();
  const diff = Math.round((due - Date.now()) / 60000);
  if (diff < 0) {
    const a = -diff;
    if (a < 60) return `${a}m late`;
    if (a < 1440) return `${Math.round(a/60)}h late`;
    return `${Math.round(a/1440)}d late`;
  }
  if (diff < 5) return "now";
  if (diff < 60) return `${diff}m`;
  if (diff < 240) return `${Math.round(diff/60)}h`;
  if (diff < 1440) return new Date(t.dueAt).toISOString().slice(11, 16);
  const days = Math.round(diff/1440);
  return days === 1 ? "tmrw" : `${days}d`;
}

const STATUS_SHORT = {
  todo: "todo",
  in_progress: "doing",
  pending: "wait",
  blocked: "blocked",
  done: "done",
  cancelled: "cancl",
};

function TaskRow({ task, onOpen, showPatient = true, hideStatus = false }) {
  const dueText = compactTime(task);
  const isLate = task.dueAt && task.status !== "done" && task.status !== "cancelled" && new Date(task.dueAt).getTime() < Date.now();
  const abbr = TYPE_ABBR[task.type] || "TSK";
  const patientLabel = task.patientName || task.mrn || null;
  const statusShort = STATUS_SHORT[task.status] || task.status;

  return (
    <button
      className={`t-row ${isLate ? "late" : ""} t-row-${task.type || "generic"} ${hideStatus ? "no-status" : ""}`}
      onClick={() => onOpen(task)}
    >
      <span className={`abbr ${task.priority ? `pri-${task.priority}` : ""}`}>{abbr}</span>
      <span className="title">{task.title}</span>
      {showPatient && patientLabel ? (
        <span className="who">{patientLabel}{task.bedNo ? ` · ${task.bedNo}` : ""}</span>
      ) : task.bedNo ? <span className="who">{task.bedNo}</span> : null}
      {!hideStatus && <span className={`status status-${task.status}`}>{statusShort}</span>}
      <span className={`due ${isLate ? "late" : ""}`}>{dueText}</span>
    </button>
  );
}

window.TaskRow = TaskRow;
