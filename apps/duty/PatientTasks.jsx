/* PatientTasks.jsx — patient detail shell (5-tab rewrite).
   Depends on: PatientDetailViews.jsx + PatientDetailSheets.jsx (loaded before this).
   Globals: buildAIContext (window), PatientTasks (window). */

// ── Shared helpers ────────────────────────────────────────────────────────────

function daysIn(patient) {
  const seedStr = patient?.admissionDate || patient?.mrnHistory?.[0]?.date;
  if (!seedStr) return null;
  const seed = new Date(seedStr).getTime();
  if (Number.isNaN(seed)) return null;
  const days = Math.floor((Date.now() - seed) / 86400000);
  return days < 0 ? 0 : days;
}

function dayLabel(iso) {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "—";
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yest))  return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// ── Illness severity ──────────────────────────────────────────────────────────

function illnessSeverity({ tasks, vitals }) {
  const open     = tasks.filter(t => !["done","cancelled"].includes(t.status));
  const late     = open.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now());
  const blocked  = open.filter(t => t.status === "blocked");
  const critical = open.filter(t => (t.priority || "").toLowerCase() === "critical");
  const v = vitals?.[0];
  const vitalsBad = v && (
    (v.bp_systolic  != null && (v.bp_systolic  >= 160 || v.bp_systolic  <= 90)) ||
    (v.hr           != null && (v.hr           >= 120 || v.hr           <= 50)) ||
    (v.spo2         != null && v.spo2 < 92) ||
    (v.temp_c       != null && (v.temp_c >= 38.5 || v.temp_c <= 35.5))
  );
  if (vitalsBad || critical.length > 0 || blocked.length > 0) return "unstable";
  if (late.length > 0) return "watcher";
  return "stable";
}

// ── Handoff text builder ──────────────────────────────────────────────────────

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
    v.hr   != null ? `HR ${v.hr}` : null,
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
  const lines = [head, `[I] ${sev}`];
  if (podLine) lines.push(`[P] ${podLine}`);
  if (vline)   lines.push(`     ${vline}`);
  if (actions.length) { lines.push("[A] Action list:"); lines.push(...actions); }
  const watchers = [];
  if (late.length > 0) watchers.push(`${late.length} task${late.length>1?"s":""} overdue`);
  if (allergies.length > 0) watchers.push(`Allergies: ${allergies.join(", ")}`);
  if (patient.comorbidities?.length) watchers.push(`Hx: ${patient.comorbidities.join(", ")}`);
  if (watchers.length) lines.push(`[S] Watch for: ${watchers.join("; ")}`);
  lines.push("[S] Synthesis: please confirm receipt.");
  return lines.join("\n");
}

// ── AI context builder ────────────────────────────────────────────────────────

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
    if (lv.hr   != null) vParts.push(`HR ${lv.hr}`);
    if (lv.spo2 != null) vParts.push(`SpO₂ ${lv.spo2}%`);
    if (lv.temp_c != null) vParts.push(`T ${lv.temp_c}°C`);
    if (lv.grbs != null) vParts.push(`GRBS ${lv.grbs}`);
    if (lv.rr   != null) vParts.push(`RR ${lv.rr}`);
    if (lv.urine_output_ml != null) vParts.push(`UO ${lv.urine_output_ml}ml`);
    const ts = lv.recorded_at
      ? new Date(lv.recorded_at).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", hour12:false })
      : "";
    lines.push(""); lines.push(`## Vitals${ts ? ` (${ts})` : ""}`);
    lines.push(vParts.join(" · ") || "—");
  }
  const open = (tasks || []).filter(t => !["done","cancelled"].includes(t.status));
  const done = (tasks || []).filter(t => t.status === "done");
  if (open.length > 0) {
    const lateCount = open.filter(t => { const due = t.dueAt || t.due_at; return due && new Date(due).getTime() < Date.now(); }).length;
    lines.push(""); lines.push(`## Open Tasks (${open.length}${lateCount > 0 ? `, ${lateCount} late` : ""})`);
    const priority = { blocked:0, in_progress:1, todo:2, pending:3 };
    for (const t of [...open].sort((a,b) => (priority[a.status]??9)-(priority[b.status]??9))) {
      const label = { blocked:"BLOCKED", in_progress:"IN PROG", todo:"TODO", pending:"WAITING" }[t.status] || t.status.toUpperCase();
      const dueField = t.dueAt || t.due_at;
      const dueStr = dueField
        ? (new Date(dueField).getTime() < Date.now() ? ` [LATE ${Math.round((Date.now()-new Date(dueField).getTime())/3600000)}h]` : ` @ ${new Date(dueField).toISOString().slice(11,16)}`)
        : "";
      lines.push(`[${label}] ${t.title}${t.type ? ` (${t.type})` : ""}${dueStr}`);
    }
  }
  if (done.length > 0) {
    lines.push(""); lines.push(`## Done (${done.length})`);
    for (const t of done.slice(0,5)) lines.push(`✓ ${t.title}`);
    if (done.length > 5) lines.push(`  … +${done.length-5} more`);
  }
  return lines.join("\n");
}

window.buildAIContext = buildAIContext;

// ── Overview tab (backend-realistic v1) ───────────────────────────────────────

function pdOvClock(ts) {
  return ts ? new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
}
function pdOvAgo(ts) {
  if (!ts) return "";
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
function pdOvLateBy(dueAt) {
  const h = Math.round((Date.now() - new Date(dueAt).getTime()) / 3600000);
  return h < 1 ? "late" : h < 24 ? `${h}h late` : `${Math.round(h / 24)}d late`;
}

function PDOverviewView({ patient, tasks, vitals, notes, medsDashboard, severity, openTasks,
  lateTasks, unackedNotes, dueMeds, todayRounds, labTasks, latestNote, latestVitals, prevVitals,
  medOrders, onOpenTask, setTab }) {

  const nowMs = Date.now();

  const sevColor = severity === "unstable" ? "var(--pd-red)" : severity === "watcher" ? "var(--pd-yel)" : "var(--pd-grn)";
  const sevLabel = severity === "unstable" ? "Unstable" : severity === "watcher" ? "Watcher" : "Stable";

  // ── vitals series over the last 48h (oldest → newest) ──
  const sortedAsc = [...(vitals || [])]
    .filter(v => v.recorded_at)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  const v48 = sortedAsc.filter(v => nowMs - new Date(v.recorded_at).getTime() <= 48 * 3600e3);
  const series = k => v48.map(v => v[k]).filter(x => x != null).map(Number);
  const tS = series("temp_c"), hrS = series("hr"), gS = series("grbs");
  const tempRising = tS.length >= 2 && tS[tS.length - 1] - tS[0] >= 0.3;

  // ── situation line ──
  const d = daysIn(patient);
  const sitParts = [];
  if (patient?.diagnosis) sitParts.push(`${d != null ? `Day ${d} — ` : ""}${patient.diagnosis}`);
  else if (d != null) sitParts.push(`Day ${d}`);
  if (tempRising) sitParts.push(`temp ${tS[tS.length - 1]}° trending up`);
  if (lateTasks.length > 0) sitParts.push(`${lateTasks.length} task${lateTasks.length > 1 ? "s" : ""} overdue`);
  if (unackedNotes.length > 0) sitParts.push(`${unackedNotes.length} note${unackedNotes.length > 1 ? "s" : ""} to ack`);

  // ── next 4 hours (task due times) ──
  const next4 = openTasks
    .filter(t => { const due = t.dueAt && new Date(t.dueAt).getTime(); return due && due >= nowMs && due <= nowMs + 4 * 3600e3; })
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .slice(0, 6);
  const nxCls = t => {
    const ty = (t.type || "").toLowerCase();
    if (ty.includes("med")) return "med";
    if (ty.includes("photo") || ty.includes("pic")) return "pho";
    if (ty.includes("lab") || ty.includes("inv") || ty.includes("review")) return "inv";
    return "";
  };

  // ── clinical card (patient META + latest surgery note) ──
  const surgNote = (notes || []).filter(n => n.noteType === "surgery")
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0] || null;
  const comorbid  = (patient?.comorbidities || []).filter(Boolean);
  const allergies = (patient?.allergies || []).filter(Boolean);
  const team      = patient?.assignedDoctor || null;
  let procName = patient?.procedureName || null;
  let procSub  = null;
  if (procName && patient?.surgeryDate) {
    const pod = Math.max(0, Math.floor((nowMs - new Date(patient.surgeryDate).getTime()) / 86400000));
    procSub = `· ${new Date(patient.surgeryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · POD ${pod}`;
  } else if (surgNote) {
    procName = (surgNote.text || "").split("\n")[0] || "Surgery note";
    procSub  = surgNote.createdAt
      ? `· ${new Date(surgNote.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
      : null;
  }
  const hasClinical = patient?.diagnosis || procName || comorbid.length > 0 || allergies.length > 0 || team;

  // ── next med (from MED-category tasks; MAR is the source of truth in Meds tab) ──
  const medTasks = openTasks
    .filter(t => (t.type || "").toLowerCase().includes("med") && t.dueAt && new Date(t.dueAt).getTime() >= nowMs)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const nextMed = medTasks[0] || null;

  // ── plan (latest note carrying a plan section; round notes float first by recency) ──
  const planNote = (notes || []).filter(n => n.sections && n.sections.plan)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0] || null;

  function VcChip({ l, n, u, prev }) {
    if (n == null || n === "") return null;
    const c = parseFloat(n), p = parseFloat(prev);
    const tr = (isNaN(c) || isNaN(p) || prev == null) ? null : c > p ? "up" : c < p ? "dn" : "flat";
    return (
      <span className="pd-vc">
        <span className="l">{l}</span>
        <span className="n">{n}</span>
        {u && <span className="u">{u}</span>}
        {tr && <span className={`tr pd-tr-${tr}`}>{tr === "up" ? "↑" : tr === "dn" ? "↓" : "·"}</span>}
      </span>
    );
  }
  const lv = latestVitals, pv = prevVitals;
  const bp   = lv?.bp_systolic != null && lv?.bp_diastolic != null ? `${lv.bp_systolic}/${lv.bp_diastolic}` : null;
  const bpPv = pv?.bp_systolic != null && pv?.bp_diastolic != null ? `${pv.bp_systolic}/${pv.bp_diastolic}` : null;

  function Spark({ pts, color }) {
    if (!pts || pts.length < 2) return null;
    const min = Math.min(...pts), max = Math.max(...pts), span = (max - min) || 1;
    const step = 76 / (pts.length - 1);
    const s = pts.map((p, i) => `${Math.round(i * step)},${Math.round(16 - ((p - min) / span) * 13)}`).join(" ");
    return (
      <svg width="76" height="18" viewBox="0 0 76 18">
        <polyline points={s} fill="none" stroke={color} strokeWidth="1.6" />
      </svg>
    );
  }
  function Trend({ label, pts, color }) {
    if (!pts || pts.length < 2) return null;
    return (
      <span className="pd-sp1">
        <span className="h">
          <span className="l">{label}</span>
          <span className="n" style={{ color }}>{pts[pts.length - 1]}</span>
          <span className="d">{pts[0]}→</span>
        </span>
        <Spark pts={pts} color={color} />
      </span>
    );
  }
  const hasTrend = tS.length >= 2 || hrS.length >= 2 || gS.length >= 2;

  return (
    <div>
      {/* counter tiles */}
      <div className="pd-tgrid">
        <button className="pd-tc green" onClick={() => setTab("tasks")}>
          <span className="num">{openTasks.length}</span>
          <span className="lb">Tasks</span>
          <span className="sb2">{lateTasks.length > 0 ? <span className="lt">{lateTasks.length} late</span> : "on track"}</span>
        </button>
        <button className="pd-tc yellow" onClick={() => setTab("meds")}>
          <span className="num">{(medOrders && medOrders.length > 0) ? dueMeds : "—"}</span>
          <span className="lb">Meds</span>
          <span className="sb2">{(medOrders && medOrders.length > 0) ? "due today" : "no orders"}</span>
        </button>
        <button className="pd-tc blue" onClick={() => setTab("notes")}>
          <span className="num">{unackedNotes.length > 0 ? unackedNotes.length : (notes || []).length}</span>
          <span className="lb">Notes</span>
          <span className="sb2">{unackedNotes.length > 0 ? "need ack" : "total"}</span>
        </button>
        <button className="pd-tc red" onClick={() => setTab("notes")}>
          <span className="num">{todayRounds.length > 0 ? "✓" : "—"}</span>
          <span className="lb">Round</span>
          <span className="sb2">{todayRounds.length > 0 ? `${pdOvClock(todayRounds[0].createdAt)} noted` : "not yet"}</span>
        </button>
      </div>

      {/* situation line */}
      <div className="pd-sit">
        <span className="dot" style={{ background: sevColor }} />
        <span className="t">
          <b style={{ color: sevColor }}>{sevLabel}</b>
          {sitParts.join(" · ") || "no active concerns"}
        </span>
      </div>

      {/* next-4h strip */}
      {next4.length > 0 && (
        <div className="pd-nx">
          <span className="pd-nxlbl">Next 4h</span>
          {next4.map(t => (
            <span key={t.taskId} className={`pd-nxc ${nxCls(t)}`} onClick={() => onOpenTask && onOpenTask(t)}>
              <span className="t">{pdOvClock(t.dueAt)}</span>
              <span className="x">{t.title}</span>
            </span>
          ))}
        </div>
      )}

      {/* Clinical */}
      {hasClinical && (
        <React.Fragment>
          <div className="pd-slbl">Clinical <span className="ln" /></div>
          <div className="pd-card">
            {patient?.diagnosis && (
              <div className="pd-kv"><span className="k">Diagnosis</span><span className="v">{patient.diagnosis}</span></div>
            )}
            {procName && (
              <div className="pd-kv"><span className="k">Procedure</span>
                <span className="v">{procName} {procSub && <span className="sub">{procSub}</span>}</span>
              </div>
            )}
            {comorbid.length > 0 && (
              <div className="pd-kv"><span className="k">History</span>
                <span className="v">{comorbid.map(c => <span key={c} className="pd-cx">{c}</span>)}</span>
              </div>
            )}
            {allergies.length > 0 && (
              <div className="pd-kv alert"><span className="k">Allergies</span>
                <span className="v"><span className="pd-ax"><i className="ti ti-alert-triangle" style={{ fontSize: 11 }} />{allergies.join(", ")}</span></span>
              </div>
            )}
            {team && (
              <div className="pd-kv"><span className="k">Team</span><span className="v">{team}</span></div>
            )}
          </div>
        </React.Fragment>
      )}

      {/* Right now */}
      {(lv || nextMed) && (
        <React.Fragment>
          <div className="pd-slbl">Right now <span className="ln" /></div>
          <div className="pd-card">
            {lv && (
              <div className="pd-kv">
                <span className="k">Vitals
                  <div className="meta">{pdOvClock(lv.recorded_at)}{pdOvAgo(lv.recorded_at) ? ` · ${pdOvAgo(lv.recorded_at)}` : ""}</div>
                </span>
                <span className="v"><span className="pd-vch">
                  {bp && <VcChip l="BP" n={bp} prev={bpPv} />}
                  <VcChip l="HR" n={lv.hr} u="" prev={pv?.hr} />
                  <VcChip l="SpO₂" n={lv.spo2} u="%" prev={pv?.spo2} />
                  <VcChip l="T" n={lv.temp_c} u="°" prev={pv?.temp_c} />
                  <VcChip l="GRBS" n={lv.grbs} u="" prev={pv?.grbs} />
                </span></span>
              </div>
            )}
            {hasTrend && (
              <div className="pd-kv"><span className="k">48h trend</span>
                <span className="v"><span className="pd-spr">
                  <Trend label="T°"   pts={tS}  color={tempRising ? "#f28b82" : "#9aa0a6"} />
                  <Trend label="HR"   pts={hrS} color="#9aa0a6" />
                  <Trend label="GRBS" pts={gS}  color="#81c995" />
                </span></span>
              </div>
            )}
            {nextMed && (
              <div className="pd-kv"><span className="k">Next med</span>
                <span className="v pd-medline"><b>{pdOvClock(nextMed.dueAt)}</b> {nextMed.title}<span className="pd-srcb">from tasks</span></span>
              </div>
            )}
          </div>
        </React.Fragment>
      )}

      {/* Labs */}
      {labTasks.length > 0 && (
        <React.Fragment>
          <div className="pd-slbl">Labs <span className="ln" /></div>
          <div className="pd-card">
            <div className="pd-kv" style={{ gridTemplateColumns: "1fr" }}>
              <span className="v pd-lablink" onClick={() => setTab("tasks")}>
                <i className="ti ti-flask" />
                {labTasks.slice(0, 2).map(t => t.title).join(" · ")}{labTasks.length > 2 ? ` +${labTasks.length - 2}` : ""}
                <span className="go">View <i className="ti ti-chevron-right" style={{ fontSize: 11 }} /></span>
              </span>
            </div>
          </div>
        </React.Fragment>
      )}

      {/* Needs attention */}
      {lateTasks.length > 0 && (
        <React.Fragment>
          <div className="pd-slbl">Needs attention <span className="ln" /></div>
          {lateTasks.slice(0, 5).map(t => (
            <div key={t.taskId} className="pd-att late" onClick={() => onOpenTask && onOpenTask(t)}>
              <i className="ti ti-alert-circle" />
              <span className="t">{t.title}</span>
              <span className="d late">{pdOvLateBy(t.dueAt)}</span>
            </div>
          ))}
        </React.Fragment>
      )}

      {/* Plan */}
      {planNote && (
        <React.Fragment>
          <div className="pd-slbl">Plan <span className="ln" /></div>
          <div className="pd-plan2">
            {planNote.sections.plan}
            <div className="src">
              From {planNote.noteType ? `${planNote.noteType} note` : "note"} · {pdOvClock(planNote.createdAt)}
              {planNote.author?.name ? ` · ${planNote.author.name}` : ""}
            </div>
          </div>
        </React.Fragment>
      )}
      <div style={{ height: 12 }} />
    </div>
  );
}

// ── PatientTasks shell ────────────────────────────────────────────────────────

const PD_VALID_TABS = ["overview","notes","tasks","meds","docs"];

function PatientTasks({ patientId, onBack, onOpenTask }) {
  const [tab, setTab] = React.useState(() => {
    const s = localStorage.getItem("patient.tab");
    return PD_VALID_TABS.includes(s) ? s : "overview";
  });
  const [patient,   setPatient]   = React.useState(null);
  const [tasks,     setTasks]     = React.useState(null);
  const [vitals,    setVitals]    = React.useState(null);
  const [notes,     setNotes]     = React.useState(null);
  const [medOrders, setMedOrders] = React.useState(null);
  const [medsDash,  setMedsDash]  = React.useState(null);
  const [error,     setError]     = React.useState(null);
  const [sheet,     setSheet]     = React.useState(null);

  React.useEffect(() => { localStorage.setItem("patient.tab", tab); }, [tab]);

  // Hide the global tabbar while this screen is mounted
  React.useEffect(() => {
    const el = document.querySelector(".tabbar");
    if (el) { el.style.display = "none"; return () => { el.style.display = ""; }; }
  }, []);

  async function refresh() {
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [taskList, p, v, n, mo, md] = await Promise.all([
        window.api.listPatientTasks(patientId),
        window.api.getPatient(patientId).catch(() => null),
        window.api.listVitals(patientId, 100).catch(() => ({ items: [] })),
        window.api.listProgressNotes(patientId).catch(() => ({ items: [] })),
        window.api.listMedOrders(patientId).catch(() => ({ items: [] })),
        window.api.getMedsDashboard(patientId, today).catch(() => null),
      ]);
      setTasks(Array.isArray(taskList) ? taskList : []);
      setPatient(p || null);
      setVitals(Array.isArray(v) ? v : (v?.items || []));
      setNotes(Array.isArray(n) ? n : (n?.items || n?.notes || []));
      setMedOrders(Array.isArray(mo) ? mo : (mo?.items || []));
      setMedsDash(md);
    } catch(e) {
      setError(e.message || String(e));
    }
  }

  React.useEffect(() => { refresh(); }, [patientId]);

  // ── Checkpoint-driven delta sync (see sync.js for cursor semantics) ──
  // Two feeds cover this screen: the unified change feed (vitals, notes,
  // med orders, MAR) and the legacy TASKSYNC stream — task events do NOT
  // appear in the unified feed yet, so both checkpoints are needed.
  React.useEffect(() => {
    const uid = patient?.uid || patient?.id;
    if (!uid) return;
    return window.dutySync.startDeltaPoll({
      feeds: [
        { key: `duty.changes.ckpt.patient.${uid}`,
          fetch: (after) => window.api.getChanges("patient", uid, after, 200) },
        { key: `duty.changes.ckpt.tasksync.patient.${uid}`,
          fetch: (after) => window.api.changes("patient", uid, after) },
      ],
      onChange: refresh,
      intervalMs: 25000,
    });
  }, [patient?.uid || patient?.id]);

  const allTasks      = tasks || [];
  const noteList      = notes || [];
  const vitalList     = vitals || [];
  const sortedVitals  = [...vitalList].sort((a,b) => new Date(b.recorded_at||0) - new Date(a.recorded_at||0));
  const latestVitals  = sortedVitals[0] || null;
  const prevVitals    = sortedVitals[1] || null;
  const severity      = illnessSeverity({ tasks: allTasks, vitals: vitalList });
  const openTasks     = allTasks.filter(t => !["done","cancelled"].includes(t.status));
  const lateTasks     = openTasks.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now());
  const unackedNotes  = noteList.filter(n => !n.acknowledge && n.status === "final" && n.kind !== "legacy");
  const dueMeds       = (medsDash?.counts?.due || 0) + (medsDash?.counts?.overdue || 0);
  const todayRounds   = noteList.filter(n => n.noteType === "round" && dayLabel(n.createdAt) === "Today");
  const labTasks      = openTasks.filter(t => t.type === "lab_followup" || t.type === "investigation");
  const latestNote    = [...noteList].sort((a,b) => (b.createdAt||"").localeCompare(a.createdAt||""))[0] || null;

  const ageSex = patient ? [patient.age, patient.sex?.[0]?.toUpperCase()].filter(Boolean).join(" ") : "";
  const where  = patient?.roomNumber ? `Bed ${patient.roomNumber}` :
                 patient?.bedNo ? `Bed ${patient.bedNo}` :
                 patient?.ward ? patient.ward : "";
  const d = daysIn(patient);

  async function handleAck(pnId) {
    try {
      await window.api.acknowledgeNote(patientId, pnId);
      refresh();
    } catch(e) {
      alert("Could not acknowledge: " + (e.message || e));
    }
  }

  function NavBtn({ id, icon, label }) {
    return (
      <button className={`pd-btab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
        <span className="ico"><i className={`ti ${icon}`} /></span>
        <span>{label}</span>
      </button>
    );
  }

  function copyAICtx() {
    const text = buildAIContext(
      patient ? { ...patient, uid: patient.uid || patient.id || patientId } : { id: patientId },
      allTasks, vitalList
    );
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  }

  const SEV_COLOR = { stable: "#81c995", watcher: "#fbbc04", unstable: "#f28b82" };
  function copyHandoff() {
    const text = buildHandoffText({
      patient: patient || { id: patientId },
      tasks: allTasks, vitals: vitalList, severity,
    });
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <React.Fragment>
      {/* Patient top bar */}
      <div className="pd-ptop">
        <div className="nm">
          <div className="n">{patient?.name || patient?.mrn || patientId}</div>
          <div className="s">
            {[patient?.mrn && `MRN ${patient.mrn}`, ageSex, where, d != null && `Day ${d}`]
              .filter(Boolean).join(" · ")}
          </div>
        </div>
        <button className="pd-hmx-pill docs" onClick={() => setTab("docs")}>
          <i className="ti ti-folder" /> Docs
        </button>
        <button className="pd-hmx-pill" onClick={copyHandoff}>
          <span className="sev" style={{ width: 6, height: 6, borderRadius: "50%",
            background: SEV_COLOR[severity] || SEV_COLOR.watcher }} /> Handoff
        </button>
        <button className="pd-hmx-pill" onClick={copyAICtx}>
          <i className="ti ti-copy" /> AI ctx
        </button>
      </div>

      {error && <EmptyState title="Could not load" body={error} />}

      {/* Scrollable content body */}
      <div className="pd-scr-body">
        {tab === "overview" && (
          <PDOverviewView
            patient={patient} tasks={allTasks} vitals={vitalList} notes={noteList}
            medsDashboard={medsDash} severity={severity}
            openTasks={openTasks} lateTasks={lateTasks}
            unackedNotes={unackedNotes} dueMeds={dueMeds}
            todayRounds={todayRounds} labTasks={labTasks}
            latestNote={latestNote}
            latestVitals={latestVitals} prevVitals={prevVitals}
            medOrders={medOrders} onOpenTask={onOpenTask}
            setTab={setTab}
          />
        )}
        {tab === "notes" && (
          <PDNotesView notes={noteList} vitals={vitalList} onAck={handleAck} />
        )}
        {tab === "tasks" && (
          <PDTasksView tasks={allTasks} onOpenTask={onOpenTask} />
        )}
        {tab === "meds" && (
          <PDMedsView patientId={patientId} medsDashboard={medsDash}
            medOrders={medOrders} onRefresh={refresh} />
        )}
        {tab === "docs" && (
          <PDDocsView patientId={patientId} />
        )}
      </div>

      {/* Bottom nav */}
      <div className="pd-bnav pd-p">
        <button className="pd-bback" onClick={onBack}><i className="ti ti-arrow-left" /></button>
        <div className="pd-bdiv" />
        <NavBtn id="overview" icon="ti-layout-grid" label="Overview" />
        <NavBtn id="notes"    icon="ti-notes"       label="Notes" />
        <NavBtn id="tasks"    icon="ti-checklist"   label="Tasks" />
        <NavBtn id="meds"     icon="ti-pill"        label="Meds" />
        <NavBtn id="docs"     icon="ti-folder"      label="Docs" />
      </div>

      {/* FAB */}
      <PDFab
        onNote   ={() => setSheet("note")}
        onVitals ={() => setSheet("vitals")}
        onTask   ={() => setSheet("task")}
        onMed    ={() => setSheet("med")}
      />

      {/* Sheets */}
      {sheet === "note"   && <PDNoteSheet   patientId={patientId} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); refresh(); }} />}
      {sheet === "vitals" && <PDVitalsSheet patientId={patientId} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); refresh(); }} />}
      {sheet === "task"   && <PDTaskSheet   patientId={patientId} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); refresh(); }} />}
      {sheet === "med"    && <PDMedSheet    patientId={patientId} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); refresh(); }} />}
    </React.Fragment>
  );
}

window.PatientTasks = PatientTasks;
