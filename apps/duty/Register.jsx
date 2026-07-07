/* Register.jsx — Ward Register view.
   Inspired by the paper ward-register: a frozen patient column on the left,
   and shift-style columns sliding underneath it on the right.

   - Frozen left pane: bed/POD-ish chip, name, MRN, ward, brief summary.
   - Sliding right panes: Active, Pending/Blocked, Vitals (recent).
   - Zoom controls (− / 100% / +) scale a CSS var so the whole register
     can be zoomed like paper. Persisted in localStorage.
   - Single horizontal scroller with scroll-snap so swipes land cleanly. */

const ZOOM_KEY = "duty.register.zoom.v1";
const ZOOM_MIN = 0.75, ZOOM_MAX = 1.6, ZOOM_STEP = 0.1;

function loadZoom() {
  const z = parseFloat(localStorage.getItem(ZOOM_KEY));
  if (!isFinite(z) || z < ZOOM_MIN || z > ZOOM_MAX) return 1;
  return z;
}

function bucketTask(t) {
  const s = t.status || "todo";
  if (s === "in_progress" || s === "todo") return "active";
  if (s === "pending" || s === "blocked") return "pending";
  // done / cancelled tasks no longer rendered in the register —
  // the third column is vitals.
  return null;
}

function vitalsAge(recordedAt) {
  if (!recordedAt) return "";
  const ts = new Date(recordedAt).getTime();
  if (!isFinite(ts)) return "";
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const hr = Math.floor(diffMin / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}

function vitalsClock(recordedAt) {
  if (!recordedAt) return "";
  const d = new Date(recordedAt);
  if (!isFinite(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function RegVitalsItem({ v }) {
  const bp = (v.bp_systolic != null && v.bp_diastolic != null)
    ? `${v.bp_systolic}/${v.bp_diastolic}` : null;
  const hr = v.hr != null ? `${v.hr}` : null;
  const spo2 = v.spo2 != null ? `${v.spo2}%` : null;
  const temp = v.temp_c != null ? `${v.temp_c}°` : null;
  const grbs = v.grbs != null ? `g${v.grbs}` : null;
  const parts = [bp, hr, spo2, temp, grbs].filter(Boolean);
  const stale = (() => {
    if (!v.recorded_at) return false;
    return (Date.now() - new Date(v.recorded_at).getTime()) > 6 * 3600 * 1000;
  })();
  return (
    <div className={`reg-vital ${stale ? "stale" : ""}`} title={v.recorded_at || ""}>
      <span className="reg-vital-time">{vitalsClock(v.recorded_at)}</span>
      <span className="reg-vital-vals">{parts.join("  ")}</span>
      <span className="reg-vital-age">{vitalsAge(v.recorded_at)}</span>
    </div>
  );
}

function typeAbbr(type) {
  if (!type) return "·";
  const map = {
    medication: "Rx", vitals: "Vt", labs: "Lb", imaging: "Img",
    photo_upload: "📷", investigation: "Inv", consult: "Con",
    followup: "F/U", generic: "·",
  };
  return map[type] || type.slice(0, 3);
}

function dueShort(due_at) {
  if (!due_at) return "";
  const t = new Date(due_at).getTime();
  const now = Date.now();
  const diff = t - now;
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  if (min < 1) return "now";
  if (min < 60) return diff < 0 ? `${min}m late` : `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return diff < 0 ? `${hr}h late` : `${hr}h`;
  const d = Math.round(hr / 24);
  return diff < 0 ? `${d}d late` : `${d}d`;
}

function RegTaskItem({ t, onTap, interactive }) {
  const isLate = t.due_at && new Date(t.due_at).getTime() < Date.now() &&
    !["done", "cancelled"].includes(t.status);
  const done = t.status === "done";
  const cancelled = t.status === "cancelled";
  const cls = `reg-item ${isLate ? "late" : ""} ${done ? "done" : ""} ${cancelled ? "cancelled" : ""}`;
  const body = (
    <React.Fragment>
      <span className={`reg-abbr type-${t.type || "generic"}`}>{typeAbbr(t.type)}</span>
      <span className="reg-title">{t.title}</span>
      {t.due_at ? <span className={`reg-due ${isLate ? "late" : ""}`}>{dueShort(t.due_at)}</span> : null}
    </React.Fragment>
  );
  // When the row is collapsed, render as a plain div so taps fall through
  // to the row-level expand toggle. Only when the row is expanded do the
  // tasks become real buttons with their own hit area.
  if (interactive) {
    return (
      <button
        className={cls}
        onClick={(e) => { e.stopPropagation(); onTap(t); }}
        title={t.title}
      >
        {body}
      </button>
    );
  }
  return <div className={cls} title={t.title}>{body}</div>;
}

function RegCounts({ items }) {
  if (!items?.length) return null;
  const late = items.filter(t =>
    t.due_at && new Date(t.due_at).getTime() < Date.now() &&
    !["done", "cancelled"].includes(t.status)
  ).length;
  return (
    <span className="reg-counts">
      <span className="n">{items.length}</span>
      {late > 0 && <span className="late">{late}↑</span>}
    </span>
  );
}

function ZoomControls({ zoom, onChange }) {
  const set = (z) => {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
    localStorage.setItem(ZOOM_KEY, String(clamped));
    onChange(clamped);
  };
  return (
    <span className="reg-zoom">
      <button onClick={() => set(zoom - ZOOM_STEP)} aria-label="Zoom out" disabled={zoom <= ZOOM_MIN + 0.001}>−</button>
      <span className="z-val" onClick={() => set(1)} title="Reset zoom">{Math.round(zoom * 100)}%</span>
      <button onClick={() => set(zoom + ZOOM_STEP)} aria-label="Zoom in" disabled={zoom >= ZOOM_MAX - 0.001}>+</button>
    </span>
  );
}

function Register({ me, onOpenTask, onChangeIdentity }) {
  const [patients, setPatients] = React.useState(null);
  const [tasksByUid, setTasksByUid] = React.useState({});
  const [vitalsByUid, setVitalsByUid] = React.useState({});
  const [error, setError] = React.useState(null);
  const [zoom, setZoom] = React.useState(loadZoom);
  const [filter, setFilter] = React.useState("dept"); // dept | all | mine
  const [expandedUid, setExpandedUid] = React.useState(null);
  const scrollerRef = React.useRef(null);

  // Any context change (filter, zoom, refresh) collapses the open row so
  // the user isn't left with a stale expanded patient.
  function changeFilter(f) { setExpandedUid(null); setFilter(f); }
  function changeZoom(z) { setExpandedUid(null); setZoom(z); }

  async function load() {
    setError(null);
    setExpandedUid(null);
    try {
      const ps = await window.api.listPatients({});
      setPatients(ps || []);
      const tasksFetched = {};
      const vitalsFetched = {};
      await Promise.all((ps || []).map(async p => {
        const [tRes, vRes] = await Promise.allSettled([
          window.api.listPatientTasks(p.uid),
          window.api.listVitals(p.uid, 20),
        ]);
        if (tRes.status === "fulfilled") {
          const t = tRes.value;
          tasksFetched[p.uid] = Array.isArray(t) ? t : (t.items || []);
        } else {
          tasksFetched[p.uid] = [];
        }
        if (vRes.status === "fulfilled") {
          const v = vRes.value;
          vitalsFetched[p.uid] = Array.isArray(v) ? v : (v.items || []);
        } else {
          vitalsFetched[p.uid] = [];
        }
      }));
      setTasksByUid(tasksFetched);
      setVitalsByUid(vitalsFetched);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  React.useEffect(() => { load(); }, []);

  // Checkpoint-driven delta sync (see sync.js) — the full load is O(patients)
  // requests, so refetch only when the change feeds report activity.
  // Coverage: my task events (TASKSYNC assignee) + dept notes / med orders
  // (unified feed). Other assignees' task events and vitals aren't
  // dept-scoped in either feed yet — the refresh button still covers those.
  React.useEffect(() => {
    const feeds = [];
    if (me?.userId) feeds.push({
      key: `duty.changes.ckpt.assignee.${me.userId}`,
      fetch: (after) => window.api.changes("assignee", me.userId, after),
    });
    if (me?.department) feeds.push({
      key: `duty.changes.ckpt.dept.${me.department}`,
      fetch: (after) => window.api.getChanges("department", me.department, after, 200),
    });
    if (feeds.length === 0) return;
    return window.dutySync.startDeltaPoll({ feeds, onChange: load, intervalMs: 60000 });
  }, [me?.userId, me?.department]);

  const rows = React.useMemo(() => {
    if (!patients) return null;
    let list = patients.map(p => {
      const tasks = tasksByUid[p.uid] || [];
      const active = [], pending = [];
      for (const t of tasks) {
        const b = bucketTask(t);
        if (b === "active") active.push(t);
        else if (b === "pending") pending.push(t);
      }
      const score = (t) => {
        if (!t.due_at) return Infinity;
        return new Date(t.due_at).getTime();
      };
      active.sort((a, b) => score(a) - score(b));
      pending.sort((a, b) => score(a) - score(b));
      const lateCount = active.filter(t => t.due_at && new Date(t.due_at).getTime() < Date.now()).length;
      const vitals = (vitalsByUid[p.uid] || []).slice().sort(
        (a, b) => new Date(b.recorded_at || 0) - new Date(a.recorded_at || 0)
      );
      return { p, active, pending, vitals, lateCount, openCount: active.length + pending.length };
    });

    if (filter === "dept" && me?.department) {
      list = list.filter(r => (r.p.department || "") === me.department);
    } else if (filter === "mine") {
      list = list.filter(r =>
        [...r.active, ...r.pending].some(t => t.assignee_id === me.userId)
      );
    }

    list.sort((a, b) => {
      if (a.lateCount !== b.lateCount) return b.lateCount - a.lateCount;
      if (a.openCount !== b.openCount) return b.openCount - a.openCount;
      const bedA = String(a.p.bedNo || "zzz"), bedB = String(b.p.bedNo || "zzz");
      return bedA.localeCompare(bedB, undefined, { numeric: true });
    });
    return list;
  }, [patients, tasksByUid, vitalsByUid, filter, me]);

  const jumpTo = (key) => {
    const el = scrollerRef.current?.querySelector(`[data-col="${key}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  const totalPatients = rows?.length || 0;
  const totalLate = (rows || []).reduce((s, r) => s + r.lateCount, 0);
  const totalOpen = (rows || []).reduce((s, r) => s + r.openCount, 0);

  return (
    <React.Fragment>
      <TopBar title="Register" me={me} onChangeIdentity={onChangeIdentity}
        right={<ZoomControls zoom={zoom} onChange={changeZoom} />} />

      <div className="day-strip dense">
        <span className="dt">{totalPatients} patients</span>
        <span className="counts-inline">
          {totalLate > 0 && <span className="cnt-late inline">{totalLate} late</span>}
          {totalOpen > 0 && <span className="cnt-now inline">{totalOpen} open</span>}
        </span>
      </div>

      <div className="filter-row dense hs">
        <button className={`filter-chip ${filter === 'dept' ? 'active' : ''}`} onClick={() => changeFilter("dept")}>My dept</button>
        <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => changeFilter("all")}>All</button>
        <button className={`filter-chip ${filter === 'mine' ? 'active' : ''}`} onClick={() => changeFilter("mine")}>Mine</button>
        <span style={{ flex: 1 }}></span>
        <button className="filter-chip ghost" onClick={() => jumpTo("active")}>Active</button>
        <button className="filter-chip ghost" onClick={() => jumpTo("pending")}>Pending</button>
        <button className="filter-chip ghost" onClick={() => jumpTo("vitals")}>Vitals</button>
        <button className="filter-chip ghost" onClick={load} title="Refresh">↻</button>
      </div>

      {error && <EmptyState title="Could not load" body={error} />}
      {!patients && !error && <div className="loader">Loading register…</div>}
      {patients && rows && rows.length === 0 && (
        <EmptyState title="No patients" body="No patients match the current filter." />
      )}

      {rows && rows.length > 0 && (
        <div className="reg-scroll" ref={scrollerRef} style={{ "--zoom": zoom }}>
          <div className="reg-grid">
            <div className="reg-head-row">
              <div className="reg-cell reg-frozen reg-head">
                <span className="reg-head-label">Patient · Bed · Summary</span>
              </div>
              <div className="reg-cell reg-col reg-head" data-col="active">
                <span className="reg-head-label active">Active — to do · in progress</span>
              </div>
              <div className="reg-cell reg-col reg-head" data-col="pending">
                <span className="reg-head-label pending">Pending · blocked</span>
              </div>
              <div className="reg-cell reg-col reg-head" data-col="vitals">
                <span className="reg-head-label vitals">Vitals — recent</span>
              </div>
            </div>

            {rows.map(({ p, active, pending, vitals, lateCount, openCount }) => {
              const isExpanded = expandedUid === p.uid;
              const toggle = () => setExpandedUid(isExpanded ? null : p.uid);
              return (
                <div
                  key={p.uid}
                  className={`reg-row ${isExpanded ? "expanded" : ""}`}
                  onClick={toggle}
                  role="button"
                  tabIndex={0}
                >
                  <div className="reg-cell reg-frozen">
                    <div className="reg-frozen-line1">
                      <span className="reg-chev">{isExpanded ? "▾" : "▸"}</span>
                      <span className="reg-bed">{p.bedNo ? `B${p.bedNo}` : (p.ward || "—")}</span>
                      <button
                        className="reg-name"
                        onClick={(e) => { e.stopPropagation(); onOpenTask({ patientUid: p.uid, _patientNav: true }); }}
                      >{p.name || "?"}</button>
                    </div>
                    {p.ward && p.bedNo && <div className="reg-frozen-line2">{p.ward}</div>}
                    <div className="reg-frozen-line3">
                      {lateCount > 0 && <span className="chip late">{lateCount} late</span>}
                      {openCount > 0 && <span className="chip open">{openCount} open</span>}
                      {vitals.length > 0 && <span className="chip vitals">{vitals.length}♡</span>}
                      {isExpanded && (
                        <span onClick={e => e.stopPropagation()}>
                          <CopyButton
                            label="AI ctx"
                            style={{ height: '20px', padding: '0 7px', fontSize: '10px' }}
                            getText={() => window.buildAIContext ? window.buildAIContext(p, [...active, ...pending], vitals) : ""}
                            confirmMsg="Context copied"
                          />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="reg-cell reg-col" data-col-row="active">
                    <div className="reg-col-head">
                      <span className="reg-sub active">Active</span>
                      <RegCounts items={active} />
                    </div>
                    {active.length === 0 && <span className="reg-empty">—</span>}
                    {active.map(t => <RegTaskItem key={t.taskId} t={t} onTap={onOpenTask} interactive={isExpanded} />)}
                  </div>

                  <div className="reg-cell reg-col" data-col-row="pending">
                    <div className="reg-col-head">
                      <span className="reg-sub pending">Pending</span>
                      <RegCounts items={pending} />
                    </div>
                    {pending.length === 0 && <span className="reg-empty">—</span>}
                    {pending.map(t => <RegTaskItem key={t.taskId} t={t} onTap={onOpenTask} interactive={isExpanded} />)}
                  </div>

                  <div className="reg-cell reg-col reg-col-last" data-col-row="vitals">
                    <div className="reg-col-head">
                      <span className="reg-sub vitals">Vitals</span>
                      {vitals.length > 0 && (
                        <span className="reg-counts">
                          <span className="n">{vitals.length}</span>
                        </span>
                      )}
                    </div>
                    {vitals.length === 0 && <span className="reg-empty">—</span>}
                    {vitals.map(v => <RegVitalsItem key={v.vitals_id || v.recorded_at} v={v} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

window.Register = Register;
