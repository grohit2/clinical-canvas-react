/* PatientCard.jsx — ONE single-line row per patient when collapsed.
   Layout: dot · name · bed · spacer · late-chip? · open-count · chevron
   No Next/Last snippet at this level — that's noise when scaled. */

// Group expanded patient view by STATUS, not type. For a single patient
// with few tasks, type groups become 1-item sections — pure noise. Status
// groups answer "what's next?" → "not started", then "doing", then "waiting".
const STATUS_GROUPS = [
  { key: "blocked",     label: "Blocked",     statuses: ["blocked"] },
  { key: "todo",        label: "Not started", statuses: ["todo"] },
  { key: "in_progress", label: "In progress", statuses: ["in_progress"] },
  { key: "pending",     label: "Waiting",     statuses: ["pending"] },
];

function PatientCard({ patient, tasks, expanded, onToggle, onOpenTask }) {
  const open = tasks.filter(t => !["done","cancelled"].includes(t.status));
  const done = tasks.filter(t => t.status === "done");
  const overdueCount = open.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now()).length;
  const dotClass = overdueCount > 0 ? "late" : open.length > 0 ? "open" : "clear";

  // Group expanded tasks by status group
  const groups = STATUS_GROUPS.map(g => ({
    ...g,
    tasks: open
      .filter(t => g.statuses.includes(t.status))
      .sort((a, b) => window.urgencyScore(b) - window.urgencyScore(a)),
  })).filter(g => g.tasks.length > 0);

  // Bed/ward string (terse)
  const where =
    patient.bedNo && patient.ward ? `${patient.ward} ${patient.bedNo}` :
    patient.bedNo ? `Bed ${patient.bedNo}` :
    patient.ward ? patient.ward :
    patient.mrn || "";

  return (
    <div className={`pcard ${expanded ? "expanded" : ""}`}>
      <button className="pcard-row" onClick={onToggle}>
        <span className={`pcard-dot ${dotClass}`}></span>
        <span className="pcard-name">{patient.name || patient.mrn || "?"}</span>
        <span className="pcard-where">{where}</span>
        {overdueCount > 0 && <span className="cnt-late mini">{overdueCount} late</span>}
        <span className={`cnt-open mini ${overdueCount > 0 ? "" : open.length > 0 ? "active" : ""}`}>{open.length}</span>
        <span className="pcard-chev">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className="pcard-body">
          {groups.length === 0 && done.length === 0 && (
            <div className="pcard-empty">No open tasks.</div>
          )}
          {groups.map(g => (
            <React.Fragment key={g.key}>
              <div className={`group-header in-pcard bucket-${g.key}`}>
                <span className="dot"></span>
                <span className="label">{g.label}</span>
                <span className="cnt">{g.tasks.length}</span>
              </div>
              {g.tasks.map(t => (
                <TaskRow key={t.taskId} task={t} onOpen={() => onOpenTask(t)} showPatient={false} hideStatus={true} />
              ))}
            </React.Fragment>
          ))}
          {done.length > 0 && (
            <React.Fragment>
              <div className="group-header in-pcard bucket-done">
                <span className="dot"></span>
                <span className="label">Done today</span>
                <span className="cnt">{done.length}</span>
              </div>
              {done.map(t => (
                <TaskRow key={t.taskId} task={t} onOpen={() => onOpenTask(t)} showPatient={false} hideStatus={true} />
              ))}
            </React.Fragment>
          )}
        </div>
      )}
    </div>
  );
}

window.PatientCard = PatientCard;
