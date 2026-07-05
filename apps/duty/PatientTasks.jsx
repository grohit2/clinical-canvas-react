/* PatientTasks.jsx — full-screen single-patient view, four tabs:
   - Tasks:   status-grouped task list (the existing view)
   - Rounds:  round-presentation layout — what you'd say at the bedside
   - Vitals:  chronological vitals readings, grouped by day
   - Handoff: I-PASS-style shift change brief, copyable for WhatsApp */

const PT_STATUS_GROUPS = [
  { key: "blocked",     label: "Blocked",     statuses: ["blocked"] },
  { key: "todo",        label: "Not started", statuses: ["todo"] },
  { key: "in_progress", label: "In progress", statuses: ["in_progress"] },
  { key: "pending",     label: "Waiting",     statuses: ["pending"] },
];

function daysIn(patient) {
  // Use mrnHistory[0].date as a proxy for admission timestamp if no explicit one.
  const seedStr = patient?.admissionDate || patient?.mrnHistory?.[0]?.date;
  if (!seedStr) return null;
  const seed = new Date(seedStr).getTime();
  if (Number.isNaN(seed)) return null;
  const days = Math.floor((Date.now() - seed) / 86400000);
  return days < 0 ? 0 : days;
}

function buildRoundSummary({ patient, tasks }) {
  if (!patient) return "";
  const open = tasks.filter(t => !["done","cancelled"].includes(t.status));
  const investigations = open.filter(t => t.type === "investigation" || t.type === "report_followup").length;
  const meds = open.filter(t => t.type === "medication").length;
  const overdue = open.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now()).length;
  const d = daysIn(patient);
  const ageSex = [patient.age, patient.sex?.[0]?.toUpperCase()].filter(Boolean).join("");
  const bed = patient.roomNumber ? `Bed ${patient.roomNumber}` : "";
  const parts = [];
  parts.push(`${patient.name || patient.mrn}${ageSex ? `, ${ageSex}` : ""}${bed ? `, ${bed}` : ""}.`);
  if (patient.surgeryDate || d != null) {
    const podPart = patient.surgeryDate ? `POD ${Math.max(0, Math.floor((Date.now() - new Date(patient.surgeryDate).getTime())/86400000))}` : `Day ${d}`;
    const proc = patient.procedureName ? ` post ${patient.procedureName}` : "";
    parts.push(`${podPart}${proc}.`);
  } else if (patient.diagnosis) {
    parts.push(`Dx: ${patient.diagnosis}.`);
  }
  if (patient.currentState) parts.push(`Currently ${String(patient.currentState).toLowerCase()}.`);
  const queueBits = [];
  if (overdue > 0) queueBits.push(`${overdue} overdue`);
  if (investigations > 0) queueBits.push(`${investigations} investigation${investigations>1?"s":""}`);
  if (meds > 0) queueBits.push(`${meds} med${meds>1?"s":""} pending`);
  if (queueBits.length) parts.push(`${queueBits.join(", ")}.`);
  const allergies = patient.allergies?.length ? patient.allergies.join(", ") : null;
  if (allergies) parts.push(`Allergies: ${allergies}.`);
  return parts.join(" ");
}

/* ---------- ROUNDS TAB ---------- */
function RoundsView({ patient, tasks }) {
  const open = tasks.filter(t => !["done","cancelled"].includes(t.status));
  const labs = open.filter(t => t.type === "investigation" || t.type === "report_followup");
  const meds = open.filter(t => t.type === "medication");
  const photos = open.filter(t => t.type === "photo_upload");
  const consents = open.filter(t => t.type === "consent");
  const otherPending = open.filter(t => !["investigation","report_followup","medication","photo_upload","consent"].includes(t.type));

  // "Recent activity" = sort tasks by latestChangeAt desc, take top 5
  const recent = [...tasks]
    .filter(t => t.latestChangeAt)
    .sort((a, b) => (b.latestChangeAt || "").localeCompare(a.latestChangeAt || ""))
    .slice(0, 5);

  const allergies = Array.isArray(patient?.allergies) ? patient.allergies.filter(Boolean) : [];
  const comorbids = Array.isArray(patient?.comorbidities) ? patient.comorbidities.filter(Boolean) : [];
  const summary = buildRoundSummary({ patient, tasks });

  function fmtRel(ts) {
    if (!ts) return "";
    const diff = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.round(diff/60)}h ago`;
    return new Date(ts).toISOString().slice(5,10);
  }

  return (
    <React.Fragment>
      {/* Round summary — copyable */}
      <div className="round-block">
        <div className="round-block-head">
          <span>Round summary</span>
          <CopyButton label="copy" text={summary} confirmMsg="Summary copied" />
        </div>
        <div className="round-summary">{summary || "Not enough data to summarise."}</div>
      </div>

      {/* Active issues */}
      {(patient?.diagnosis || comorbids.length > 0 || allergies.length > 0) && (
        <div className="round-block">
          <div className="round-block-head"><span>Active issues</span></div>
          {patient?.diagnosis && (
            <div className="round-kv">
              <span className="k">Dx</span>
              <span className="v">{patient.diagnosis}</span>
            </div>
          )}
          {patient?.procedureName && (
            <div className="round-kv">
              <span className="k">Procedure</span>
              <span className="v">{patient.procedureName}{patient.surgeryDate ? ` · ${patient.surgeryDate}` : ""}</span>
            </div>
          )}
          {comorbids.length > 0 && (
            <div className="round-kv">
              <span className="k">Hx</span>
              <span className="v">{comorbids.join(", ")}</span>
            </div>
          )}
          {allergies.length > 0 && (
            <div className="round-kv alert">
              <span className="k">⚠ Allergies</span>
              <span className="v">{allergies.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      {/* Care team */}
      <div className="round-block">
        <div className="round-block-head"><span>Care team</span></div>
        {patient?.assignedDoctor || patient?.consultantId ? (
          <React.Fragment>
            {patient?.assignedDoctor && (
              <div className="round-kv"><span className="k">Attending</span><span className="v">{patient.assignedDoctor}</span></div>
            )}
            {patient?.consultantId && patient.consultantId !== patient?.assignedDoctorId && (
              <div className="round-kv"><span className="k">Consultant</span><span className="v">{patient.consultantId}</span></div>
            )}
          </React.Fragment>
        ) : (
          <div className="round-kv muted"><span className="k">—</span><span className="v">Not assigned</span></div>
        )}
      </div>

      {/* Pending orders by category */}
      {(labs.length + meds.length + photos.length + consents.length + otherPending.length) > 0 && (
        <div className="round-block">
          <div className="round-block-head"><span>Pending</span></div>
          {labs.length > 0 && (
            <RoundCat label="Investigations" items={labs} />
          )}
          {meds.length > 0 && (
            <RoundCat label="Medications" items={meds} />
          )}
          {photos.length > 0 && (
            <RoundCat label="Photos" items={photos} />
          )}
          {consents.length > 0 && (
            <RoundCat label="Consents" items={consents} />
          )}
          {otherPending.length > 0 && (
            <RoundCat label="Other" items={otherPending} />
          )}
        </div>
      )}

      {/* Recent activity */}
      {recent.length > 0 && (
        <div className="round-block">
          <div className="round-block-head"><span>Recent activity</span></div>
          {recent.map(t => (
            <div className="round-activity" key={t.taskId}>
              <span className="ra-ts">{fmtRel(t.latestChangeAt)}</span>
              <span className="ra-text">{t.latestUpdate?.human_summary || t.title}</span>
            </div>
          ))}
        </div>
      )}
    </React.Fragment>
  );
}

/* Single-line entry under a category header in Rounds view */
function RoundCat({ label, items }) {
  return (
    <React.Fragment>
      <div className="round-cat-head">{label} <span className="cnt">{items.length}</span></div>
      {items.slice(0, 8).map(t => {
        const isLate = t.dueAt && new Date(t.dueAt).getTime() < Date.now();
        const due = !t.dueAt ? "—" :
          isLate ? `${Math.round((Date.now() - new Date(t.dueAt).getTime())/3600000)}h late` :
          new Date(t.dueAt).toISOString().slice(11,16);
        return (
          <div className="round-cat-row" key={t.taskId}>
            <span className="rc-title">{t.title}</span>
            <span className={`rc-due ${isLate ? "late" : ""}`}>{due}</span>
          </div>
        );
      })}
      {items.length > 8 && (
        <div className="round-cat-more">+ {items.length - 8} more</div>
      )}
    </React.Fragment>
  );
}

/* ---------- TASKS TAB (existing layout) ---------- */
function TasksView({ patient, tasks, onOpenTask, where }) {
  const open = tasks.filter(t => !["done","cancelled"].includes(t.status));
  const done = tasks.filter(t => t.status === "done");
  const [showDone, setShowDone] = React.useState(false);

  const groups = PT_STATUS_GROUPS.map(g => ({
    ...g,
    tasks: open
      .filter(t => g.statuses.includes(t.status))
      .sort((a, b) => (window.urgencyScore ? window.urgencyScore(b) - window.urgencyScore(a) : 0)),
  })).filter(g => g.tasks.length > 0);

  return (
    <React.Fragment>
      <div className="copy-bar dense">
        <CopyButton label="Patient ctx" getText={async () => {
          const ctx = await window.api.patientContext(patient?.id || patient?.patientId);
          return JSON.stringify(ctx, null, 2);
        }} confirmMsg="Patient context copied" />
        <CopyButton label="Task list" getText={async () => {
          const lines = [`*${patient?.name || patient?.id}* — ${patient?.mrn || ""}${where ? ` · ${where}` : ""}`, ""];
          for (const g of groups) {
            lines.push(`_${g.label.toUpperCase()}_ (${g.tasks.length})`);
            for (const t of g.tasks) {
              const due = t.dueAt ? new Date(t.dueAt).toISOString().slice(11,16) : "—";
              lines.push(`• ${t.title} · ${due}`);
            }
            lines.push("");
          }
          return lines.join("\n").trim();
        }} />
        {patient?.mrn && <CopyButton label="MRN" text={patient.mrn} />}
      </div>

      {groups.length === 0 && done.length === 0 && (
        <EmptyState title="No tasks for this patient" body="All caught up." />
      )}

      {groups.map(g => (
        <React.Fragment key={g.key}>
          <div className={`group-header bucket-${g.key}`}>
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
          <div className="group-header bucket-done clickable" onClick={() => setShowDone(v => !v)}>
            <span className="dot"></span>
            <span className="label">Done today</span>
            <span className="cnt">{done.length} {showDone ? "▾" : "▸"}</span>
          </div>
          {showDone && done.map(t => (
            <TaskRow key={t.taskId} task={t} onOpen={() => onOpenTask(t)} showPatient={false} hideStatus={true} />
          ))}
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

/* ---------- MAIN ---------- */
/* VitalsView — chronological vitals readings grouped by day.
   Each reading is one row: time + the standard panel (BP/HR/SpO₂/T°/GRBS).
   Trend arrow against the next-older reading on the same metric. */

function dayLabel(iso) {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "—";
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yest)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function clock(iso) {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function trend(cur, prev) {
  if (cur == null || prev == null) return null;
  if (cur > prev) return "↑";
  if (cur < prev) return "↓";
  return "·";
}

function VitalChip({ label, value, unit, trendGlyph }) {
  if (value == null || value === "") return null;
  return (
    <span className="vchip">
      <span className="vchip-lbl">{label}</span>
      <span className="vchip-val">{value}{unit ? <span className="vchip-unit">{unit}</span> : null}</span>
      {trendGlyph && <span className={`vchip-trend t-${trendGlyph === "↑" ? "up" : trendGlyph === "↓" ? "down" : "flat"}`}>{trendGlyph}</span>}
    </span>
  );
}

function VitalsRow({ v, prev }) {
  const bp = (v.bp_systolic != null && v.bp_diastolic != null)
    ? `${v.bp_systolic}/${v.bp_diastolic}` : null;
  const stale = v.recorded_at && (Date.now() - new Date(v.recorded_at).getTime()) > 6 * 3600 * 1000;
  return (
    <div className={`vrow ${stale ? "stale" : ""}`}>
      <span className="vrow-time">{clock(v.recorded_at)}</span>
      <span className="vrow-chips">
        <VitalChip label="BP"   value={bp}        unit=""   trendGlyph={trend(v.bp_systolic, prev?.bp_systolic)} />
        <VitalChip label="HR"   value={v.hr}      unit=""   trendGlyph={trend(v.hr, prev?.hr)} />
        <VitalChip label="SpO₂" value={v.spo2}    unit="%"  trendGlyph={trend(v.spo2, prev?.spo2)} />
        <VitalChip label="T"    value={v.temp_c}  unit="°"  trendGlyph={trend(v.temp_c, prev?.temp_c)} />
        <VitalChip label="G"    value={v.grbs}    unit=""   trendGlyph={trend(v.grbs, prev?.grbs)} />
        <VitalChip label="RR"   value={v.rr}      unit=""   trendGlyph={trend(v.rr, prev?.rr)} />
      </span>
      {(v.recorded_by_name || v.source_task_id) && (
        <span className="vrow-by">
          {v.recorded_by_name || ""}
          {v.source_task_id ? " · ↻" : ""}
        </span>
      )}
      {v.notes && <span className="vrow-notes">"{v.notes}"</span>}
    </div>
  );
}

function VitalsView({ vitals }) {
  if (!vitals) return <div className="loader">Loading vitals…</div>;
  if (vitals.length === 0) {
    return <EmptyState title="No vitals recorded" body="Once readings come in, they'll show up here grouped by day." />;
  }
  // Sort newest first; prev for each row is the next-older one (regardless of day).
  const sorted = [...vitals].sort((a, b) =>
    new Date(b.recorded_at || 0) - new Date(a.recorded_at || 0));

  // Group rows by day label, preserving sorted order.
  const groups = [];
  let current = null;
  sorted.forEach((v, i) => {
    const label = dayLabel(v.recorded_at);
    if (!current || current.label !== label) {
      current = { label, items: [] };
      groups.push(current);
    }
    current.items.push({ v, prev: sorted[i + 1] || null });
  });

  return (
    <div className="vitals-view">
      {groups.map(g => (
        <div className="vgroup" key={g.label}>
          <div className="vgroup-head">{g.label} <span className="vgroup-count">{g.items.length}</span></div>
          {g.items.map(({ v, prev }) => (
            <VitalsRow key={v.vitals_id || v.recorded_at} v={v} prev={prev} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- HANDOFF TAB ---------- */
// Illness severity heuristic, derived from open tasks + most recent vitals.
function illnessSeverity({ tasks, vitals }) {
  const open = tasks.filter(t => !["done","cancelled"].includes(t.status));
  const late = open.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now());
  const blocked = open.filter(t => t.status === "blocked");
  const critical = open.filter(t => (t.priority || "").toLowerCase() === "critical");
  const v = vitals?.[0];
  const vitalsBad = v && (
    (v.bp_systolic != null && (v.bp_systolic >= 160 || v.bp_systolic <= 90)) ||
    (v.hr != null && (v.hr >= 120 || v.hr <= 50)) ||
    (v.spo2 != null && v.spo2 < 92) ||
    (v.temp_c != null && (v.temp_c >= 38.5 || v.temp_c <= 35.5))
  );
  if (vitalsBad || critical.length > 0 || blocked.length > 0) return "unstable";
  if (late.length > 0) return "watcher";
  return "stable";
}

function buildHandoffText({ patient, tasks, vitals, severity }) {
  if (!patient) return "";
  const open = tasks.filter(t => !["done","cancelled"].includes(t.status));
  const late = open.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now());
  const allergies = patient.allergies?.filter(Boolean) || [];
  const d = daysIn(patient);
  const ageSex = [patient.age, patient.sex?.[0]?.toUpperCase()].filter(Boolean).join("");
  const bed = patient.roomNumber || patient.bedNo;
  const head = `*${patient.name || patient.mrn || "Patient"}*${ageSex ? `, ${ageSex}` : ""}${bed ? `, Bed ${bed}` : ""}`;
  const sev = severity === "unstable" ? "⚠ UNSTABLE" : severity === "watcher" ? "👀 WATCHER" : "✓ Stable";

  const podLine = patient.surgeryDate
    ? `POD ${Math.max(0, Math.floor((Date.now() - new Date(patient.surgeryDate).getTime())/86400000))}${patient.procedureName ? ` post ${patient.procedureName}` : ""}`
    : (d != null ? `Day ${d}${patient.diagnosis ? ` · ${patient.diagnosis}` : ""}` : (patient.diagnosis || ""));

  const v = vitals?.[0];
  const vline = v ? [
    v.bp_systolic != null && v.bp_diastolic != null ? `BP ${v.bp_systolic}/${v.bp_diastolic}` : null,
    v.hr != null ? `HR ${v.hr}` : null,
    v.spo2 != null ? `SpO2 ${v.spo2}%` : null,
    v.temp_c != null ? `T ${v.temp_c}°` : null,
    v.grbs != null ? `G ${v.grbs}` : null,
  ].filter(Boolean).join("  ") : null;

  const actions = open
    .sort((a, b) => (window.urgencyScore ? window.urgencyScore(b) - window.urgencyScore(a) : 0))
    .slice(0, 8)
    .map(t => {
      const due = !t.dueAt ? "" :
        new Date(t.dueAt).getTime() < Date.now() ? " (late)" :
        ` @ ${new Date(t.dueAt).toISOString().slice(11,16)}`;
      return `• ${t.title}${due}`;
    });

  const lines = [];
  lines.push(`${head}`);
  lines.push(`[I] ${sev}`);
  if (podLine) lines.push(`[P] ${podLine}`);
  if (vline) lines.push(`     ${vline}`);
  if (actions.length) {
    lines.push("[A] Action list:");
    lines.push(...actions);
  }
  const watchers = [];
  if (late.length > 0) watchers.push(`${late.length} task${late.length>1?"s":""} overdue`);
  if (allergies.length > 0) watchers.push(`Allergies: ${allergies.join(", ")}`);
  if (patient.comorbidities?.length) watchers.push(`Hx: ${patient.comorbidities.join(", ")}`);
  if (watchers.length) lines.push(`[S] Watch for: ${watchers.join("; ")}`);
  lines.push("[S] Synthesis: please confirm receipt.");
  return lines.join("\n");
}

/* ---------- AI CONTEXT BUILDER ---------- */
function buildAIContext(patient, tasks, vitals) {
  if (!patient) return "";
  const lines = [];

  const ageSex = [patient.age, patient.sex?.[0]?.toUpperCase()].filter(Boolean).join("");
  const bed = patient.roomNumber || patient.bedNo;
  lines.push(`## Patient: ${patient.name || "Unknown"}`);

  const idParts = [];
  if (patient.uid || patient.id) idParts.push(`UID: ${patient.uid || patient.id}`);
  if (patient.mrn) idParts.push(`MRN: ${patient.mrn}`);
  if (idParts.length) lines.push(idParts.join(" | "));

  const demoParts = [];
  if (ageSex) demoParts.push(ageSex);
  if (bed) demoParts.push(`Bed ${bed}`);
  if (patient.department) demoParts.push(patient.department);
  if (demoParts.length) lines.push(demoParts.join(" · "));

  const d = daysIn(patient);
  if (patient.surgeryDate && patient.procedureName) {
    const pod = Math.max(0, Math.floor((Date.now() - new Date(patient.surgeryDate).getTime()) / 86400000));
    lines.push(`POD ${pod} — ${patient.procedureName}`);
  } else if (patient.diagnosis) {
    lines.push(`Dx: ${patient.diagnosis}${d != null ? ` (Day ${d})` : ""}`);
  } else if (d != null) {
    lines.push(`Admission day ${d}`);
  }
  if (patient.currentState) lines.push(`State: ${String(patient.currentState).toUpperCase()}`);
  if (patient.comorbidities?.filter(Boolean).length)
    lines.push(`Comorbidities: ${patient.comorbidities.filter(Boolean).join(", ")}`);
  if (patient.allergies?.filter(Boolean).length)
    lines.push(`⚠ Allergies: ${patient.allergies.filter(Boolean).join(", ")}`);
  if (patient.assignedDoctor) lines.push(`Attending: ${patient.assignedDoctor}`);

  const lv = Array.isArray(vitals) && vitals.length > 0
    ? [...vitals].sort((a, b) => new Date(b.recorded_at || 0) - new Date(a.recorded_at || 0))[0]
    : null;
  if (lv) {
    const vParts = [];
    if (lv.bp_systolic != null && lv.bp_diastolic != null) vParts.push(`BP ${lv.bp_systolic}/${lv.bp_diastolic}`);
    if (lv.hr != null) vParts.push(`HR ${lv.hr}`);
    if (lv.spo2 != null) vParts.push(`SpO₂ ${lv.spo2}%`);
    if (lv.temp_c != null) vParts.push(`T ${lv.temp_c}°C`);
    if (lv.grbs != null) vParts.push(`GRBS ${lv.grbs}`);
    if (lv.rr != null) vParts.push(`RR ${lv.rr}`);
    if (lv.urine_output_ml != null) vParts.push(`UO ${lv.urine_output_ml}ml`);
    const ts = lv.recorded_at
      ? new Date(lv.recorded_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
      : "";
    lines.push("");
    lines.push(`## Vitals${ts ? ` (${ts})` : ""}`);
    lines.push(vParts.join(" · ") || "—");
  }

  const open = (tasks || []).filter(t => !["done", "cancelled"].includes(t.status));
  const done = (tasks || []).filter(t => t.status === "done");

  if (open.length > 0) {
    const lateCount = open.filter(t => {
      const due = t.dueAt || t.due_at;
      return due && new Date(due).getTime() < Date.now();
    }).length;
    lines.push("");
    lines.push(`## Open Tasks (${open.length}${lateCount > 0 ? `, ${lateCount} late` : ""})`);
    const priority = { blocked: 0, in_progress: 1, todo: 2, pending: 3 };
    const sorted = [...open].sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9));
    for (const t of sorted) {
      const label = { blocked: "BLOCKED", in_progress: "IN PROG", todo: "TODO", pending: "WAITING" }[t.status] || t.status.toUpperCase();
      const dueField = t.dueAt || t.due_at;
      const dueStr = dueField
        ? new Date(dueField).getTime() < Date.now()
          ? ` [LATE ${Math.round((Date.now() - new Date(dueField).getTime()) / 3600000)}h]`
          : ` @ ${new Date(dueField).toISOString().slice(11, 16)}`
        : "";
      const typeStr = t.type ? ` (${t.type})` : "";
      lines.push(`[${label}] ${t.title}${typeStr}${dueStr}`);
    }
  }

  if (done.length > 0) {
    lines.push("");
    lines.push(`## Done (${done.length})`);
    for (const t of done.slice(0, 5)) lines.push(`✓ ${t.title}`);
    if (done.length > 5) lines.push(`  … +${done.length - 5} more`);
  }

  return lines.join("\n");
}

window.buildAIContext = buildAIContext;

function HandoffView({ patient, tasks, vitals }) {
  if (!patient) return <div className="loader">Loading handoff…</div>;
  const severity = illnessSeverity({ tasks: tasks || [], vitals: vitals || [] });
  const text = buildHandoffText({ patient, tasks: tasks || [], vitals: vitals || [], severity });
  const open = (tasks || []).filter(t => !["done","cancelled"].includes(t.status));
  const late = open.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now());
  const blocked = open.filter(t => t.status === "blocked");
  const sortedOpen = [...open].sort(
    (a, b) => (window.urgencyScore ? window.urgencyScore(b) - window.urgencyScore(a) : 0)
  );
  const v = vitals?.[0];

  return (
    <React.Fragment>
      <div className="round-block">
        <div className="round-block-head">
          <span>Handoff brief (I-PASS)</span>
          <CopyButton label="copy" text={text} confirmMsg="Handoff copied" />
        </div>
        <div className={`handoff-severity sev-${severity}`}>
          <span className="ho-sev-dot"></span>
          <span className="ho-sev-label">
            {severity === "unstable" ? "Unstable" : severity === "watcher" ? "Watcher" : "Stable"}
          </span>
          <span className="ho-sev-why">
            {severity === "unstable" && "vitals or critical task flagged"}
            {severity === "watcher" && `${late.length} overdue`}
            {severity === "stable" && "no overdue items"}
          </span>
        </div>
        <div className="round-summary">{text}</div>
      </div>

      <div className="round-block">
        <div className="round-block-head"><span>[P] Patient summary</span></div>
        <div className="round-kv">
          <span className="k">Pt</span>
          <span className="v">{patient.name || patient.mrn || "?"}{patient.age ? `, ${patient.age}${patient.sex?.[0]?.toUpperCase() || ""}` : ""}</span>
        </div>
        {patient.diagnosis && (
          <div className="round-kv"><span className="k">Dx</span><span className="v">{patient.diagnosis}</span></div>
        )}
        {patient.procedureName && (
          <div className="round-kv"><span className="k">Proc</span><span className="v">{patient.procedureName}{patient.surgeryDate ? ` · ${patient.surgeryDate}` : ""}</span></div>
        )}
        {patient.currentState && (
          <div className="round-kv"><span className="k">State</span><span className="v">{String(patient.currentState).toUpperCase()}</span></div>
        )}
        {v && (
          <div className="round-kv">
            <span className="k">Last vitals</span>
            <span className="v" style={{fontFamily:'JetBrains Mono, monospace'}}>
              {v.bp_systolic != null && v.bp_diastolic != null ? `BP ${v.bp_systolic}/${v.bp_diastolic}  ` : ""}
              {v.hr != null ? `HR ${v.hr}  ` : ""}
              {v.spo2 != null ? `SpO₂ ${v.spo2}%  ` : ""}
              {v.temp_c != null ? `T ${v.temp_c}°` : ""}
            </span>
          </div>
        )}
      </div>

      <div className="round-block">
        <div className="round-block-head">
          <span>[A] Action list</span>
          <span className="ho-count">{sortedOpen.length}</span>
        </div>
        {sortedOpen.length === 0 && <div className="round-kv muted"><span className="k">—</span><span className="v">No open actions</span></div>}
        {sortedOpen.slice(0, 12).map(t => {
          const isLate = t.dueAt && new Date(t.dueAt).getTime() < Date.now();
          const due = !t.dueAt ? "—" :
            isLate ? `${Math.round((Date.now() - new Date(t.dueAt).getTime())/3600000)}h late` :
            new Date(t.dueAt).toISOString().slice(11,16);
          return (
            <div className="round-cat-row" key={t.taskId}>
              <span className="rc-title">{t.title}</span>
              <span className={`rc-due ${isLate ? "late" : ""}`}>{due}</span>
            </div>
          );
        })}
        {sortedOpen.length > 12 && <div className="round-cat-more">+ {sortedOpen.length - 12} more</div>}
      </div>

      {(blocked.length > 0 || patient.allergies?.length || patient.comorbidities?.length) && (
        <div className="round-block">
          <div className="round-block-head"><span>[S] Situation awareness</span></div>
          {patient.allergies?.length > 0 && (
            <div className="round-kv alert">
              <span className="k">⚠ Allergies</span>
              <span className="v">{patient.allergies.filter(Boolean).join(", ")}</span>
            </div>
          )}
          {patient.comorbidities?.length > 0 && (
            <div className="round-kv"><span className="k">Hx</span><span className="v">{patient.comorbidities.join(", ")}</span></div>
          )}
          {blocked.length > 0 && (
            <React.Fragment>
              <div className="round-cat-head">Blocked tasks <span className="cnt">{blocked.length}</span></div>
              {blocked.map(t => (
                <div className="round-cat-row" key={t.taskId}>
                  <span className="rc-title">{t.title}</span>
                  <span className="rc-due late">{t.blocker?.reason || "blocked"}</span>
                </div>
              ))}
            </React.Fragment>
          )}
        </div>
      )}
    </React.Fragment>
  );
}

function PatientTasks({ patientId, onBack, onOpenTask }) {
  const [tab, setTab] = React.useState(() => localStorage.getItem("patient.tab") || "tasks");
  const [tasks, setTasks] = React.useState(null);
  const [vitals, setVitals] = React.useState(null);
  const [patient, setPatient] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => { localStorage.setItem("patient.tab", tab); }, [tab]);

  async function refresh() {
    setError(null);
    try {
      const [list, p, v] = await Promise.all([
        window.api.listPatientTasks(patientId),
        window.api.getPatient(patientId).catch(() => null),
        window.api.listVitals(patientId, 100).catch(() => ({ items: [] })),
      ]);
      setTasks(Array.isArray(list) ? list : []);
      setPatient(p || null);
      setVitals(Array.isArray(v) ? v : (v?.items || []));
    } catch (e) {
      setError(e.message || String(e));
    }
  }
  React.useEffect(() => { refresh(); }, [patientId]);

  const allTasks = tasks || [];
  const open = allTasks.filter(t => !["done","cancelled"].includes(t.status));
  const done = allTasks.filter(t => t.status === "done");
  const overdueCount = open.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now()).length;

  const where =
    patient?.roomNumber ? `Bed ${patient.roomNumber}` :
    patient?.bedNo ? `Bed ${patient.bedNo}` :
    patient?.ward ? patient.ward : "";
  const ageSex = patient ? [patient.age, patient.sex?.[0]?.toUpperCase()].filter(Boolean).join(" ") : "";
  const allergies = Array.isArray(patient?.allergies) ? patient.allergies : [];
  const d = daysIn(patient);

  return (
    <React.Fragment>
      <TopBar title="Patient" onBack={onBack} />

      {!patient && !error && <div className="loader">Loading patient…</div>}

      {patient && (
        <div className="p-header">
          <div className="p-line1">
            <span className="p-name">{patient.name || patient.mrn || patientId}</span>
            {ageSex && <span className="p-demo">{ageSex}</span>}
            <span style={{flex: 1}}></span>
            {d != null && <span className="p-demo">Day {d}</span>}
            <CopyButton
              label="AI ctx"
              style={{ height: '22px', padding: '0 8px', fontSize: '10px', alignSelf: 'center' }}
              getText={() => buildAIContext(patient, tasks || [], vitals || [])}
              confirmMsg="Patient context copied"
            />
          </div>
          <div className="p-line2">
            {patient.mrn && <span>MRN {patient.mrn}</span>}
            {where && <React.Fragment><span className="sep">·</span><span>{where}</span></React.Fragment>}
            {patient.department && <React.Fragment><span className="sep">·</span><span>{patient.department}</span></React.Fragment>}
          </div>
          <div className="p-tags">
            {patient.isUrgent && <span className="tag tag-urgent">URGENT</span>}
            {patient.currentState && <span className="tag">{String(patient.currentState).toUpperCase()}</span>}
            {patient.pathway && <span className="tag">{String(patient.pathway).toUpperCase()}</span>}
            {allergies.length > 0 && allergies.map((a, i) => <span key={`al-${i}`} className="tag tag-allergy">{a}</span>)}
          </div>
          <div className="p-counts">
            {overdueCount > 0 && <span className="cnt-late mini">{overdueCount} late</span>}
            <span className={`cnt-open mini ${open.length > 0 ? "active" : ""}`}>{open.length} open</span>
            {done.length > 0 && <span className="cnt-done mini">{done.length} done</span>}
          </div>
        </div>
      )}

      {/* Tab strip */}
      <div className="tab-strip">
        <button className={`tab ${tab==='tasks'?'active':''}`} onClick={() => setTab("tasks")}>Tasks</button>
        <button className={`tab ${tab==='rounds'?'active':''}`} onClick={() => setTab("rounds")}>Rounds</button>
        <button className={`tab ${tab==='vitals'?'active':''}`} onClick={() => setTab("vitals")}>
          Vitals{vitals && vitals.length > 0 ? <span className="tab-count">{vitals.length}</span> : null}
        </button>
      </div>

      {error && <EmptyState title="Could not load" body={error} />}

      {tasks && tab === "tasks" && (
        <TasksView patient={patient ? { ...patient, id: patientId } : { id: patientId }} tasks={tasks} onOpenTask={onOpenTask} where={where} />
      )}

      {tasks && tab === "rounds" && (
        <RoundsView patient={patient} tasks={tasks} />
      )}

      {tab === "vitals" && (
        <VitalsView vitals={vitals} />
      )}
    </React.Fragment>
  );
}

window.PatientTasks = PatientTasks;
