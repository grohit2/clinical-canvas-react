import React, { useState, useRef, useEffect } from "react";

function BottomSheet({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div ref={ref} style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: "16px 16px 0 0", maxHeight: "70vh", overflow: "auto", animation: "sheetUp .25s ease", paddingBottom: 16 }}>
        <div style={{ width: 36, height: 4, background: "#ddd", borderRadius: 2, margin: "10px auto 6px" }} />
        <div style={{ padding: "8px 20px 12px", fontSize: 15, fontWeight: 700, color: "#1a1d23", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
          {title}
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#999", cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TaskModal({ task, groupColor, onClose, onUpdate, lookups }) {
  const { taskTypes, doctors, nurses, taskStatuses, priorities, daysOrder, recurrence, places } = lookups;
  const [t, setT] = useState({ ...task });
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onUpdate(t);
        onClose();
      }
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [t, onClose, onUpdate]);

  const save = () => {
    onUpdate(t);
    onClose();
  };

  const field = (label, key, options) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#8b8fa3", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>{label}</label>
      {options ? (
        <select value={t[key]} onChange={e => setT(p => ({ ...p, [key]: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e3eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fafbfd", color: "#1a1d23", outline: "none" }}>
          {options.map(o => <option key={o} value={o}>{o || "— Select —"}</option>)}
        </select>
      ) : (
        <input value={t[key] || ""} onChange={e => setT(p => ({ ...p, [key]: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e3eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fafbfd", color: "#1a1d23", outline: "none" }} />
      )}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,17,23,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div ref={ref} style={{ width: "100%", maxWidth: 600, background: "#fff", borderRadius: 14, maxHeight: "90vh", overflow: "auto", animation: "fadeIn .2s ease", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #eee", display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 5, height: 40, borderRadius: 3, background: groupColor, flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <input value={t.name} onChange={e => setT(p => ({ ...p, name: e.target.value }))} style={{ width: "100%", border: "none", outline: "none", fontSize: 18, fontWeight: 700, color: "#1a1d23", fontFamily: "inherit", padding: 0 }} />
            <div style={{ fontSize: 13, color: "#8b8fa3", marginTop: 3 }}>Patient: <strong style={{ color: "#1a1d23" }}>{t.patient}</strong></div>
          </div>
          <button onClick={save} style={{ background: "none", border: "none", fontSize: 22, color: "#999", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
          {field("Patient", "patient")}
          {field("Task Type", "type", ["", ...taskTypes])}
          {field("Doctor", "doctor", ["", ...doctors.map(d => d.name)])}
          {field("Nurse", "nurse", ["", ...nurses.map(n => n.name)])}
          {field("Status", "status", ["", ...Object.keys(taskStatuses).filter(Boolean)])}
          {field("Priority", "priority", ["", ...Object.keys(priorities).filter(Boolean)])}
          {field("Time", "time")}
          {field("Day", "day", ["", ...daysOrder])}
          {field("Recurrence", "recurrence", ["", ...recurrence])}
          {field("Place", "place", ["", ...places])}
          <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#8b8fa3", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Notes</label>
            <textarea value={t.notes || ""} onChange={e => setT(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e3eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fafbfd", color: "#1a1d23", outline: "none", resize: "vertical" }} />
          </div>
        </div>
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, border: "1.5px solid #e0e3eb", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#555" }}>Cancel</button>
          <button onClick={save} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: groupColor, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#fff" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function StatusCell({ status, onClick, width, taskStatuses }) {
  const s = taskStatuses[status] || taskStatuses[""];
  return <div onClick={onClick} style={{ width, minWidth: width, height: "100%", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: s.text, fontSize: 12, fontWeight: 600, userSelect: "none", borderLeft: "1px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>{status || "\u00A0"}</div>;
}

function PriorityCell({ priority, onClick, width, priorities }) {
  const p = priorities[priority] || priorities[""];
  return <div onClick={onClick} style={{ width, minWidth: width, height: "100%", background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", color: p.text, fontSize: 12, fontWeight: 600, userSelect: "none", borderLeft: "1px solid rgba(0,0,0,0.06)" }}>{p.icon && <span style={{ fontSize: 11 }}>{p.icon}</span>}{priority || "\u00A0"}</div>;
}

function PersonCell({ name, list, onClick, width }) {
  const person = list.find(p => p.name === name);
  return <div onClick={onClick} style={{ width, minWidth: width, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderLeft: "1px solid #eee" }}>
    {person ? <div title={person.name}><div style={{ width: 26, height: 26, borderRadius: "50%", background: person.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}>{person.initials}</div></div>
      : <div style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px dashed #ccc", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="13" height="13" viewBox="0 0 20 20" fill="#ccc"><path d="M10 10c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg></div>}
  </div>;
}

function TextCell({ value, onClick, width, color, fontWeight, icon }) {
  return <div onClick={onClick} style={{ width, minWidth: width, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", borderLeft: "1px solid #eee", fontSize: 12, color: color || "#555", fontWeight: fontWeight || 500, whiteSpace: "nowrap", overflow: "hidden" }}>{icon && <span style={{ fontSize: 11, opacity: 0.7 }}>{icon}</span>}{value || "—"}</div>;
}

function ProgressBar({ tasks, taskStatuses, height = 5 }) {
  if (!tasks.length) return <div style={{ height, borderRadius: 3, background: "#eee", width: "100%" }} />;
  const c = {};
  tasks.forEach(t => { c[t.status] = (c[t.status] || 0) + 1; });
  return <div style={{ height, borderRadius: 3, overflow: "hidden", display: "flex", background: "#eee", width: "100%" }}>{Object.entries(c).map(([s, n]) => <div key={s} style={{ width: `${(n / tasks.length) * 100}%`, background: taskStatuses[s]?.bg || "#ccc", transition: "width .3s" }} />)}</div>;
}

export function TableGroup({ group, columns, isMobile, onUpdate, onAdd, lookups }) {
  const {
    doctors,
    nurses,
    taskStatuses,
    priorities,
    daysOrder,
    recurrence,
    places,
    taskTypes,
  } = lookups;

  const [picker, setPicker] = useState(null);
  const [addVal, setAddVal] = useState("");
  const [addFocused, setAddFocused] = useState(false);
  const [modal, setModal] = useState(null);
  const [collapsed, setCollapsed] = useState(group.collapsed);
  const nameW = isMobile ? 180 : 260;
  const scrollW = columns.reduce((a, c) => a + c.w, 0);
  const task = picker ? group.tasks.find(t => t.id === picker.taskId) : null;
  const urgentCount = group.tasks.filter(t => t.priority === "Critical" || t.status === "Urgent").length;

  const renderCell = (t, col) => {
    const b = { taskId: t.id };
    switch (col.key) {
      case "doctor": return <PersonCell name={t.doctor} list={doctors} width={col.w} onClick={() => setPicker({ ...b, type: "doctor" })} />;
      case "nurse": return <PersonCell name={t.nurse} list={nurses} width={col.w} onClick={() => setPicker({ ...b, type: "nurse" })} />;
      case "status": return <StatusCell status={t.status} width={col.w} taskStatuses={taskStatuses} onClick={() => setPicker({ ...b, type: "status" })} />;
      case "priority": return <PriorityCell priority={t.priority} width={col.w} priorities={priorities} onClick={() => setPicker({ ...b, type: "priority" })} />;
      case "time": return <TextCell value={t.time} width={col.w} icon="🕐" onClick={() => setModal(t)} />;
      case "day": return <TextCell value={t.day?.slice(0, 3)} width={col.w} onClick={() => setPicker({ ...b, type: "day" })} />;
      case "recurrence": return <TextCell value={t.recurrence === "None" ? "—" : t.recurrence} width={col.w} color={t.recurrence !== "None" ? "#579bfc" : "#aaa"} fontWeight={t.recurrence !== "None" ? 600 : 400} icon={t.recurrence !== "None" ? "🔄" : ""} onClick={() => setPicker({ ...b, type: "recurrence" })} />;
      case "place": return <TextCell value={t.place} width={col.w} icon="📍" onClick={() => setPicker({ ...b, type: "place" })} />;
      case "patient": return <TextCell value={t.patient} width={col.w} fontWeight={600} color="#1a1d23" onClick={() => setModal(t)} />;
      case "type": return <TextCell value={t.type} width={col.w} color="#7c5cbf" fontWeight={500} onClick={() => setPicker({ ...b, type: "taskType" })} />;
      default: return <TextCell value="" width={col.w} />;
    }
  };

  const makePicker = (type, title, items, taskField) => {
    if (picker?.type !== type || !task) return null;
    return <BottomSheet title={title} onClose={() => setPicker(null)}>{items.map(item => {
      const val = typeof item === "object" ? item.name : item;
      const sel = val === task[taskField];
      return <button key={val} onClick={() => { onUpdate({ ...task, [taskField]: val }); setPicker(null); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", border: "none", background: sel ? "rgba(0,0,0,0.03)" : "transparent", cursor: "pointer", width: "100%", fontSize: 14, fontFamily: "inherit" }}>
        {typeof item === "object" && item.initials && <div style={{ width: 28, height: 28, borderRadius: "50%", background: item.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{item.initials}</div>}
        {typeof item === "object" && item.bg && <span style={{ width: 20, height: 20, borderRadius: 5, background: item.bg, flexShrink: 0 }} />}
        <div><span style={{ fontWeight: sel ? 700 : 400 }}>{val}</span>{typeof item === "object" && item.specialty && <div style={{ fontSize: 11, color: "#999" }}>{item.specialty}</div>}</div>
        {sel && <span style={{ marginLeft: "auto", color: "#579bfc", fontWeight: 700 }}>✓</span>}
      </button>;
    })}</BottomSheet>;
  };

  return (
    <div style={{ marginBottom: isMobile ? 14 : 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "8px 6px 6px" : "10px 0 8px" }}>
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: group.color, transform: collapsed ? "rotate(0)" : "rotate(90deg)", transition: "transform .2s", display: "flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M12.76 10.56a.77.77 0 000-1.12L8.4 5.23a.84.84 0 00-1.16 0 .77.77 0 000 1.12L11.03 10l-3.79 3.65a.77.77 0 000 1.12.84.84 0 001.16 0l4.36-4.21z" /></svg>
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: group.color }}>{group.name}</span>
        <span style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>{group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}</span>
        {urgentCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: "#df2f4a", color: "#fff", padding: "1px 7px", borderRadius: 10 }}>{urgentCount} urgent</span>}
      </div>
      {collapsed ? <div style={{ padding: isMobile ? "0 6px 4px" : "0 0 4px" }}><ProgressBar tasks={group.tasks} taskStatuses={taskStatuses} /></div> : (
        <div style={{ border: "1px solid #e0e3eb", borderRadius: isMobile ? 10 : 8, overflow: "hidden", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", position: "relative" }}>
            <div style={{ width: nameW, minWidth: nameW, flexShrink: 0, position: "sticky", left: 0, zIndex: 3, background: "#fff", borderRight: "1px solid #e0e3eb", boxShadow: isMobile ? "3px 0 8px rgba(0,0,0,0.05)" : "none" }}>
              <div style={{ height: 36, display: "flex", alignItems: "center", background: "#f5f6f8", borderBottom: "1px solid #e0e3eb" }}>
                <div style={{ width: 6, height: "100%", background: group.color, flexShrink: 0 }} />
                <label style={{ display: "flex", alignItems: "center", padding: "0 6px", flexShrink: 0 }}><input type="checkbox" style={{ width: 14, height: 14, accentColor: group.color, cursor: "pointer" }} /></label>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#676879" }}>Task</span>
              </div>
              {group.tasks.map((t, i) => (
                <div key={t.id} style={{ height: 40, display: "flex", alignItems: "center", borderBottom: i < group.tasks.length - 1 ? "1px solid #f0f0f0" : "none", cursor: "pointer" }}>
                  <div style={{ width: 6, height: "100%", background: group.color, opacity: 0.45, flexShrink: 0 }} />
                  <label style={{ display: "flex", alignItems: "center", padding: "0 6px", flexShrink: 0 }}><input type="checkbox" style={{ width: 14, height: 14, accentColor: group.color, cursor: "pointer" }} /></label>
                  <div onClick={() => setModal(t)} style={{ flex: 1, minWidth: 0, fontSize: 13, color: "#1a1d23", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8, fontWeight: 500 }}>{t.name}</div>
                </div>
              ))}
              {onAdd && <div style={{ height: 40, display: "flex", alignItems: "center", borderTop: "1px solid #f0f0f0" }}>
                <div style={{ width: 6, height: "100%", background: group.color, opacity: 0.15, flexShrink: 0 }} />
                <div style={{ padding: "0 6px", flexShrink: 0, width: 26 }} />
                <input value={addVal} onChange={e => setAddVal(e.target.value)} onFocus={() => setAddFocused(true)} onBlur={() => setAddFocused(false)} onKeyDown={e => { if (e.key === "Enter" && addVal.trim()) { onAdd(addVal.trim()); setAddVal(""); } }} placeholder="+ Add task" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 13, color: addFocused ? "#1a1d23" : "#aaa", fontFamily: "inherit" }} />
              </div>}
              <div style={{ height: 34, background: "#f5f6f8", borderTop: "1px solid #e0e3eb", display: "flex", alignItems: "center" }}><div style={{ width: 6, height: "100%", background: group.color, opacity: 0.2, flexShrink: 0 }} /></div>
            </div>
            <div style={{ overflowX: "auto", overflowY: "hidden", flexGrow: 1, WebkitOverflowScrolling: "touch", minWidth: 0 }}>
              <div style={{ minWidth: scrollW }}>
                <div style={{ display: "flex", height: 36, background: "#f5f6f8", borderBottom: "1px solid #e0e3eb" }}>
                  {columns.map(c => <div key={c.key} style={{ width: c.w, minWidth: c.w, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#676879", borderLeft: "1px solid #eee" }}>{c.label}</div>)}
                </div>
                {group.tasks.map((t, i) => <div key={t.id} style={{ display: "flex", height: 40, borderBottom: i < group.tasks.length - 1 ? "1px solid #f0f0f0" : "none" }}>{columns.map(col => <div key={col.key}>{renderCell(t, col)}</div>)}</div>)}
                {onAdd && <div style={{ height: 40, borderTop: "1px solid #f0f0f0" }} />}
                <div style={{ display: "flex", height: 34, background: "#f5f6f8", borderTop: "1px solid #e0e3eb" }}>{columns.map(c => <div key={c.key} style={{ width: c.w, minWidth: c.w, borderLeft: "1px solid #eee", display: "flex", alignItems: "center", padding: "0 6px" }}>{c.key === "status" && <ProgressBar tasks={group.tasks} taskStatuses={taskStatuses} height={6} />}</div>)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {makePicker("status", "Set Status", Object.entries(taskStatuses).filter(([k]) => k).map(([k, v]) => ({ name: k, bg: v.bg })), "status")}
      {makePicker("priority", "Set Priority", Object.entries(priorities).filter(([k]) => k).map(([k, v]) => ({ name: k, bg: v.bg, icon: v.icon })), "priority")}
      {makePicker("doctor", "Assign Doctor", doctors, "doctor")}
      {makePicker("nurse", "Assign Nurse", nurses, "nurse")}
      {makePicker("day", "Set Day", daysOrder, "day")}
      {makePicker("recurrence", "Set Recurrence", recurrence, "recurrence")}
      {makePicker("place", "Set Place", places, "place")}
      {makePicker("taskType", "Set Type", taskTypes, "type")}
      {modal && <TaskModal task={modal} groupColor={group.color} onClose={() => setModal(null)} onUpdate={t => { onUpdate(t); setModal(null); }} lookups={lookups} />}
    </div>
  );
}

export function StatsBar({ tasks }) {
  const stats = [
    { label: "Total", value: tasks.length, color: "#579bfc", bg: "rgba(87,155,252,0.1)" },
    { label: "Urgent", value: tasks.filter(t => t.priority === "Critical" || t.status === "Urgent").length, color: "#df2f4a", bg: "rgba(223,47,74,0.1)" },
    { label: "Active", value: tasks.filter(t => t.status === "In Progress").length, color: "#fdab3d", bg: "rgba(253,171,61,0.1)" },
    { label: "Scheduled", value: tasks.filter(t => t.status === "Scheduled").length, color: "#579bfc", bg: "rgba(87,155,252,0.08)" },
    { label: "Done", value: tasks.filter(t => t.status === "Completed").length, color: "#00c875", bg: "rgba(0,200,117,0.1)" },
  ];

  return <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 2px" }}>{stats.map(s => <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "10px 16px", minWidth: 95, flexShrink: 0 }}><div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div><div style={{ fontSize: 11, fontWeight: 600, color: s.color, opacity: 0.8, marginTop: 2 }}>{s.label}</div></div>)}</div>;
}
