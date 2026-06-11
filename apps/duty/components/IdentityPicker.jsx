/* IdentityPicker.jsx — pick "who am I" from existing staff, or create a new doctor.
   Persists to localStorage via api.setIdentity. */

function IdentityPicker({ onPicked, onClose, defaultDepartment = "General Surgery" }) {
  const [staff, setStaff] = React.useState(null);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", role: "junior_doctor", department: defaultDepartment });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      setErr(null);
      try {
        const list = await window.api.listStaff({ department: defaultDepartment });
        setStaff(list || []);
      } catch (e) {
        setErr(e.message || String(e));
        setStaff([]);
      }
    })();
  }, [defaultDepartment]);

  function pick(s) {
    const me = { userId: s.userId, name: s.name, role: s.role || "doctor", department: s.department || defaultDepartment };
    window.api.setIdentity(me);
    onPicked(me);
  }

  async function createAndPick() {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const created = await window.api.createDoctor({
        name: form.name.trim(), role: form.role, department: form.department || defaultDepartment, email: null,
      });
      // doctor response shape varies; try a few keys
      const d = created.doctor || created;
      const me = {
        userId: d.doctorId || d.userId || d.id || form.name.trim().toLowerCase(),
        name: d.name || form.name.trim(),
        role: d.role || form.role,
        department: d.department || form.department,
      };
      window.api.setIdentity(me);
      onPicked(me);
    } catch (e) {
      window.clip.showToast("Couldn't create doctor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="identity-modal" onClick={(e) => { if (e.target.classList.contains("identity-modal")) onClose && onClose(); }}>
      <div className="identity-card">
        <h3>Who are you?</h3>
        <p className="help">Pick yourself from the staff list. Your tasks come from the duty board scoped to your assignee id.</p>
        <div className="identity-list">
          {staff === null && !err && <div className="loader">Loading staff…</div>}
          {err && (
            <div className="empty" style={{padding: "12px 0"}}>
              <div className="title" style={{color: "#f28b82"}}>Could not load staff</div>
              <div className="body" style={{fontFamily: "monospace", fontSize: 11, color: "#f28b82"}}>{err}</div>
              <div className="body" style={{marginTop: 8}}>Check the browser console (Cmd+Option+I) for the full request, then share with your engineer.</div>
            </div>
          )}
          {staff !== null && !err && staff.length === 0 && (
            <div className="empty" style={{padding: "12px 0"}}>
              <div className="title">No staff yet</div>
              <div className="body">Create your doctor profile below to get started.</div>
            </div>
          )}
          {staff && staff.map((s, i) => (
            <button key={s.userId || i} className="identity-item" onClick={() => pick(s)}>
              <div className="who">
                <div className="name">{s.name || "Unnamed"}</div>
                <div className="sub">{s.department || "—"}{s.email ? ` · ${s.email}` : ""}</div>
              </div>
              <div className="role">{s.role || "doctor"}</div>
            </button>
          ))}
        </div>

        {!creating ? (
          <button className="copy-btn" style={{marginTop: 14, alignSelf: "flex-start"}} onClick={() => setCreating(true)}>
            + Add new doctor
          </button>
        ) : (
          <div className="new-doc">
            <input
              placeholder="Name (e.g. Kamali)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              style={{background:'transparent',color:'#e8eaed',border:'1px solid #3c4043',borderRadius:4,padding:'8px 10px',font:'400 13px Google Sans, sans-serif'}}
            >
              <option value="junior_doctor">junior_doctor</option>
              <option value="resident">resident</option>
              <option value="doctor">doctor</option>
              <option value="consultant">consultant</option>
              <option value="nurse">nurse</option>
            </select>
            <input
              placeholder="Department"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
            <div className="actions">
              <button className="secondary" onClick={() => setCreating(false)}>Cancel</button>
              <button className="primary" onClick={createAndPick} disabled={busy || !form.name.trim()}>{busy ? "Saving…" : "Create & continue"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.IdentityPicker = IdentityPicker;
