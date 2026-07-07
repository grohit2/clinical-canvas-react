/* PatientDetailSheets.jsx — FAB + compose sheets for the patient detail screen.
   Globals: PDFab, PDNoteSheet, PDVitalsSheet, PDTaskSheet, PDMedSheet
   Loaded after PatientDetailViews.jsx, before PatientTasks.jsx.
   pd-sh-* CSS classes are appended to clinical.css. */

// ── PDFab ─────────────────────────────────────────────────────────────────────

function PDFab({ onNote, onVitals, onTask, onMed }) {
  const [open, setOpen] = React.useState(false);
  function pick(cb) { setOpen(false); cb(); }
  return (
    <React.Fragment>
      <div className={`pd-fabscrim${open ? " open" : ""}`} onClick={() => setOpen(false)} />
      <div className={`pd-fabwrap${open ? " open" : ""}`}>
        <button className="pd-fitem f1 blue" onClick={() => pick(onNote)}>
          <i className="ti ti-note" />
          <span className="pd-ft">Note</span>
        </button>
        <button className="pd-fitem f2 red" onClick={() => pick(onVitals)}>
          <i className="ti ti-heart" />
          <span className="pd-ft">Vitals</span>
        </button>
        <button className="pd-fitem f3 green" onClick={() => pick(onTask)}>
          <i className="ti ti-checklist" />
          <span className="pd-ft">Task</span>
        </button>
        <button className="pd-fitem f4 yellow" onClick={() => pick(onMed)}>
          <i className="ti ti-pill" />
          <span className="pd-ft">Med</span>
        </button>
        <button className="pd-fab" onClick={() => setOpen(v => !v)}>
          <i className="ti ti-plus" />
        </button>
      </div>
    </React.Fragment>
  );
}

// ── Sheet wrapper ──────────────────────────────────────────────────────────────

function PDSheet({ title, onClose, onSave, saving, extraFoot, children }) {
  return (
    <div className="pd-sh-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pd-sh-panel">
        <div className="pd-sh-head">
          <span className="pd-sh-title">{title}</span>
          <button className="pd-sh-x" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="pd-sh-body">{children}</div>
        <div className="pd-sh-foot">
          <button className="pd-sh-btn pd-sh-cancel" onClick={onClose}>Cancel</button>
          {extraFoot}
          <button className="pd-sh-btn pd-sh-save" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PDField({ label, children }) {
  return (
    <div className="pd-sh-field">
      <label className="pd-sh-lbl">{label}</label>
      {children}
    </div>
  );
}

// ── PDNoteSheet ────────────────────────────────────────────────────────────────

const PD_NOTE_TYPES = ["progress","round","imaging","lab","surgery","anaesthesia","nursing"];

function PDNoteSheet({ patientId, onClose, onSaved }) {
  const [text,     setText]     = React.useState("");
  const [noteType, setNoteType] = React.useState("progress");
  const [soap,     setSoap]     = React.useState(false);
  const [subj,     setSubj]     = React.useState("");
  const [obj,      setObj]      = React.useState("");
  const [asmt,     setAsmt]     = React.useState("");
  const [plan,     setPlan]     = React.useState("");
  const [saving,   setSaving]   = React.useState(false);

  async function save(status) {
    if (!text.trim() && !subj.trim()) { alert("Enter some text."); return; }
    setSaving(true);
    try {
      const body = { text: text.trim(), note_type: noteType, status };
      if (soap) body.sections = { subjective: subj, objective: obj, assessment: asmt, plan };
      await window.api.createProgressNote(patientId, body);
      onSaved();
    } catch(e) {
      alert("Error: " + (e.message || e));
    } finally { setSaving(false); }
  }

  return (
    <div className="pd-sh-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pd-sh-panel">
        <div className="pd-sh-head">
          <span className="pd-sh-title">New Note</span>
          <button className="pd-sh-x" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="pd-sh-body">
          <PDField label="Type">
            <select className="pd-sh-sel" value={noteType} onChange={e => setNoteType(e.target.value)}>
              {PD_NOTE_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </PDField>
          <PDField label="Text">
            <textarea className="pd-sh-ta" rows={4} value={text}
              onChange={e => setText(e.target.value)} placeholder="Clinical note…" />
          </PDField>
          <button className="pd-sh-toggle" onClick={() => setSoap(v => !v)}>
            {soap ? "▾ Hide" : "▸ Add"} S / O / A / P
          </button>
          {soap && (
            <React.Fragment>
              <PDField label="Subjective (Complaints)">
                <textarea className="pd-sh-ta" rows={2} value={subj} onChange={e => setSubj(e.target.value)} />
              </PDField>
              <PDField label="Objective (Findings)">
                <textarea className="pd-sh-ta" rows={2} value={obj} onChange={e => setObj(e.target.value)} />
              </PDField>
              <PDField label="Assessment">
                <textarea className="pd-sh-ta" rows={2} value={asmt} onChange={e => setAsmt(e.target.value)} />
              </PDField>
              <PDField label="Plan">
                <textarea className="pd-sh-ta" rows={2} value={plan} onChange={e => setPlan(e.target.value)} />
              </PDField>
            </React.Fragment>
          )}
        </div>
        <div className="pd-sh-foot">
          <button className="pd-sh-btn pd-sh-cancel" onClick={onClose}>Cancel</button>
          <button className="pd-sh-btn pd-sh-draft" onClick={() => save("draft")} disabled={saving}>Draft</button>
          <button className="pd-sh-btn pd-sh-save" onClick={() => save("final")} disabled={saving}>
            {saving ? "Saving…" : "Save Final"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PDVitalsSheet ─────────────────────────────────────────────────────────────

function PDVitalsSheet({ patientId, onClose, onSaved }) {
  const [bpS,   setBpS]   = React.useState("");
  const [bpD,   setBpD]   = React.useState("");
  const [hr,    setHr]    = React.useState("");
  const [spo2,  setSpo2]  = React.useState("");
  const [temp,  setTemp]  = React.useState("");
  const [grbs,  setGrbs]  = React.useState("");
  const [rr,    setRr]    = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    const body = {};
    if (bpS.trim())  body.bp_systolic  = Number(bpS);
    if (bpD.trim())  body.bp_diastolic = Number(bpD);
    if (hr.trim())   body.hr           = Number(hr);
    if (spo2.trim()) body.spo2         = Number(spo2);
    if (temp.trim()) body.temp_c       = Number(temp);
    if (grbs.trim()) body.grbs         = Number(grbs);
    if (rr.trim())   body.rr           = Number(rr);
    if (notes.trim()) body.notes       = notes.trim();
    if (Object.keys(body).length === 0 || (Object.keys(body).length === 1 && body.notes)) {
      alert("Enter at least one numeric value."); return;
    }
    setSaving(true);
    try {
      await window.api.recordVitals(patientId, body);
      onSaved();
    } catch(e) {
      alert("Error: " + (e.message || e));
    } finally { setSaving(false); }
  }

  const numRow = (label, val, set, placeholder) => (
    <PDField label={label}>
      <input className="pd-sh-inp" type="number" inputMode="decimal"
        value={val} onChange={e => set(e.target.value)} placeholder={placeholder} />
    </PDField>
  );

  return (
    <PDSheet title="Record Vitals" onClose={onClose} onSave={handleSave} saving={saving}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 10px"}}>
        {numRow("BP Sys", bpS, setBpS, "e.g. 120")}
        {numRow("BP Dia", bpD, setBpD, "e.g. 80")}
        {numRow("HR (bpm)", hr, setHr, "")}
        {numRow("SpO₂ (%)", spo2, setSpo2, "")}
        {numRow("Temp (°C)", temp, setTemp, "e.g. 37.2")}
        {numRow("GRBS", grbs, setGrbs, "mg/dL")}
        {numRow("RR (/min)", rr, setRr, "")}
      </div>
      <PDField label="Notes">
        <input className="pd-sh-inp" type="text" value={notes}
          onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
      </PDField>
    </PDSheet>
  );
}

// ── PDTaskSheet ───────────────────────────────────────────────────────────────

const PD_TASK_TYPES = [
  "generic","investigation","lab_followup","report_followup","photo_upload","medication",
  "vitals","clearance","discharge","consent","blood_arrangement",
  "preop_checklist","postop_review","round_order",
];

function PDTaskSheet({ patientId, onClose, onSaved }) {
  const [title, setTitle] = React.useState("");
  const [type,  setType]  = React.useState("generic");
  const [due,   setDue]   = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    if (!title.trim()) { alert("Enter a task title."); return; }
    setSaving(true);
    try {
      const body = { title: title.trim(), type, status: "todo" };
      if (due) body.due_at = new Date(due).toISOString();
      await window.api.createTask(patientId, body);
      onSaved();
    } catch(e) {
      alert("Error: " + (e.message || e));
    } finally { setSaving(false); }
  }

  return (
    <PDSheet title="New Task" onClose={onClose} onSave={handleSave} saving={saving}>
      <PDField label="Title">
        <input className="pd-sh-inp" type="text" value={title}
          onChange={e => setTitle(e.target.value)} placeholder="Task description" />
      </PDField>
      <PDField label="Type">
        <select className="pd-sh-sel" value={type} onChange={e => setType(e.target.value)}>
          {PD_TASK_TYPES.map(t => (
            <option key={t} value={t}>{t.replace(/_/g," ")}</option>
          ))}
        </select>
      </PDField>
      <PDField label="Due (optional)">
        <input className="pd-sh-inp" type="datetime-local" value={due}
          onChange={e => setDue(e.target.value)} />
      </PDField>
    </PDSheet>
  );
}

// ── PDMedSheet ────────────────────────────────────────────────────────────────

const PD_MED_ROUTES = ["oral","iv","im","sc","topical","inhalation","sublingual","rectal","other"];
const PD_MED_CATS   = ["regular","sos","stat","infusion","narcotic"];

function PDMedSheet({ patientId, onClose, onSaved }) {
  const [drug,  setDrug]  = React.useState("");
  const [dose,  setDose]  = React.useState("");
  const [route, setRoute] = React.useState("oral");
  const [cat,   setCat]   = React.useState("regular");
  const [freq,  setFreq]  = React.useState("1-0-1");
  const [days,  setDays]  = React.useState("5");
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    if (!drug.trim()) { alert("Enter a drug name."); return; }
    setSaving(true);
    try {
      const body = {
        drug: { name: drug.trim(), form: "tablet", ...(dose.trim() ? { dose: dose.trim() } : {}) },
        route, category: cat,
        schedule: { pattern: freq, duration_days: Math.max(1, Number(days) || 5) },
      };
      await window.api.createMedOrder(patientId, body);
      onSaved();
    } catch(e) {
      alert("Error: " + (e.message || e));
    } finally { setSaving(false); }
  }

  return (
    <PDSheet title="New Med Order" onClose={onClose} onSave={handleSave} saving={saving}>
      <PDField label="Drug name">
        <input className="pd-sh-inp" type="text" value={drug}
          onChange={e => setDrug(e.target.value)} placeholder="e.g. Paracetamol 500mg" />
      </PDField>
      <PDField label="Dose (optional)">
        <input className="pd-sh-inp" type="text" value={dose}
          onChange={e => setDose(e.target.value)} placeholder="e.g. 500mg" />
      </PDField>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 10px"}}>
        <PDField label="Route">
          <select className="pd-sh-sel" value={route} onChange={e => setRoute(e.target.value)}>
            {PD_MED_ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </PDField>
        <PDField label="Category">
          <select className="pd-sh-sel" value={cat} onChange={e => setCat(e.target.value)}>
            {PD_MED_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </PDField>
        <PDField label="Frequency (e.g. 1-0-1)">
          <input className="pd-sh-inp" type="text" value={freq} onChange={e => setFreq(e.target.value)} />
        </PDField>
        <PDField label="Days">
          <input className="pd-sh-inp" type="number" min="1" value={days} onChange={e => setDays(e.target.value)} />
        </PDField>
      </div>
    </PDSheet>
  );
}

// ── PDDocsSheet — patient documents, grouped by category, tap to open ────────

function PDDocsSheet({ patientId, onClose }) {
  const [docs, setDocs] = React.useState(null);
  const [err, setErr]   = React.useState(null);
  React.useEffect(() => {
    window.api.getDocuments(patientId).then(setDocs).catch(e => setErr(e.message || String(e)));
  }, [patientId]);

  const CATS = [
    ["preopPics",     "Pre-op photos"],
    ["labReports",    "Lab reports"],
    ["radiology",     "Radiology"],
    ["intraopPics",   "Intra-op photos"],
    ["otNotes",       "OT notes"],
    ["postopPics",    "Post-op photos"],
    ["dischargePics", "Discharge"],
  ];
  const rows = [];
  if (docs) for (const [k, label] of CATS) for (const it of (docs[k] || [])) rows.push({ label, it });

  function keyOf(it)  { return typeof it === "string" ? it : (it.key || it.s3Key || it.s3_key || null); }
  function nameOf(it) {
    if (typeof it === "string") return it.split("/").pop();
    return it.caption || it.name || (keyOf(it) || "file").split("/").pop();
  }
  async function openItem(it) {
    const key = keyOf(it);
    if (!key) return;
    try {
      const r = await window.api.presignFileDownload(patientId, key);
      if (r?.url) window.open(r.url, "_blank");
    } catch (e) { alert("Could not open file: " + (e.message || e)); }
  }

  return (
    <div className="pd-sh-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pd-sh-panel">
        <div className="pd-sh-head">
          <span className="pd-sh-title">Documents</span>
          <button className="pd-sh-x" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="pd-sh-body">
          {err && <div style={{ color: "var(--pd-red)", font: "400 13px var(--pd-gs)" }}>{err}</div>}
          {!err && !docs && <div style={{ color: "var(--pd-f2)", font: "400 13px var(--pd-gs)" }}>Loading…</div>}
          {docs && rows.length === 0 && (
            <div style={{ color: "var(--pd-f2)", font: "400 13px var(--pd-gs)" }}>
              No documents uploaded yet for this patient.
            </div>
          )}
          {rows.map((r, i) => (
            <div key={i} className="pd-doc-row" onClick={() => openItem(r.it)}>
              <i className="ti ti-file" />
              <span className="t">{nameOf(r.it)}</span>
              <span className="d">{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.PDFab         = PDFab;
window.PDNoteSheet   = PDNoteSheet;
window.PDVitalsSheet = PDVitalsSheet;
window.PDTaskSheet   = PDTaskSheet;
window.PDMedSheet    = PDMedSheet;
window.PDDocsSheet   = PDDocsSheet;
