/* PatientListRow.jsx — single-line patient row for the global list.
   Same visual language as the duty board's PatientCard, but tap navigates
   instead of expanding. */

function PatientListRow({ patient, taskCounts, onOpen }) {
  const open = taskCounts?.open || 0;
  const overdue = taskCounts?.overdue || 0;
  const dotClass = overdue > 0 ? "late" : open > 0 ? "open" : "clear";

  const where =
    patient.bedNo && patient.ward ? `${patient.ward} ${patient.bedNo}` :
    patient.bedNo ? `Bed ${patient.bedNo}` :
    patient.ward ? patient.ward :
    patient.mrn || "";

  return (
    <button className="pcard pcard-row navigable" onClick={onOpen}>
      <span className={`pcard-dot ${dotClass}`}></span>
      <span className="pcard-name">{patient.name || patient.mrn || "?"}</span>
      <span className="pcard-where">{where}</span>
      {overdue > 0 && <span className="cnt-late mini">{overdue} late</span>}
      {open > 0 && <span className={`cnt-open mini ${overdue > 0 ? "" : "active"}`}>{open}</span>}
      <span className="pcard-chev">›</span>
    </button>
  );
}

window.PatientListRow = PatientListRow;
