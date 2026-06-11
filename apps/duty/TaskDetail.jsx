/* TaskDetail.jsx — single task drill-in.
   Sections: header (title + tags) · copy bar · details · history · quick actions. */

function fmtTs(s) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toISOString().slice(11,16);
  } catch { return s; }
}

function TaskDetail({ me, patientId, taskId, onBack, onChanged }) {
  const [data, setData] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);

  async function refresh() {
    setError(null);
    try {
      const r = await window.api.getTask(patientId, taskId, true);
      setData(r);
    } catch (e) {
      setError(e.message || String(e));
    }
  }
  React.useEffect(() => { refresh(); }, [patientId, taskId]);

  async function act(action) {
    if (!data?.task) return;
    setBusy(true);
    try {
      const res = await window.api.lifecycle(patientId, taskId, action, {
        expectedVersion: data.task.version,
        clientMutationId: `${me.userId}:${taskId}:${action}:${Date.now()}`,
      });
      window.clip.showToast(`Task ${action}`);
      if (res && res.task) setData({ task: res.task, updates: data.updates });
      await refresh();
      onChanged && onChanged();
    } catch (e) {
      window.clip.showToast(e.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <React.Fragment>
        <TopBar title="Task" onBack={onBack} />
        <EmptyState title="Could not load" body={error}>
          <button className="qa-btn" onClick={refresh} style={{maxWidth: 160, margin: "0 auto"}}>Retry</button>
        </EmptyState>
      </React.Fragment>
    );
  }
  if (!data) {
    return (
      <React.Fragment>
        <TopBar title="Task" onBack={onBack} />
        <div className="loader">Loading task…</div>
      </React.Fragment>
    );
  }

  const t = data.task;
  const updates = (data.updates || []).slice().sort((a,b) => (b.changed_at||"").localeCompare(a.changed_at||""));

  return (
    <div className="has-actions">
      <TopBar title="Task" onBack={onBack} />
      <div className="detail-header">
        <div className="dh-title">{t.title}</div>
        <div className="dh-row">
          <span className="pname">{t.mrn || "—"}</span>
          {t.bedNo ? <React.Fragment><span className="sep">·</span><span>Bed {t.bedNo}</span></React.Fragment> : null}
          <span className="sep">·</span>
          <span>{t.type}{t.subtype ? ` / ${t.subtype}` : ""}</span>
        </div>
        <div className="dh-row">
          <span className={`status status-${t.status}`}>{t.status.replace("_"," ")}</span>
          <span className="sep">·</span>
          <span>v{t.version || 1}</span>
          <span className="sep">·</span>
          <span>{t.dueAt ? `Due ${fmtTs(t.dueAt)}` : "No due"}</span>
        </div>
        <div className="dh-tags">
          <span className={`tag priority-${t.priority || 'routine'}`}>{(t.priority || "routine").toUpperCase()}</span>
          {t.verifyStatus && t.verifyStatus !== "not_required" && (
            <span className="tag verify-needed">{t.verifyStatus.replace(/_/g, " ").toUpperCase()}</span>
          )}
          {t.assigneeName ? <span className="tag">→ {t.assigneeName}</span> : null}
        </div>
      </div>

      <div className="copy-bar">
        <CopyButton label="Task" getText={async () => {
          const r = await window.api.copyTask(patientId, taskId, "human");
          return r.content;
        }} />
        <CopyButton label="Agent ctx" getText={async () => {
          const r = await window.api.copyTask(patientId, taskId, "agent");
          return JSON.stringify(r.content, null, 2);
        }} />
        <CopyButton label="ID" text={taskId} />
      </div>

      <div className="section-header">
        Details
        <span className="meta">{updates.length} updates</span>
      </div>
      <div className="kv-row"><span className="label">Patient MRN</span><span className="value">{t.mrn || "—"}</span></div>
      <div className="kv-row"><span className="label">Patient UID</span><span className="value" style={{fontSize:11, fontFamily:'monospace'}}>{(t.patientUid || "").slice(0, 18)}…</span></div>
      <div className="kv-row"><span className="label">Type</span><span className="value">{t.type}{t.subtype ? ` / ${t.subtype}` : ""}</span></div>
      <div className="kv-row"><span className="label">Status</span><span className="value">{t.status}</span></div>
      <div className="kv-row"><span className="label">Priority</span><span className="value">{t.priority || "routine"}</span></div>
      <div className="kv-row"><span className="label">Due</span><span className="value">{t.dueAt ? new Date(t.dueAt).toISOString().slice(0,16).replace("T"," ") : "—"}</span></div>
      <div className="kv-row"><span className="label">Assignee</span><span className="value">{t.assigneeName || t.assigneeId || "—"}</span></div>
      <div className="kv-row"><span className="label">Doctor</span><span className="value">{t.doctorId || "—"}</span></div>

      <div className="section-header">History</div>
      {updates.length === 0 && <div className="empty" style={{padding:"16px 24px"}}><div className="body">No updates yet.</div></div>}
      {updates.map(u => (
        <div className="update-row" key={u.update_id}>
          <div className="ts">{fmtTs(u.changed_at)}</div>
          <div className="body">
            <div className="ct">{u.change_type.replace(/_/g," ")} → {u.status_after || t.status}</div>
            <div className="summary">{u.human_summary || "—"}</div>
            <div className="actor">{u.actor_name || u.actor_id || "system"}</div>
          </div>
        </div>
      ))}

      <QuickActions task={t} onAction={(a) => !busy && act(a)} />
    </div>
  );
}

window.TaskDetail = TaskDetail;
