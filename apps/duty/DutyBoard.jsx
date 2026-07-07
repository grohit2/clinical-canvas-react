/* DutyBoard.jsx — "My Duty Today".
   Two views:
   - patients (default): NOW strip (top 3) + patient roster (collapsed cards)
   - urgency: flat list bucketed by overdue/now/pending/later (legacy)
*/

const VIEW_KEY = "duty.view.v1";
const EXPANDED_KEY = "duty.expanded.v1";

function bucketize(items) {
  const now = Date.now();
  const buckets = { overdue: [], now: [], pending: [], later: [], done: [] };
  for (const it of items) {
    const t = it.task;
    if (!t) continue;
    if (t.status === "done" || t.status === "cancelled") { buckets.done.push(t); continue; }
    if (t.status === "pending") { buckets.pending.push(t); continue; }
    if (t.status === "blocked") { buckets.now.push(t); continue; }
    const due = t.dueAt ? new Date(t.dueAt).getTime() : null;
    if (due === null) { buckets.later.push(t); continue; }
    const diffMin = (due - now) / 60000;
    if (diffMin < 0) buckets.overdue.push(t);
    else if (diffMin < 240) buckets.now.push(t);
    else buckets.later.push(t);
  }
  buckets.overdue.sort((a,b) => (a.dueAt||"").localeCompare(b.dueAt||""));
  buckets.now.sort((a,b) => (a.dueAt||"").localeCompare(b.dueAt||""));
  buckets.later.sort((a,b) => (a.dueAt||"").localeCompare(b.dueAt||""));
  buckets.pending.sort((a,b) => (a.dueAt||"~").localeCompare(b.dueAt||"~"));
  buckets.done.sort((a,b) => (b.dueAt||"").localeCompare(a.dueAt||""));
  return buckets;
}

function snapshotsToTasks(items) {
  const byTask = new Map();
  for (const it of items) {
    const cur = byTask.get(it.task_id);
    if (!cur || (it.changed_at || "") > (cur.changed_at || "")) byTask.set(it.task_id, it);
  }
  return [...byTask.values()].map(it => {
    const s = it.task_snapshot || {};
    return {
      task: {
        taskId: it.task_id,
        patientUid: it.patient_uid,
        mrn: it.mrn,
        bedNo: it.bed_no,
        assigneeId: it.assignee_id,
        doctorId: it.doctor_id,
        title: s.title,
        type: s.type,
        subtype: s.subtype,
        status: s.status,
        priority: s.priority,
        dueAt: s.due_at,
        alert: s.alert,
        latestUpdate: { human_summary: s.latest_summary },
        latestChangeAt: it.changed_at,
        version: it.task_version,
      },
    };
  });
}

function groupByPatient(enrichedRows, patientMap) {
  const byUid = new Map();
  for (const r of enrichedRows) {
    const uid = r.task.patientUid;
    if (!uid) continue;
    if (!byUid.has(uid)) byUid.set(uid, []);
    byUid.get(uid).push(r.task);
  }
  // Sort: patients with overdue first, then with open, then clear
  const arr = [];
  for (const [uid, tasks] of byUid) {
    const p = patientMap[uid] || {};
    const open = tasks.filter(t => !["done","cancelled"].includes(t.status));
    const overdue = open.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now()).length;
    arr.push({ uid, patient: { uid, name: p.name, mrn: p.mrn, bedNo: p.bedNo, ward: p.ward }, tasks, openCount: open.length, overdueCount: overdue });
  }
  arr.sort((a, b) => {
    if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
    if (a.openCount !== b.openCount) return b.openCount - a.openCount;
    return (a.patient.name || "").localeCompare(b.patient.name || "");
  });
  return arr;
}

function loadExpanded() {
  try { return new Set(JSON.parse(localStorage.getItem(EXPANDED_KEY) || "[]")); } catch { return new Set(); }
}
function saveExpanded(set) {
  localStorage.setItem(EXPANDED_KEY, JSON.stringify([...set]));
}

function DutyBoard({ me, onOpenTask, onOpenPatient, onChangeIdentity }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [patientMap, setPatientMap] = React.useState({});
  const [error, setError] = React.useState(null);
  const [showDone, setShowDone] = React.useState(false);
  const [filter, setFilter] = React.useState("mine"); // mine | dept
  const [view, setView] = React.useState(() => localStorage.getItem(VIEW_KEY) || "patients");
  const [expanded, setExpanded] = React.useState(loadExpanded);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  async function loadPatientMap() {
    try {
      const list = await window.api.listPatients({});
      const map = {};
      for (const p of list || []) {
        if (p && p.uid) map[p.uid] = { name: p.name, mrn: p.mrn, bedNo: p.bedNo, ward: p.ward };
      }
      setPatientMap(map);
    } catch (e) {
      console.warn("patient map load failed", e);
    }
  }

  async function refresh(opts) {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      let items = [];
      if (filter === "mine") {
        const res = await window.api.latest("assignee", me.userId);
        items = Array.isArray(res) ? res : (res.items || []);
      } else {
        const patients = await window.api.listPatients({ department: me.department });
        const slices = await Promise.all(
          patients.slice(0, 25).map(p => window.api.listPatientTasks(p.uid).catch(() => []))
        );
        items = slices.flat().map(t => ({
          task_id: t.taskId,
          patient_uid: t.patientUid,
          mrn: t.mrn,
          bed_no: t.bedNo,
          assignee_id: t.assigneeId,
          doctor_id: t.doctorId,
          changed_at: t.latestChangeAt || t.updatedAt,
          task_version: t.version,
          task_snapshot: {
            title: t.title, type: t.type, subtype: t.subtype,
            status: t.status, priority: t.priority, due_at: t.dueAt,
            alert: t.alert, latest_summary: (t.latestUpdate || {}).human_summary,
          },
        }));
      }
      setRows(snapshotsToTasks(items));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { refresh(); }, [me.userId, filter]);
  React.useEffect(() => { loadPatientMap(); }, [me.userId]);

  // Checkpoint-driven delta sync (see sync.js): poll the assignee TASKSYNC
  // stream (my task events) and, on the dept filter, the unified department
  // feed (notes / med orders — dept-scoped task and vitals events aren't
  // emitted by the backend yet).
  React.useEffect(() => {
    if (!me?.userId) return;
    const feeds = [
      { key: `duty.changes.ckpt.assignee.${me.userId}`,
        fetch: (after) => window.api.changes("assignee", me.userId, after) },
    ];
    if (filter === "dept" && me.department) {
      feeds.push({ key: `duty.changes.ckpt.dept.${me.department}`,
        fetch: (after) => window.api.getChanges("department", me.department, after, 200) });
    }
    return window.dutySync.startDeltaPoll({
      feeds,
      onChange: () => refresh({ silent: true }),
      intervalMs: 30000,
    });
  }, [me.userId, me.department, filter]);

  const enrichedRows = React.useMemo(() => {
    return rows.map(r => {
      const p = patientMap[r.task.patientUid];
      if (!p) return r;
      return { task: { ...r.task, patientName: p.name, bedNo: r.task.bedNo || p.bedNo, ward: r.task.ward || p.ward } };
    });
  }, [rows, patientMap]);

  const allTasks = enrichedRows.map(r => r.task);
  const buckets = bucketize(enrichedRows);
  const total = enrichedRows.length;

  // Patient view: group + filter
  const patientGroups = React.useMemo(() => {
    let groups = groupByPatient(enrichedRows, patientMap);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      groups = groups.filter(g => {
        const inName = (g.patient.name || "").toLowerCase().includes(q);
        const inBed  = String(g.patient.bedNo || "").toLowerCase().includes(q);
        const inMrn  = (g.patient.mrn || "").toLowerCase().includes(q);
        const inTask = g.tasks.some(t => (t.title || "").toLowerCase().includes(q));
        return inName || inBed || inMrn || inTask;
      });
    }
    return groups;
  }, [enrichedRows, patientMap, search]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = today.toTimeString().slice(0,5);

  const overdueTotal = buckets.overdue.length;
  const dueNowTotal = buckets.now.length + buckets.pending.length;

  function togglePatient(uid) {
    const next = new Set(expanded);
    if (next.has(uid)) next.delete(uid); else next.add(uid);
    setExpanded(next); saveExpanded(next);
  }

  function expandAll() {
    const next = new Set(patientGroups.map(g => g.uid));
    setExpanded(next); saveExpanded(next);
  }
  function collapseAll() {
    setExpanded(new Set()); saveExpanded(new Set());
  }

  return (
    <React.Fragment>
      <TopBar
        title="Duty"
        me={me}
        onChangeIdentity={onChangeIdentity}
      />
      <div className="day-strip dense">
        <span className="dt">{dateStr} · {timeStr}</span>
        <span className="counts-inline">
          {overdueTotal > 0 && <span className="cnt-late inline">{overdueTotal} late</span>}
          {dueNowTotal > 0 && <span className="cnt-now inline">{dueNowTotal} due</span>}
          <CopyButton label="" confirmMsg="Day summary copied" getText={async () => {
            const lines = [`*Duty summary* — ${me.name} · ${dateStr} ${timeStr}`];
            for (const b of ["overdue","now","pending","later"]) {
              if (buckets[b].length === 0) continue;
              lines.push(""); lines.push(`_${b.toUpperCase()}_ (${buckets[b].length})`);
              for (const t of buckets[b]) {
                const due = t.dueAt ? new Date(t.dueAt).toISOString().slice(11,16) : "—";
                const who = t.patientName || t.mrn || "—";
                lines.push(`• ${t.title} · ${who}${t.bedNo ? ` · Bed ${t.bedNo}` : ""} · ${due}`);
              }
            }
            return lines.join("\n");
          }} />
          <span className="live"><span className="dot"></span></span>
        </span>
      </div>

      <div className="filter-row dense hs">
        <button className={`filter-chip ${filter==='mine'?'active':''}`} onClick={() => setFilter("mine")}>
          Mine{filter==='mine'?<span className="count">{total}</span>:null}
        </button>
        <button className={`filter-chip ${filter==='dept'?'active':''}`} onClick={() => setFilter("dept")}>Dept</button>
        <span className="chip-sep"></span>
        <button className={`filter-chip ${view==='patients'?'active':''}`} onClick={() => setView("patients")}>Patient</button>
        <button className={`filter-chip ${view==='urgency'?'active':''}`} onClick={() => setView("urgency")}>Urgency</button>
        <span style={{flex: 1}}></span>
        <button className="filter-chip ghost" onClick={refresh} title="Refresh">↻</button>
      </div>

      {loading && <div className="loader">Loading your duty board…</div>}
      {error && (
        <EmptyState title="Could not load" body={error}>
          <button className="qa-btn" onClick={refresh} style={{maxWidth: 160, margin: "0 auto"}}>Retry</button>
        </EmptyState>
      )}

      {!loading && !error && total === 0 && (
        <EmptyState title="No tasks today" body="Your duty board is empty. New tasks assigned to you will appear here automatically." />
      )}

      {!loading && !error && total > 0 && view === "patients" && (
        <React.Fragment>
          <div className="section-header dense">
            <span className="lbl">PATIENTS · {patientGroups.length}</span>
            <div className="search-inline">
              <input
                type="text"
                placeholder="Search name · bed · MRN · task"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear">×</button>}
            </div>
            {patientGroups.length > 0 && (
              expanded.size > 0
                ? <button className="link-btn" onClick={collapseAll}>collapse</button>
                : <button className="link-btn" onClick={expandAll}>expand</button>
            )}
          </div>

          {patientGroups.length === 0 && (
            <div className="empty" style={{padding: "16px 24px"}}><div className="body">No matching patients.</div></div>
          )}

          {patientGroups.map(g => (
            <PatientCard
              key={g.uid}
              patient={g.patient}
              tasks={g.tasks}
              expanded={expanded.has(g.uid)}
              onToggle={() => togglePatient(g.uid)}
              onOpenTask={onOpenTask}
            />
          ))}

          {buckets.done.length > 0 && (
            <React.Fragment>
              <div className="group-header bucket-done clickable" onClick={() => setShowDone(v => !v)}>
                <span className="dot"></span>
                <span className="label">Done today</span>
                <span className="cnt">{buckets.done.length} {showDone ? "▾" : "▸"}</span>
              </div>
              {showDone && buckets.done.map(t => (
                <TaskRow key={t.taskId} task={t} onOpen={() => onOpenTask(t)} />
              ))}
            </React.Fragment>
          )}
        </React.Fragment>
      )}

      {!loading && !error && total > 0 && view === "urgency" && (
        <React.Fragment>
          {(["overdue","now","pending","later"]).map(b => (
            buckets[b].length > 0 && (
              <React.Fragment key={b}>
                <PriorityHeader bucket={b} count={buckets[b].length} />
                {buckets[b].map(t => (
                  <TaskRow key={t.taskId} task={t} onOpen={() => onOpenTask(t)} />
                ))}
              </React.Fragment>
            )
          ))}

          {buckets.done.length > 0 && (
            <React.Fragment>
              <div className="bucket done" onClick={() => setShowDone(v => !v)} style={{cursor:"pointer"}}>
                <span className="dot"></span>
                <span className="label">Done</span>
                <span className="num">{buckets.done.length} {showDone ? "▾" : "▸"}</span>
              </div>
              {showDone && buckets.done.map(t => (
                <TaskRow key={t.taskId} task={t} onOpen={() => onOpenTask(t)} />
              ))}
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

window.DutyBoard = DutyBoard;
