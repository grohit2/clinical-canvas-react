/* PatientsList.jsx — global Patients tab.
   Lists all active patients, with task counts joined in. Tap → open the
   PatientTasks view for that patient. */

function PatientsList({ me, onOpenPatient, onChangeIdentity }) {
  const [patients, setPatients] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("all"); // all | mine | overdue
  const [taskCountsByUid, setTaskCountsByUid] = React.useState({});

  async function loadPatients() {
    setError(null);
    try {
      const list = await window.api.listPatients({});
      setPatients(list || []);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function loadMyTaskCounts() {
    if (!me?.userId) return;
    try {
      const res = await window.api.latest("assignee", me.userId);
      const items = Array.isArray(res) ? res : (res.items || []);
      const byTask = new Map();
      for (const it of items) {
        if (!it.task_id) continue;
        const cur = byTask.get(it.task_id);
        if (!cur || (it.changed_at || "") > (cur.changed_at || "")) byTask.set(it.task_id, it);
      }
      const counts = {};
      const now = Date.now();
      for (const it of byTask.values()) {
        const s = it.task_snapshot || {};
        if (["done","cancelled"].includes(s.status)) continue;
        const uid = it.patient_uid;
        if (!uid) continue;
        if (!counts[uid]) counts[uid] = { open: 0, overdue: 0 };
        counts[uid].open += 1;
        if (s.due_at && new Date(s.due_at).getTime() < now) counts[uid].overdue += 1;
      }
      setTaskCountsByUid(counts);
    } catch (e) {
      console.warn("task count load failed", e);
    }
  }

  React.useEffect(() => { loadPatients(); }, []);
  React.useEffect(() => { loadMyTaskCounts(); }, [me.userId]);

  const enriched = React.useMemo(() => {
    if (!patients) return null;
    return patients.map(p => ({
      ...p,
      taskCounts: taskCountsByUid[p.uid] || { open: 0, overdue: 0 },
    }));
  }, [patients, taskCountsByUid]);

  const filtered = React.useMemo(() => {
    let list = enriched || [];
    if (filter === "mine") {
      list = list.filter(p => p.taskCounts.open > 0);
    } else if (filter === "overdue") {
      list = list.filter(p => p.taskCounts.overdue > 0);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.mrn || "").toLowerCase().includes(q) ||
        String(p.bedNo || "").toLowerCase().includes(q) ||
        (p.department || "").toLowerCase().includes(q)
      );
    }
    // Sort: overdue first, then by open task count, then by name
    list = [...list].sort((a, b) => {
      if (a.taskCounts.overdue !== b.taskCounts.overdue) return b.taskCounts.overdue - a.taskCounts.overdue;
      if (a.taskCounts.open !== b.taskCounts.open) return b.taskCounts.open - a.taskCounts.open;
      return (a.name || "").localeCompare(b.name || "");
    });
    return list;
  }, [enriched, filter, search]);

  const overdueTotal = (enriched || []).reduce((s, p) => s + p.taskCounts.overdue, 0);
  const openTotal = (enriched || []).reduce((s, p) => s + p.taskCounts.open, 0);

  return (
    <React.Fragment>
      <TopBar title="Patients" me={me} onChangeIdentity={onChangeIdentity} />

      <div className="day-strip dense">
        <span className="dt">{(enriched || []).length} active</span>
        <span className="counts-inline">
          {overdueTotal > 0 && <span className="cnt-late inline">{overdueTotal} late</span>}
          {openTotal > 0 && <span className="cnt-now inline">{openTotal} open</span>}
        </span>
      </div>

      <div className="filter-row dense hs">
        <button className={`filter-chip ${filter==='all'?'active':''}`} onClick={() => setFilter("all")}>
          All
        </button>
        <button className={`filter-chip ${filter==='mine'?'active':''}`} onClick={() => setFilter("mine")}>
          With my tasks
        </button>
        <button className={`filter-chip ${filter==='overdue'?'active':''}`} onClick={() => setFilter("overdue")}>
          Overdue
        </button>
        <span style={{flex: 1}}></span>
        <button className="filter-chip ghost" onClick={() => { loadPatients(); loadMyTaskCounts(); }} title="Refresh">↻</button>
      </div>

      <div className="section-header dense">
        <div className="search-inline">
          <input
            type="text"
            placeholder="Search name · bed · MRN · department"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear">×</button>}
        </div>
      </div>

      {error && <EmptyState title="Could not load" body={error} />}
      {!patients && !error && <div className="loader">Loading patients…</div>}
      {patients && filtered.length === 0 && (
        <EmptyState title="No patients" body={search ? "Try a different search." : "No active patients to show."} />
      )}

      {filtered.map(p => (
        <PatientListRow
          key={p.uid}
          patient={p}
          taskCounts={p.taskCounts}
          onOpen={() => onOpenPatient(p)}
        />
      ))}
    </React.Fragment>
  );
}

window.PatientsList = PatientsList;
