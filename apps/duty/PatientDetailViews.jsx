/* PatientDetailViews.jsx — view panels for the patient detail screen.
   Globals: PDNotesView, PDTasksView, PDMedsView, PDRoundsView
   Loaded before PatientTasks.jsx; no import/export. */

// ── Local helpers ────────────────────────────────────────────────────────────

function pdDayLabel(iso) {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "—";
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yest))  return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function pdClock(iso) {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function pdTrend(cur, prev) {
  if (cur == null || prev == null) return null;
  const c = parseFloat(cur), p = parseFloat(prev);
  if (isNaN(c) || isNaN(p)) return null;
  if (c > p) return "up";
  if (c < p) return "dn";
  return "flat";
}

// Vital chip used in the notes obs row
function PDVcInline({ l, n, u, prevN }) {
  if (n == null || n === "") return null;
  const tr = pdTrend(n, prevN);
  return (
    <span className="pd-vc">
      <span className="l">{l}</span>
      <span className="n">{n}</span>
      {u && <span className="u">{u}</span>}
      {tr && <span className={`tr pd-tr-${tr}`}>{tr === "up" ? "↑" : tr === "dn" ? "↓" : "·"}</span>}
    </span>
  );
}

// Inline obs vitals row (in notes feed)
function PDNvRow({ v, prev }) {
  const bp = (v.bp_systolic != null && v.bp_diastolic != null)
    ? `${v.bp_systolic}/${v.bp_diastolic}` : null;
  const bpPrev = (prev?.bp_systolic != null && prev?.bp_diastolic != null)
    ? `${prev.bp_systolic}/${prev.bp_diastolic}` : null;
  return (
    <div className="pd-nvrow">
      <span className="vt pd-chip pd-c-obs">OBS</span>
      <span style={{fontSize:11, color:"var(--pd-f2)", whiteSpace:"nowrap"}}>
        {pdClock(v.recorded_at)}
        {v.recorded_by_name ? ` · ${v.recorded_by_name}` : ""}
      </span>
      {bp && <PDVcInline l="BP" n={bp} prevN={bpPrev} />}
      <PDVcInline l="HR"   n={v.hr}     u=""   prevN={prev?.hr} />
      <PDVcInline l="SpO₂" n={v.spo2}   u="%"  prevN={prev?.spo2} />
      <PDVcInline l="T"    n={v.temp_c} u="°"  prevN={prev?.temp_c} />
      <PDVcInline l="G"    n={v.grbs}   u=""   prevN={prev?.grbs} />
      <PDVcInline l="RR"   n={v.rr}     u=""   prevN={prev?.rr} />
    </div>
  );
}

const NOTE_TYPE_LABELS = {
  progress:"Progress", round:"Round", imaging:"Imaging",
  lab:"Lab", surgery:"Surgery", anaesthesia:"Anaes", nursing:"Nursing",
};

function pdNoteTypeChip(noteType) {
  if (!noteType) return null;
  const cls = noteType === "nursing" ? "pd-c-nur" : "pd-c-obs";
  const label = NOTE_TYPE_LABELS[noteType] || noteType;
  return <span className={`pd-chip ${cls}`}>{label}</span>;
}

function pdStatusChip(status) {
  if (status === "final") return <span className="pd-chip pd-c-fin">FINAL</span>;
  if (status === "draft") return <span className="pd-chip" style={{background:"rgba(255,255,255,.07)",color:"var(--pd-f2)"}}>DRAFT</span>;
  return null;
}

// ── PDNoteCard ────────────────────────────────────────────────────────────────

function PDNoteCard({ note, onAck }) {
  const [open, setOpen] = React.useState(false);
  const needsAck = !note.acknowledge && note.status === "final";
  const firstLine = (note.text || "").split("\n")[0] || "(no text)";
  return (
    <div className={`pd-note${open ? " open" : ""}`}>
      <div className="pd-nh" onClick={() => setOpen(v => !v)}>
        <div className="pd-nh-r1">
          <span className="pd-nt">{pdClock(note.createdAt)}</span>
          <span className="pd-nw">{note.author?.name || "Unknown"}</span>
          {pdStatusChip(note.status)}
          {pdNoteTypeChip(note.noteType)}
          {needsAck && <span className="pd-chip pd-c-ack">ACK?</span>}
          <i className={`ti ${open ? "ti-chevron-down" : "ti-chevron-right"} pd-nchev`} />
        </div>
        {!open && <span className="pd-nl">{firstLine}</span>}
      </div>
      {open && (
        <div className="pd-nbody">
          <div className="pd-nfull">
            {(note.text || "").split("\n").map((ln, i) => (
              <React.Fragment key={i}>{ln}{i < (note.text||"").split("\n").length - 1 && <br/>}</React.Fragment>
            ))}
          </div>
          {note.sections && (
            <div style={{marginTop:6, fontSize:12, color:"var(--pd-f1)", lineHeight:1.5}}>
              {note.sections.subjective && <div><b>S:</b> {note.sections.subjective}</div>}
              {note.sections.objective  && <div><b>O:</b> {note.sections.objective}</div>}
              {note.sections.assessment && <div><b>A:</b> {note.sections.assessment}</div>}
              {note.sections.plan       && <div><b>P:</b> {note.sections.plan}</div>}
            </div>
          )}
          {needsAck && (
            <button
              className="pd-hmx-pill"
              style={{marginTop:10}}
              onClick={e => { e.stopPropagation(); onAck(note.pnId); }}
            >
              Acknowledge
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── PDNotesView ───────────────────────────────────────────────────────────────

function PDNotesView({ notes, vitals, onAck }) {
  const [filter, setFilter] = React.useState("all");

  const noteList  = notes  || [];
  const vitalList = vitals || [];

  const hasLegacy = noteList.some(n => n.kind === "legacy");
  const hasVitals = vitalList.length > 0;
  const noteTypes = [...new Set(noteList.filter(n => n.noteType).map(n => n.noteType))];
  const chips = ["all", ...noteTypes, ...(hasVitals ? ["obs"] : []), ...(hasLegacy ? ["legacy"] : [])];

  const feed = [];
  noteList.forEach(n => feed.push({ kind: "note",   ts: n.createdAt || "", data: n }));
  vitalList.forEach(v => feed.push({ kind: "vitals", ts: v.recorded_at || "", data: v }));

  const filtered = (() => {
    if (filter === "all")    return feed;
    if (filter === "obs")    return feed.filter(f => f.kind === "vitals");
    if (filter === "legacy") return feed.filter(f => f.kind === "note" && f.data.kind === "legacy");
    return feed.filter(f => f.kind === "note" && f.data.noteType === filter);
  })();

  const sorted = [...filtered].sort((a, b) => (b.ts > a.ts ? 1 : b.ts < a.ts ? -1 : 0));

  // Group by day
  const groups = [];
  let curGroup = null;
  sorted.forEach(item => {
    const label = pdDayLabel(item.ts);
    if (!curGroup || curGroup.label !== label) {
      curGroup = { label, items: [] };
      groups.push(curGroup);
    }
    curGroup.items.push(item);
  });

  // Sorted vitals newest-first for trend comparison
  const sortedVitals = [...vitalList].sort((a, b) =>
    new Date(b.recorded_at || 0) - new Date(a.recorded_at || 0));

  return (
    <div>
      <div className="pd-frow">
        {chips.map(c => (
          <button key={c}
            className={`pd-fchip${filter === c ? " active" : ""}`}
            onClick={() => setFilter(c)}
          >
            {c === "all" ? "All" : NOTE_TYPE_LABELS[c] || (c.charAt(0).toUpperCase() + c.slice(1))}
          </button>
        ))}
      </div>
      {groups.length === 0 && (
        <EmptyState title="No notes" body="Add a note with the + button." />
      )}
      {groups.map(g => (
        <React.Fragment key={g.label}>
          <div className="pd-sec">{g.label} <span className="c">{g.items.length}</span></div>
          {g.items.map((item, i) => {
            if (item.kind === "vitals") {
              const idx = sortedVitals.findIndex(v =>
                (v.vitals_id && v.vitals_id === item.data.vitals_id) ||
                v.recorded_at === item.data.recorded_at
              );
              const prev = idx >= 0 ? sortedVitals[idx + 1] || null : null;
              return <PDNvRow key={`v-${item.data.vitals_id || item.ts || i}`} v={item.data} prev={prev} />;
            }
            return (
              <PDNoteCard key={item.data.pnId || `n-${i}`} note={item.data} onAck={onAck} />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── PDTasksView ───────────────────────────────────────────────────────────────

function pdAbbr(type) {
  if (!type) return { text: "GEN", cls: "pd-ab-gen" };
  if (type === "investigation" || type === "report_followup" || type === "lab_followup")
    return { text: "INV", cls: "pd-ab-inv" };
  if (type === "medication") return { text: "MED", cls: "pd-ab-med" };
  if (type === "photo_upload") return { text: "PHO", cls: "pd-ab-pho" };
  return { text: type.slice(0, 3).toUpperCase(), cls: "pd-ab-gen" };
}

function PDTaskRow({ task, onOpenTask }) {
  const ab = pdAbbr(task.type);
  const isDone = task.status === "done";
  const isLate = !isDone && task.dueAt && new Date(task.dueAt).getTime() < Date.now();
  let dueStr = "—";
  if (task.dueAt) {
    const d = new Date(task.dueAt);
    if (isLate) {
      const hrs = Math.round((Date.now() - d.getTime()) / 3600000);
      dueStr = `${hrs}h late`;
    } else {
      dueStr = d.toISOString().slice(11, 16);
    }
  }
  return (
    <div className={`pd-trow${isDone ? " dn" : ""}`} onClick={() => onOpenTask(task)}>
      <span className={`pd-abbr ${ab.cls}`}>{ab.text}</span>
      <span className="pd-ttl">{task.title}</span>
      <span className={`pd-due${isLate ? " late" : ""}`}>{dueStr}</span>
    </div>
  );
}

function PDTasksView({ tasks, onOpenTask }) {
  const all = tasks || [];
  const openTasks = all.filter(t => ["todo","in_progress","blocked"].includes(t.status));
  const pendTasks = all.filter(t => t.status === "pending");
  const doneTasks = all.filter(t => t.status === "done");
  const [showDone, setShowDone] = React.useState(false);

  if (all.length === 0) return <EmptyState title="No tasks" body="All caught up." />;

  return (
    <div>
      {openTasks.length > 0 && (
        <React.Fragment>
          <div className="pd-grp"><span className="gd yel" /><span>Open</span><span className="gc">{openTasks.length}</span></div>
          {openTasks.map(t => <PDTaskRow key={t.taskId} task={t} onOpenTask={onOpenTask} />)}
        </React.Fragment>
      )}
      {pendTasks.length > 0 && (
        <React.Fragment>
          <div className="pd-grp"><span className="gd blu" /><span>Pending</span><span className="gc">{pendTasks.length}</span></div>
          {pendTasks.map(t => <PDTaskRow key={t.taskId} task={t} onOpenTask={onOpenTask} />)}
        </React.Fragment>
      )}
      {doneTasks.length > 0 && (
        <React.Fragment>
          <div className="pd-grp" style={{cursor:"pointer"}} onClick={() => setShowDone(v => !v)}>
            <span className="gd done" /><span>Done today</span>
            <span className="gc">{doneTasks.length} {showDone ? "▾" : "▸"}</span>
          </div>
          {showDone && doneTasks.map(t => <PDTaskRow key={t.taskId} task={t} onOpenTask={onOpenTask} />)}
        </React.Fragment>
      )}
    </div>
  );
}

// ── PDMedsView ────────────────────────────────────────────────────────────────

function PDSlot({ slot, medId, patientId, onRefresh }) {
  const st = slot.status || "pending";
  const isOverdue = st === "overdue" || (st === "pending" && slot.overdue);
  const isDue     = st === "pending" && !slot.overdue;
  const isGiven   = st === "given" || st === "administered";
  const isHeld    = st === "withheld" || st === "held";

  let cls = "pd-hd", icon = null;
  if (isGiven)         { cls = "pd-gv"; icon = "ti-check"; }
  else if (isOverdue)  { cls = "pd-ov"; icon = "ti-alert-triangle"; }
  else if (isDue)      { cls = "pd-du"; }
  else if (isHeld)     { cls = "pd-hd"; }

  const canTap = isDue || isOverdue;

  async function handleTap(e) {
    e.stopPropagation();
    if (!canTap) return;
    if (!window.confirm(`Mark ${slot.time} as given?`)) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      await window.api.marAct(patientId, { medId, date: today, time: slot.time, action: "given" });
      onRefresh();
    } catch(err) {
      alert("Could not mark given: " + (err.message || err));
    }
  }

  return (
    <button className={`pd-slot ${cls}`} onClick={canTap ? handleTap : undefined}
      disabled={!canTap} style={canTap ? {} : {cursor:"default"}}>
      {icon && <i className={`ti ${icon}`} />}
      {slot.time}
    </button>
  );
}

function PDMedsView({ patientId, medsDashboard, medOrders, onRefresh }) {
  if (!medsDashboard && !medOrders) {
    return <div style={{padding:"20px 14px", color:"var(--pd-f2)"}}>Loading medications…</div>;
  }

  const cats = medsDashboard?.categories || {};
  const activeBuckets = [
    ...(cats.regular  || []),
    ...(cats.infusion || []),
    ...(cats.narcotic || []),
    ...(cats.stat     || []),
    ...(cats.sos      || []),
  ];

  const activeOrders = (medOrders || []).filter(
    o => !["stopped","cancelled","completed"].includes(o.status || o.effective_status)
  );

  return (
    <div>
      <div className="pd-sec">MAR · Today
        {medsDashboard?.counts && (
          <span className="c">
            {medsDashboard.counts.given} given · {medsDashboard.counts.due} due
            {medsDashboard.counts.overdue > 0 ? ` · ${medsDashboard.counts.overdue} overdue` : ""}
          </span>
        )}
      </div>
      {activeBuckets.length === 0 && (
        <EmptyState title="No meds scheduled today" body="Active med orders appear here." />
      )}
      {activeBuckets.map((entry, idx) => (
        <div className="pd-drug" key={`${entry.med?.med_id || idx}`}>
          <div className="pd-dn2">
            {entry.med?.drug_name || "—"}
            <span className="d"> · {entry.med?.route} · {entry.med?.schedule_label}</span>
          </div>
          <div className="pd-slots">
            {(entry.slots || []).length > 0
              ? (entry.slots || []).map((s, si) => (
                  <PDSlot key={`${entry.med?.med_id}-${s.time}-${si}`}
                    slot={s} medId={entry.med?.med_id}
                    patientId={patientId} onRefresh={onRefresh} />
                ))
              : <span className="pd-slot pd-hd">{entry.med?.schedule_label || "prn"}</span>
            }
          </div>
        </div>
      ))}
      {(cats.stopped || []).length > 0 && (
        <React.Fragment>
          <div className="pd-sec" style={{opacity:.55}}>Stopped</div>
          {(cats.stopped || []).slice(0, 5).map((entry, idx) => (
            <div className="pd-drug" key={`stopped-${idx}`} style={{opacity:.4}}>
              <div className="pd-dn2">{entry.med?.drug_name} <span className="d">stopped</span></div>
            </div>
          ))}
        </React.Fragment>
      )}
      {activeOrders.length > 0 && (
        <React.Fragment>
          <div className="pd-sec">Active orders</div>
          {activeOrders.slice(0, 12).map((o, i) => (
            <div className="pd-drug" key={o.med_id || o.medId || i}>
              <div className="pd-dn2">
                {o.drug?.name || o.drug_name || "—"}
                <span className="d"> · {o.route} · {o.schedule_label || o.category}</span>
              </div>
            </div>
          ))}
        </React.Fragment>
      )}
    </div>
  );
}

// ── PDRoundsView ──────────────────────────────────────────────────────────────

function PDRoundsView({ notes, tasks }) {
  const rounds = (notes || []).filter(n => n.noteType === "round");
  const [openId, setOpenId] = React.useState(null);

  if (rounds.length === 0) {
    return <EmptyState title="No round notes" body="Round notes recorded here will appear in this view." />;
  }

  return (
    <div>
      {rounds.map(note => {
        const isOpen = openId === note.pnId;
        const complaints = (note.sections?.subjective || "").split("\n").filter(Boolean);
        const discussion = note.sections?.assessment || note.text || "";
        const planLine   = note.sections?.plan || "";
        const resolvedTasks = (note.taskIds || [])
          .map(id => (tasks || []).find(t => t.taskId === id))
          .filter(Boolean);

        return (
          <div key={note.pnId} className={`pd-rday${isOpen ? " open" : ""}`}>
            <div
              style={{display:"flex",alignItems:"center",gap:8,padding:"11px 14px",cursor:"pointer"}}
              onClick={() => setOpenId(isOpen ? null : note.pnId)}
            >
              <span className="pd-rdd" />
              <span className="pd-rdt">{pdDayLabel(note.createdAt)} · {pdClock(note.createdAt)}</span>
              <span className="pd-rds">{note.author?.name || ""}</span>
              <i className={`ti ${isOpen ? "ti-chevron-down" : "ti-chevron-right"} pd-nchev`}
                style={{marginLeft:"auto"}} />
            </div>
            {isOpen && (
              <div className="pd-rdbody">
                {complaints.length > 0 && (
                  <React.Fragment>
                    <div className="pd-rsub cmp">Complaints</div>
                    {complaints.map((c, i) => (
                      <div className="pd-cline" key={i}>
                        <i className="ti ti-alert-circle" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </React.Fragment>
                )}
                {discussion && (
                  <React.Fragment>
                    <div className="pd-rsub">Discussion</div>
                    <div className="pd-rtxt">{discussion}</div>
                  </React.Fragment>
                )}
                {planLine && (
                  <React.Fragment>
                    <div className="pd-rsub">Plan</div>
                    <div className="pd-rtxt">{planLine}</div>
                  </React.Fragment>
                )}
                {resolvedTasks.length > 0 && (
                  <React.Fragment>
                    <div className="pd-rsub ai">Action items</div>
                    {resolvedTasks.map(t => {
                      const done  = t.status === "done";
                      const late  = !done && t.dueAt && new Date(t.dueAt).getTime() < Date.now();
                      const dueStr = (t.dueAt && !done) ? (late ? "late" : t.dueAt.slice(11,16)) : "";
                      return (
                        <div key={t.taskId} className={`pd-aline${done ? " donei" : ""}`}>
                          <i className={`ti ${done ? "ti-square-check" : "ti-square"}`} />
                          <span className="pd-at">{t.title}</span>
                          {dueStr && <span className={`pd-ad${late ? " late" : ""}`}>{dueStr}</span>}
                        </div>
                      );
                    })}
                  </React.Fragment>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

window.PDNotesView  = PDNotesView;
window.PDTasksView  = PDTasksView;
window.PDMedsView   = PDMedsView;
window.PDRoundsView = PDRoundsView;
