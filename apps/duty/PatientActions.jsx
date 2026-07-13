/* PatientActions.jsx — long-press patient actions, manual NLIS launch, and
   frontend-only patient create/edit/registration sheets. */

const PA_NLIS_URL = "http://115.241.194.20/NLIS/Reports/Patient_Report.aspx/PlaQmj1R4CGg6PKJgAxzvQ==";
const PA_SCHEMES = ["ASP", "NAM", "EHS", "PAID", "OTHERS"];
const PA_PATHWAYS = ["surgical", "consultation", "emergency"];
const PA_COMORBIDITIES = ["T2DM", "HTN", "CAD", "CVD", "CKD", "THYROID", "EPILEPSY", "BRONCHIAL ASTHMA", "TUBERCULOSIS"];

function paPatientId(patient) {
  return patient?.uid || patient?.id || patient?.patientId || null;
}

function paText(value) {
  const s = String(value ?? "").trim();
  return s || null;
}

function paDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function paDateTimeInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function paDisplayDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function paInitialForm(patient) {
  const p = patient || {};
  const ec = p.emergencyContact || {};
  const address = ec.address || {};
  return {
    name: p.name || "",
    age: p.age ?? "",
    sex: String(p.sex || "M").toUpperCase().startsWith("F") ? "F" :
      String(p.sex || "M").toUpperCase().startsWith("O") ? "OTHER" : "M",
    mrn: p.mrn || p.latestMrn || "",
    scheme: PA_SCHEMES.includes(String(p.scheme || "").toUpperCase()) ? String(p.scheme).toUpperCase() : "OTHERS",
    department: p.department || "",
    ward: p.ward || "",
    bedNo: p.bedNo || p.roomNumber || "",
    pathway: PA_PATHWAYS.includes(p.pathway) ? p.pathway : "surgical",
    diagnosis: p.diagnosis || "",
    comorbidities: Array.isArray(p.comorbidities) ? p.comorbidities.join(", ") : "",
    assignedDoctor: p.assignedDoctor || "",
    assignedDoctorId: p.assignedDoctorId || "",
    isUrgent: !!p.isUrgent,
    urgentReason: p.urgentReason || "",
    urgentUntil: paDateTimeInput(p.urgentUntil),
    procedureName: p.procedureName || "",
    surgeryCode: p.surgeryCode || "",
    surgeryDate: paDateInput(p.surgeryDate),
    tidNumber: p.tidNumber || "",
    tidStatus: p.tidStatus || "",
    ecName: ec.name || "",
    ecRelationship: ec.relationship || "",
    ecPhone: ec.phone || "",
    ecAltPhone: ec.altPhone || "",
    ecEmail: ec.email || "",
    ecLine1: address.line1 || "",
    ecLine2: address.line2 || "",
    ecCity: address.city || "",
    ecState: address.state || "",
    ecPostalCode: address.postalCode || "",
    ecCountry: address.country || "",
  };
}

function paMrns(patient) {
  const current = patient?.mrn || patient?.latestMrn || null;
  const map = new Map();
  for (const entry of (Array.isArray(patient?.mrnHistory) ? patient.mrnHistory : [])) {
    const mrn = String(entry?.mrn || "").trim();
    if (!mrn) continue;
    const prev = map.get(mrn);
    if (!prev || new Date(entry.date || 0) > new Date(prev.date || 0)) {
      map.set(mrn, { mrn, scheme: entry.scheme || "Unknown", date: entry.date || null });
    }
  }
  if (current && !map.has(String(current))) {
    map.set(String(current), { mrn: String(current), scheme: patient?.scheme || "Unknown", date: null });
  }
  return [...map.values()].sort((a, b) => {
    if (a.mrn === current) return -1;
    if (b.mrn === current) return 1;
    return new Date(b.date || 0) - new Date(a.date || 0);
  });
}

function PatientNameLongPress({ patient, onLongPress, className, children }) {
  const timer = React.useRef(null);
  const start = React.useRef(null);
  const consumed = React.useRef(false);

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }

  React.useEffect(() => cancel, []);

  function begin(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    cancel();
    consumed.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => {
      timer.current = null;
      consumed.current = true;
      if (navigator.vibrate) navigator.vibrate(20);
      onLongPress(patient);
    }, 550);
  }

  function move(e) {
    if (!start.current) return;
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel();
  }

  function click(e) {
    if (!consumed.current) return;
    e.preventDefault();
    e.stopPropagation();
    consumed.current = false;
  }

  function contextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    cancel();
    if (!consumed.current) onLongPress(patient);
    consumed.current = true;
  }

  return (
    <span
      className={`${className || ""} pa-hold-name`}
      title="Hold for MRNs and patient actions"
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onClick={click}
      onContextMenu={contextMenu}
    >
      {children}
    </span>
  );
}

function PABottomSheet({ title, subtitle, onClose, children }) {
  React.useEffect(() => {
    function key(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div className="pa-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="pa-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="pa-grab" />
        <header className="pa-head">
          <div className="pa-head-copy">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="pa-icon-btn" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
        </header>
        <div className="pa-body">{children}</div>
      </section>
    </div>
  );
}

function PAField({ label, hint, wide, children }) {
  return (
    <label className={`pa-field${wide ? " wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function PASection({ title, children }) {
  return (
    <section className="pa-form-section">
      <h3>{title}</h3>
      <div className="pa-form-grid">{children}</div>
    </section>
  );
}

function paEmergencyContact(form) {
  return {
    name: paText(form.ecName),
    relationship: paText(form.ecRelationship),
    phone: paText(form.ecPhone),
    altPhone: paText(form.ecAltPhone),
    email: paText(form.ecEmail),
    address: {
      line1: paText(form.ecLine1), line2: paText(form.ecLine2),
      city: paText(form.ecCity), state: paText(form.ecState),
      postalCode: paText(form.ecPostalCode), country: paText(form.ecCountry),
    },
  };
}

function PatientFormSheet({ patient, onClose, onSaved }) {
  const isCreate = !patient;
  const [form, setForm] = React.useState(() => paInitialForm(patient));
  const [org, setOrg] = React.useState({ departments: [], wards: [] });
  const [staff, setStaff] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const listId = React.useId().replace(/:/g, "");

  function set(key, value) { setForm(prev => ({ ...prev, [key]: value })); }

  React.useEffect(() => {
    let live = true;
    window.api.getOrg().then(data => { if (live) setOrg(data || { departments: [], wards: [] }); }).catch(() => {});
    return () => { live = false; };
  }, []);

  React.useEffect(() => {
    let live = true;
    window.api.listStaff({ department: form.department || undefined }).then(items => {
      if (live) setStaff(Array.isArray(items) ? items : (items?.items || []));
    }).catch(() => { if (live) setStaff([]); });
    return () => { live = false; };
  }, [form.department]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const name = form.name.trim();
    const department = form.department.trim();
    const mrn = form.mrn.trim();
    if (!name || !department || (isCreate && (!mrn || !form.scheme))) {
      setError(isCreate ? "Name, MRN, scheme, and department are required." : "Name and department are required.");
      return;
    }
    if (form.age !== "" && (!Number.isInteger(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 130)) {
      setError("Age must be a whole number from 0 to 130.");
      return;
    }

    const matchedDept = (org.departments || []).find(d => d.name === department);
    const matchedWard = (org.wards || []).find(w => w.name === form.ward.trim());
    const matchedDoctor = staff.find(s => s.name === form.assignedDoctor.trim());
    const comorbidities = form.comorbidities.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    const age = form.age === "" ? null : Number(form.age);
    const urgentUntil = form.urgentUntil ? new Date(form.urgentUntil).toISOString() : null;
    const surgeryDate = form.surgeryDate ? new Date(`${form.surgeryDate}T00:00:00`).toISOString() : null;
    const emergencyContact = paEmergencyContact(form);
    const assignedDoctorId = matchedDoctor?.userId || matchedDoctor?.id || paText(form.assignedDoctorId);

    setSaving(true);
    try {
      if (isCreate) {
        const result = await window.api.createPatient({
          name, age, sex: form.sex === "OTHER" ? "other" : form.sex === "F" ? "female" : "male",
          emergencyContact,
          registration: {
            mrn, scheme: form.scheme, department,
            department_id: matchedDept?.dept_id || null,
            ward_id: matchedWard?.ward_id || null, ward: paText(form.ward),
            bed_no: paText(form.bedNo), room_number: paText(form.bedNo),
            pathway: form.pathway, current_state: "onboarding",
            diagnosis: paText(form.diagnosis), comorbidities,
            assigned_doctor: paText(form.assignedDoctor), assigned_doctor_id: assignedDoctorId,
            is_urgent: form.isUrgent, urgent_reason: paText(form.urgentReason), urgent_until: urgentUntil,
            procedure_name: paText(form.procedureName), surgery_code: paText(form.surgeryCode),
            surgery_date: surgeryDate, tid_number: paText(form.tidNumber), tid_status: paText(form.tidStatus),
          },
        });
        let created = result?.patient || null;
        const uid = created?.id || result?.patient_uid || result?.patientId;
        if (!created && uid) created = await window.api.getPatient(uid);
        onSaved(created || { id: uid, uid, name, mrn });
        return;
      }

      const uid = paPatientId(patient);
      let assignmentSaved = false;
      const assign = {};
      if (department !== (patient.department || "")) {
        assign.department = department;
        if (matchedDept?.dept_id) assign.department_id = matchedDept.dept_id;
      }
      if (form.bedNo.trim() !== String(patient.bedNo || patient.roomNumber || "")) assign.bed_no = paText(form.bedNo);
      if (matchedWard && matchedWard.ward_id !== patient.wardId) assign.ward_id = matchedWard.ward_id;
      if (Object.keys(assign).length) {
        assign.reason = "Updated from Duty patient details";
        await window.api.assignPatient(uid, assign);
        assignmentSaved = true;
      }

      const update = {
        name, age, sex: form.sex === "OTHER" ? "other" : form.sex === "F" ? "female" : "male",
        emergencyContact,
        pathway: form.pathway,
        diagnosis: paText(form.diagnosis), comorbidities,
        assigned_doctor: paText(form.assignedDoctor), assigned_doctor_id: assignedDoctorId,
        is_urgent: form.isUrgent, urgent_reason: paText(form.urgentReason), urgent_until: urgentUntil,
        procedure_name: paText(form.procedureName), surgery_code: paText(form.surgeryCode),
        surgery_date: surgeryDate, tid_number: paText(form.tidNumber), tid_status: paText(form.tidStatus),
        room_number: paText(form.bedNo), ward: paText(form.ward),
      };
      try {
        const result = await window.api.updatePatient(uid, update);
        const updated = result?.patient || await window.api.getPatient(uid);
        onSaved(updated, { partial: false });
      } catch (updateError) {
        if (assignmentSaved) {
          const latest = await window.api.getPatient(uid).catch(() => patient);
          onSaved(latest, { partial: true });
          setError(`Location was saved, but other details failed: ${updateError.message || updateError}`);
        } else {
          throw updateError;
        }
      }
    } catch (err) {
      setError(err?.status === 409 ? "That MRN is already assigned to another patient." : (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PABottomSheet title={isCreate ? "New Patient" : "Edit Patient"}
      subtitle={isCreate ? "Create an active registration" : patient?.name} onClose={onClose}>
      <form className="pa-form" onSubmit={submit}>
        {error && <div className="pa-alert error">{error}</div>}

        <PASection title="Patient">
          <PAField label="Name" wide><input value={form.name} onChange={e => set("name", e.target.value)} required /></PAField>
          <PAField label="Age"><input type="number" min="0" max="130" inputMode="numeric" value={form.age} onChange={e => set("age", e.target.value)} /></PAField>
          <PAField label="Sex"><select value={form.sex} onChange={e => set("sex", e.target.value)}><option value="M">Male</option><option value="F">Female</option><option value="OTHER">Other</option></select></PAField>
        </PASection>

        {isCreate && <PASection title="Registration">
          <PAField label="MRN"><input value={form.mrn} onChange={e => set("mrn", e.target.value)} required /></PAField>
          <PAField label="Scheme"><select value={form.scheme} onChange={e => set("scheme", e.target.value)}>{PA_SCHEMES.map(s => <option key={s}>{s}</option>)}</select></PAField>
        </PASection>}

        <PASection title="Assignment">
          <PAField label="Department" wide><input list={`${listId}-departments`} value={form.department} onChange={e => set("department", e.target.value)} required /><datalist id={`${listId}-departments`}>{(org.departments || []).map(d => <option key={d.dept_id} value={d.name} />)}</datalist></PAField>
          <PAField label="Ward"><input list={`${listId}-wards`} value={form.ward} onChange={e => set("ward", e.target.value)} /><datalist id={`${listId}-wards`}>{(org.wards || []).map(w => <option key={w.ward_id} value={w.name} />)}</datalist></PAField>
          <PAField label="Bed / room"><input value={form.bedNo} onChange={e => set("bedNo", e.target.value)} /></PAField>
          <PAField label="Assigned doctor" wide><input list={`${listId}-staff`} value={form.assignedDoctor} onChange={e => set("assignedDoctor", e.target.value)} /><datalist id={`${listId}-staff`}>{staff.map(s => <option key={s.userId || s.id || s.name} value={s.name} />)}</datalist></PAField>
        </PASection>

        <PASection title="Clinical">
          <PAField label="Pathway"><select value={form.pathway} onChange={e => set("pathway", e.target.value)}>{PA_PATHWAYS.map(p => <option key={p}>{p}</option>)}</select></PAField>
          <PAField label="Diagnosis" wide><textarea rows="2" value={form.diagnosis} onChange={e => set("diagnosis", e.target.value)} /></PAField>
          <PAField label="Comorbidities" hint={`Comma separated, e.g. ${PA_COMORBIDITIES.slice(0, 3).join(", ")}`} wide><input value={form.comorbidities} onChange={e => set("comorbidities", e.target.value)} /></PAField>
        </PASection>

        <PASection title="Procedure / theatre">
          <PAField label="Procedure" wide><input value={form.procedureName} onChange={e => set("procedureName", e.target.value)} /></PAField>
          <PAField label="Surgery code"><input value={form.surgeryCode} onChange={e => set("surgeryCode", e.target.value)} /></PAField>
          <PAField label="Surgery date"><input type="date" value={form.surgeryDate} onChange={e => set("surgeryDate", e.target.value)} /></PAField>
          <PAField label="TID number"><input value={form.tidNumber} onChange={e => set("tidNumber", e.target.value)} /></PAField>
          <PAField label="TID status"><input value={form.tidStatus} onChange={e => set("tidStatus", e.target.value)} /></PAField>
        </PASection>

        <PASection title="Urgency">
          <label className="pa-check wide"><input type="checkbox" checked={form.isUrgent} onChange={e => set("isUrgent", e.target.checked)} /><span>Mark patient urgent</span></label>
          {form.isUrgent && <React.Fragment><PAField label="Reason" wide><input value={form.urgentReason} onChange={e => set("urgentReason", e.target.value)} /></PAField><PAField label="Urgent until" wide><input type="datetime-local" value={form.urgentUntil} onChange={e => set("urgentUntil", e.target.value)} /></PAField></React.Fragment>}
        </PASection>

        <PASection title="Emergency contact">
          <PAField label="Name"><input value={form.ecName} onChange={e => set("ecName", e.target.value)} /></PAField>
          <PAField label="Relationship"><input value={form.ecRelationship} onChange={e => set("ecRelationship", e.target.value)} /></PAField>
          <PAField label="Phone"><input type="tel" value={form.ecPhone} onChange={e => set("ecPhone", e.target.value)} /></PAField>
          <PAField label="Alternate phone"><input type="tel" value={form.ecAltPhone} onChange={e => set("ecAltPhone", e.target.value)} /></PAField>
          <PAField label="Email" wide><input type="email" value={form.ecEmail} onChange={e => set("ecEmail", e.target.value)} /></PAField>
          <PAField label="Address line 1" wide><input value={form.ecLine1} onChange={e => set("ecLine1", e.target.value)} /></PAField>
          <PAField label="Address line 2" wide><input value={form.ecLine2} onChange={e => set("ecLine2", e.target.value)} /></PAField>
          <PAField label="City"><input value={form.ecCity} onChange={e => set("ecCity", e.target.value)} /></PAField>
          <PAField label="State"><input value={form.ecState} onChange={e => set("ecState", e.target.value)} /></PAField>
          <PAField label="Postal code"><input value={form.ecPostalCode} onChange={e => set("ecPostalCode", e.target.value)} /></PAField>
          <PAField label="Country"><input value={form.ecCountry} onChange={e => set("ecCountry", e.target.value)} /></PAField>
        </PASection>

        <div className="pa-form-foot"><button type="button" className="pa-btn secondary" onClick={onClose}>Cancel</button><button className="pa-btn primary" disabled={saving}>{saving ? "Saving…" : (isCreate ? "Create patient" : "Save changes")}</button></div>
      </form>
    </PABottomSheet>
  );
}

function PatientRegistrationSheet({ patient, onClose, onSaved }) {
  const [mrn, setMrn] = React.useState("");
  const [scheme, setScheme] = React.useState(patient?.scheme || "ASP");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);

  async function submit(e) {
    e.preventDefault();
    const clean = mrn.trim();
    if (!clean) { setError("MRN is required."); return; }
    if (paMrns(patient).some(entry => entry.mrn === clean)) { setError("This MRN is already in the patient's history."); return; }
    setSaving(true); setError(null);
    try {
      const me = window.api.getIdentity();
      const result = await window.api.addPatientRegistration(paPatientId(patient), {
        mrn: clean, scheme,
        department: patient.department || "Unknown",
        firstState: patient.currentState || "onboarding",
        actorId: me?.userId || me?.id || null,
      });
      onSaved(result?.patient || await window.api.getPatient(paPatientId(patient)));
    } catch (err) {
      setError(err?.status === 409 ? "That MRN is already assigned to another patient." : (err.message || String(err)));
    } finally { setSaving(false); }
  }

  return (
    <PABottomSheet title="Add Registration" subtitle={`${patient?.name || "Patient"} · the new MRN becomes current`} onClose={onClose}>
      <form className="pa-form" onSubmit={submit}>
        {error && <div className="pa-alert error">{error}</div>}
        <PASection title="New registration">
          <PAField label="MRN" wide hint="All registrations stay in the patient's MRN history."><input autoFocus value={mrn} onChange={e => setMrn(e.target.value)} required /></PAField>
          <PAField label="Scheme"><select value={scheme} onChange={e => setScheme(e.target.value)}>{PA_SCHEMES.map(s => <option key={s}>{s}</option>)}</select></PAField>
        </PASection>
        <div className="pa-form-foot"><button type="button" className="pa-btn secondary" onClick={onClose}>Cancel</button><button className="pa-btn primary" disabled={saving}>{saving ? "Adding…" : "Add registration"}</button></div>
      </form>
    </PABottomSheet>
  );
}

function PatientActionsSheet({ patient, onClose, onPatientChanged }) {
  const [fullPatient, setFullPatient] = React.useState(patient);
  const [loading, setLoading] = React.useState(!Array.isArray(patient?.mrnHistory));
  const [error, setError] = React.useState(null);
  const [view, setView] = React.useState("actions");
  const [popupBlocked, setPopupBlocked] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    const uid = paPatientId(patient);
    if (!uid) return;
    window.api.getPatient(uid).then(p => { if (live) setFullPatient(p); }).catch(err => {
      if (live && !Array.isArray(patient?.mrnHistory)) setError(err.message || String(err));
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [paPatientId(patient)]);

  function changed(updated, meta) {
    if (updated) setFullPatient(updated);
    if (onPatientChanged) onPatientChanged(updated, meta);
    if (!meta?.partial) onClose();
  }

  if (view === "edit") return <PatientFormSheet patient={fullPatient} onClose={() => setView("actions")} onSaved={changed} />;
  if (view === "registration") return <PatientRegistrationSheet patient={fullPatient} onClose={() => setView("actions")} onSaved={changed} />;

  const mrns = paMrns(fullPatient);
  const current = fullPatient?.mrn || fullPatient?.latestMrn;

  async function copyOnly(mrn) {
    await window.clip.copy(mrn, "MRN copied");
  }

  async function copyAndOpen(mrn) {
    setPopupBlocked(false);
    const copyPromise = window.clip.copy(mrn, "MRN copied — paste it into Patient Registration No. and tap Go");
    const opened = window.open(PA_NLIS_URL, "_blank");
    if (opened) opened.opener = null;
    else setPopupBlocked(true);
    await copyPromise;
  }

  return (
    <PABottomSheet title={fullPatient?.name || patient?.name || "Patient actions"}
      subtitle="MRNs, NLIS, and patient details" onClose={onClose}>
      {loading && <div className="pa-loading">Loading patient details…</div>}
      {error && <div className="pa-alert error">{error}</div>}
      {!loading && <React.Fragment>
        <div className="pa-action-row">
          <button className="pa-action" onClick={() => setView("edit")}><i className="ti ti-user-edit" /><span><b>Edit details</b><small>Clinical, assignment, procedure, emergency contact</small></span></button>
          <button className="pa-action" onClick={() => setView("registration")}><i className="ti ti-id-badge-2" /><span><b>Add registration</b><small>Add a new active MRN and preserve history</small></span></button>
        </div>

        <div className="pa-section-head"><span>MRN history</span><small>{mrns.length}</small></div>
        {mrns.length === 0 && <div className="pa-empty">No MRNs configured. Add a registration to continue.</div>}
        <div className="pa-mrn-list">
          {mrns.map(entry => {
            const eligible = /^\d{1,11}$/.test(entry.mrn);
            const isCurrent = entry.mrn === current;
            return (
              <article className={`pa-mrn${isCurrent ? " current" : ""}`} key={entry.mrn}>
                <div className="pa-mrn-top">
                  <div><strong>{entry.mrn}</strong><span className="pa-scheme">{entry.scheme || "Unknown"}</span>{isCurrent && <span className="pa-current">Current</span>}</div>
                  {paDisplayDate(entry.date) && <time>{paDisplayDate(entry.date)}</time>}
                </div>
                {!eligible && <p className="pa-warning">NLIS accepts numeric registration numbers up to 11 digits. You can still copy this MRN.</p>}
                <div className="pa-mrn-actions">
                  <button className="pa-btn secondary" onClick={() => copyOnly(entry.mrn)}><i className="ti ti-copy" /> Copy</button>
                  {eligible && <button className="pa-btn nlis" onClick={() => copyAndOpen(entry.mrn)}><i className="ti ti-flask" /> Copy &amp; open NLIS</button>}
                </div>
              </article>
            );
          })}
        </div>

        {popupBlocked && <div className="pa-alert warn">The browser blocked the new tab. The MRN is still copied. <a href={PA_NLIS_URL} target="_blank" rel="noopener noreferrer">Open NLIS manually</a>.</div>}
        <p className="pa-footnote">NLIS opens over hospital HTTP. Paste the copied MRN into “Patient Registration No.” and tap Go.</p>
      </React.Fragment>}
    </PABottomSheet>
  );
}

window.PatientNameLongPress = PatientNameLongPress;
window.PatientActionsSheet = PatientActionsSheet;
window.PatientFormSheet = PatientFormSheet;
