import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { TaskBottomNav } from "./components/TaskBottomNav";

/* ═══════════════════════════════════════════════════
   HOSPITAL MANAGEMENT BOARD — Multi-View
   ═══════════════════════════════════════════════════ */

const TASK_STATUSES = {
  Scheduled: { bg: "#579bfc", text: "#fff" },
  "In Progress": { bg: "#fdab3d", text: "#fff" },
  Completed: { bg: "#00c875", text: "#fff" },
  Cancelled: { bg: "#999", text: "#fff" },
  Urgent: { bg: "#df2f4a", text: "#fff" },
  "On Hold": { bg: "#9d6ec1", text: "#fff" },
  "": { bg: "#c4c4c4", text: "#fff" },
};
const PRIORITIES = {
  Critical: { bg: "#df2f4a", text: "#fff", icon: "⚠" },
  High: { bg: "#fdab3d", text: "#fff", icon: "↑" },
  Medium: { bg: "#579bfc", text: "#fff", icon: "–" },
  Low: { bg: "#00c875", text: "#fff", icon: "↓" },
  "": { bg: "#c4c4c4", text: "#fff", icon: "" },
};
const RECURRENCE = ["None","Daily","Weekly","Bi-weekly","Monthly","As needed"];
const PLACES = ["Room 101","Room 102","Room 103","Room 201","Room 202","ICU Bay 1","ICU Bay 2","ICU Bay 3","OR Suite A","OR Suite B","OR Suite C","ER Bay 1","ER Bay 2","ER Bay 3","Lab","Radiology","PT Room 1","PT Room 2","Consultation A","Consultation B","Pharmacy","Discharge Lounge"];
const WARD_COLORS = ["#1f6feb","#a25ddc","#df2f4a","#00c875","#fdab3d","#66ccff","#ff642e","#7f5347","#037f4c","#bb3354"];
const DOCTORS = [
  { name: "Dr. Patel", initials: "VP", color: "#1f6feb", specialty: "Cardiology" },
  { name: "Dr. Chen", initials: "LC", color: "#a25ddc", specialty: "Neurology" },
  { name: "Dr. Williams", initials: "RW", color: "#00c875", specialty: "Orthopedics" },
  { name: "Dr. Garcia", initials: "MG", color: "#df2f4a", specialty: "General" },
  { name: "Dr. Kim", initials: "SK", color: "#fdab3d", specialty: "Pediatrics" },
  { name: "Dr. Brooks", initials: "AB", color: "#037f4c", specialty: "Oncology" },
];
const NURSES = [
  { name: "RN Sarah M.", initials: "SM", color: "#e8518d" },
  { name: "RN James T.", initials: "JT", color: "#579bfc" },
  { name: "RN Maria L.", initials: "ML", color: "#a25ddc" },
  { name: "RN David K.", initials: "DK", color: "#00c875" },
  { name: "RN Emily R.", initials: "ER", color: "#fdab3d" },
  { name: "RN Carlos P.", initials: "CP", color: "#037f4c" },
];
const TASK_TYPES = ["Checkup","Medication","Lab Work","Imaging","Surgery","Physical Therapy","Consultation","Discharge Planning","Vital Signs","Wound Care","IV Change","Blood Draw","Patient Education","Follow-up","Diet Review"];
const DAYS_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

/* ── VIEWS CONFIG ── */
const VIEWS = [
  { id: "ward", label: "Ward", icon: "🏥", desc: "By department / ward" },
  { id: "patient", label: "Patient", icon: "🧑‍⚕️", desc: "By patient name" },
  { id: "doctor", label: "Doctor", icon: "👨‍⚕️", desc: "By assigned doctor" },
  { id: "nurse", label: "Nurse", icon: "👩‍⚕️", desc: "By assigned nurse" },
  { id: "schedule", label: "Schedule", icon: "📅", desc: "By day of week" },
  { id: "location", label: "Location", icon: "📍", desc: "By room / place" },
  { id: "priority", label: "Priority", icon: "⚡", desc: "By urgency level" },
  { id: "status", label: "Status", icon: "📊", desc: "By task status" },
  { id: "type", label: "Type", icon: "🏷️", desc: "By task category" },
];

/* ── SAMPLE DATA ── */
const initialWards = [
  { id: "g1", name: "Ward A — Cardiology", color: "#1f6feb", collapsed: false, tasks: [
    { id: "t1", name: "Post-op vitals check", patient: "Robert Johnson", doctor: "Dr. Patel", nurse: "RN Sarah M.", status: "In Progress", priority: "High", time: "08:00", day: "Monday", recurrence: "Daily", place: "Room 101", type: "Vital Signs", notes: "Monitor BP every 2hrs", wardId: "g1" },
    { id: "t2", name: "Echocardiogram review", patient: "Robert Johnson", doctor: "Dr. Patel", nurse: "RN James T.", status: "Scheduled", priority: "Medium", time: "10:30", day: "Monday", recurrence: "None", place: "Radiology", type: "Imaging", notes: "", wardId: "g1" },
    { id: "t3", name: "Medication adjustment", patient: "Linda Davis", doctor: "Dr. Patel", nurse: "RN Sarah M.", status: "Urgent", priority: "Critical", time: "07:00", day: "Monday", recurrence: "Daily", place: "Room 102", type: "Medication", notes: "Switch IV to oral anticoagulants", wardId: "g1" },
    { id: "t4", name: "Discharge assessment", patient: "Mark Thompson", doctor: "Dr. Patel", nurse: "RN Maria L.", status: "Scheduled", priority: "Medium", time: "14:00", day: "Tuesday", recurrence: "None", place: "Room 103", type: "Discharge Planning", notes: "Home care instructions", wardId: "g1" },
  ]},
  { id: "g2", name: "Ward B — Neurology", color: "#a25ddc", collapsed: false, tasks: [
    { id: "t5", name: "MRI brain scan", patient: "Susan Clark", doctor: "Dr. Chen", nurse: "RN Emily R.", status: "Scheduled", priority: "High", time: "09:00", day: "Monday", recurrence: "None", place: "Radiology", type: "Imaging", notes: "With contrast", wardId: "g2" },
    { id: "t6", name: "Neuro exam follow-up", patient: "Susan Clark", doctor: "Dr. Chen", nurse: "RN Emily R.", status: "In Progress", priority: "Medium", time: "15:00", day: "Monday", recurrence: "Weekly", place: "Consultation A", type: "Consultation", notes: "Motor function progression", wardId: "g2" },
    { id: "t7", name: "Physical therapy session", patient: "James Wilson", doctor: "Dr. Chen", nurse: "RN David K.", status: "Scheduled", priority: "Medium", time: "11:00", day: "Wednesday", recurrence: "Bi-weekly", place: "PT Room 1", type: "Physical Therapy", notes: "Post-stroke rehab", wardId: "g2" },
  ]},
  { id: "g3", name: "ICU — Critical Care", color: "#df2f4a", collapsed: false, tasks: [
    { id: "t8", name: "Ventilator check", patient: "George Adams", doctor: "Dr. Garcia", nurse: "RN James T.", status: "In Progress", priority: "Critical", time: "06:00", day: "Monday", recurrence: "Daily", place: "ICU Bay 1", type: "Vital Signs", notes: "Weaning protocol", wardId: "g3" },
    { id: "t9", name: "Blood panel draw", patient: "George Adams", doctor: "Dr. Garcia", nurse: "RN Carlos P.", status: "Scheduled", priority: "High", time: "05:30", day: "Monday", recurrence: "Daily", place: "ICU Bay 1", type: "Blood Draw", notes: "CBC, BMP, coagulation", wardId: "g3" },
    { id: "t10", name: "Wound care & dressing", patient: "Patricia Moore", doctor: "Dr. Garcia", nurse: "RN Maria L.", status: "Urgent", priority: "High", time: "08:00", day: "Monday", recurrence: "Daily", place: "ICU Bay 2", type: "Wound Care", notes: "Watch for infection", wardId: "g3" },
  ]},
  { id: "g4", name: "Outpatient — Follow-ups", color: "#00c875", collapsed: false, tasks: [
    { id: "t11", name: "Post-surgery checkup", patient: "Emily Watson", doctor: "Dr. Williams", nurse: "RN David K.", status: "Completed", priority: "Low", time: "10:00", day: "Thursday", recurrence: "None", place: "Consultation B", type: "Follow-up", notes: "Cleared for PT", wardId: "g4" },
    { id: "t12", name: "Lab results review", patient: "Tom Anderson", doctor: "Dr. Brooks", nurse: "RN Carlos P.", status: "Completed", priority: "Medium", time: "11:30", day: "Thursday", recurrence: "Monthly", place: "Consultation A", type: "Lab Work", notes: "WBC trending up", wardId: "g4" },
  ]},
];

/* ── UTILS ── */
function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 900);
  useEffect(() => { const h = () => setM(window.innerWidth < 900); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return m;
}
let _id = Date.now();
const uid = () => `id_${_id++}`;

function getAllTasks(wards) { return wards.flatMap(w => w.tasks); }
function getTodayName() {
  const jsDay = new Date().getDay();
  return DAYS_ORDER[(jsDay + 6) % 7];
}
function getTimeScore(value) {
  if (!value || !value.includes(":")) return 99_999;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 99_999;
  return (h * 60) + m;
}
function sortTaskList(tasks, mode) {
  if (mode === "default") return tasks;
  const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const clone = [...tasks];
  if (mode === "priority") {
    return clone.sort((a, b) => {
      const pa = rank[a.priority] ?? 9;
      const pb = rank[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return getTimeScore(a.time) - getTimeScore(b.time);
    });
  }
  if (mode === "time") {
    return clone.sort((a, b) => {
      const ta = getTimeScore(a.time);
      const tb = getTimeScore(b.time);
      if (ta !== tb) return ta - tb;
      return (a.name || "").localeCompare(b.name || "");
    });
  }
  return clone;
}
function formatEntryTime(iso) {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function makeMockEntry(type, title, detail) {
  return { id: uid(), type, title, detail, at: new Date().toISOString() };
}

/* ── Grouping logic per view ── */
function buildGroups(viewId, wards) {
  const all = getAllTasks(wards);
  const wardMap = {};
  wards.forEach(w => { wardMap[w.id] = w; });

  const makeGroup = (name, color, tasks) => ({ id: `vg_${name}`, name, color, collapsed: false, tasks });

  switch (viewId) {
    case "ward":
      return wards.map(w => ({ ...w }));

    case "patient": {
      const map = {};
      all.forEach(t => { const k = t.patient || "Unassigned"; if (!map[k]) map[k] = []; map[k].push(t); });
      const colors = ["#1f6feb","#a25ddc","#00c875","#df2f4a","#fdab3d","#e8518d","#037f4c","#66ccff","#ff642e","#bb3354"];
      return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([name, tasks], i) => {
        const urgent = tasks.some(t => t.priority === "Critical" || t.status === "Urgent");
        return makeGroup(`🧑 ${name}`, urgent ? "#df2f4a" : colors[i % colors.length], tasks);
      });
    }
    case "doctor": {
      const map = {};
      all.forEach(t => { const k = t.doctor || "Unassigned"; if (!map[k]) map[k] = []; map[k].push(t); });
      return DOCTORS.filter(d => map[d.name]).map(d => makeGroup(`${d.name} — ${d.specialty}`, d.color, map[d.name]))
        .concat(map["Unassigned"] ? [makeGroup("Unassigned", "#999", map["Unassigned"])] : []);
    }
    case "nurse": {
      const map = {};
      all.forEach(t => { const k = t.nurse || "Unassigned"; if (!map[k]) map[k] = []; map[k].push(t); });
      return NURSES.filter(n => map[n.name]).map(n => makeGroup(n.name, n.color, map[n.name]))
        .concat(map["Unassigned"] ? [makeGroup("Unassigned", "#999", map["Unassigned"])] : []);
    }
    case "schedule": {
      const map = {};
      all.forEach(t => { const k = t.day || "Unscheduled"; if (!map[k]) map[k] = []; map[k].push(t); });
      const dayColors = { Monday: "#1f6feb", Tuesday: "#a25ddc", Wednesday: "#00c875", Thursday: "#fdab3d", Friday: "#df2f4a", Saturday: "#66ccff", Sunday: "#ff642e" };
      return DAYS_ORDER.filter(d => map[d]).map(d => {
        const sorted = [...map[d]].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        return makeGroup(`📅 ${d}`, dayColors[d] || "#999", sorted);
      }).concat(map["Unscheduled"] ? [makeGroup("📅 Unscheduled", "#999", map["Unscheduled"])] : []);
    }
    case "location": {
      const map = {};
      all.forEach(t => { const k = t.place || "No Location"; if (!map[k]) map[k] = []; map[k].push(t); });
      const locColors = { "Room": "#1f6feb", "ICU": "#df2f4a", "OR": "#a25ddc", "ER": "#fdab3d", "Lab": "#00c875", "Radiology": "#66ccff", "PT": "#037f4c", "Consultation": "#579bfc", "Pharmacy": "#9d6ec1", "Discharge": "#ff642e" };
      const getLocColor = (name) => { for (const [k, v] of Object.entries(locColors)) { if (name.startsWith(k)) return v; } return "#999"; };
      return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([name, tasks]) =>
        makeGroup(`📍 ${name}`, getLocColor(name), tasks));
    }
    case "priority": {
      const order = ["Critical", "High", "Medium", "Low", ""];
      const map = {};
      all.forEach(t => { const k = t.priority || ""; if (!map[k]) map[k] = []; map[k].push(t); });
      return order.filter(p => map[p]).map(p => makeGroup(p ? `${PRIORITIES[p].icon} ${p} Priority` : "No Priority", PRIORITIES[p]?.bg || "#999", map[p]));
    }
    case "status": {
      const order = ["Urgent", "In Progress", "Scheduled", "On Hold", "Completed", "Cancelled", ""];
      const map = {};
      all.forEach(t => { const k = t.status || ""; if (!map[k]) map[k] = []; map[k].push(t); });
      return order.filter(s => map[s]).map(s => makeGroup(s || "No Status", TASK_STATUSES[s]?.bg || "#999", map[s]));
    }
    case "type": {
      const map = {};
      all.forEach(t => { const k = t.type || "Uncategorized"; if (!map[k]) map[k] = []; map[k].push(t); });
      const typeColors = ["#1f6feb","#a25ddc","#00c875","#df2f4a","#fdab3d","#e8518d","#037f4c","#66ccff","#ff642e","#bb3354","#579bfc","#9d6ec1","#7f5347","#fdab3d","#00c875"];
      return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([name, tasks], i) =>
        makeGroup(`🏷️ ${name}`, typeColors[i % typeColors.length], tasks));
    }
    default:
      return wards;
  }
}

/* ── Columns config per view (hide the field used for grouping) ── */
function getColumns(viewId) {
  const all = [
    { key: "patient", label: "Patient", w: 110 },
    { key: "doctor", label: "Doctor", w: 70 },
    { key: "nurse", label: "Nurse", w: 70 },
    { key: "status", label: "Status", w: 105 },
    { key: "priority", label: "Priority", w: 95 },
    { key: "time", label: "Time", w: 70 },
    { key: "day", label: "Day", w: 85 },
    { key: "recurrence", label: "Recurring", w: 90 },
    { key: "place", label: "Place", w: 100 },
    { key: "type", label: "Type", w: 100 },
  ];
  const hide = { patient: "patient", doctor: "doctor", nurse: "nurse", schedule: "day", location: "place", priority: "priority", status: "status", type: "type" };
  const h = hide[viewId];
  return h ? all.filter(c => c.key !== h) : all;
}

/* ═══════════════ COMPONENTS ═══════════════ */

function BottomSheet({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); }; document.addEventListener("pointerdown", h); return () => document.removeEventListener("pointerdown", h); }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div ref={ref} style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: "16px 16px 0 0", maxHeight: "70vh", overflow: "auto", animation: "sheetUp .25s ease", paddingBottom: 16 }}>
        <div style={{ width: 36, height: 4, background: "#ddd", borderRadius: 2, margin: "10px auto 6px" }} />
        <div style={{ padding: "8px 20px 12px", fontSize: 15, fontWeight: 700, color: "#1a1d23", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>{title}<button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#999", cursor: "pointer" }}>×</button></div>
        {children}
      </div>
    </div>
  );
}

function TaskModal({ task, groupColor, onClose, onUpdate }) {
  const [t, setT] = useState({ ...task });
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { onUpdate(t); onClose(); } }; document.addEventListener("pointerdown", h); return () => document.removeEventListener("pointerdown", h); }, [t, onClose, onUpdate]);
  const save = () => { onUpdate(t); onClose(); };
  const field = (label, key, options) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#8b8fa3", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>{label}</label>
      {options ? <select value={t[key]} onChange={e => setT(p => ({ ...p, [key]: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e3eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fafbfd", color: "#1a1d23", outline: "none" }}>{options.map(o => <option key={o} value={o}>{o || "— Select —"}</option>)}</select>
      : <input value={t[key] || ""} onChange={e => setT(p => ({ ...p, [key]: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e3eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fafbfd", color: "#1a1d23", outline: "none" }} />}
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
          {field("Patient", "patient")}{field("Task Type", "type", ["", ...TASK_TYPES])}{field("Doctor", "doctor", ["", ...DOCTORS.map(d => d.name)])}{field("Nurse", "nurse", ["", ...NURSES.map(n => n.name)])}{field("Status", "status", ["", ...Object.keys(TASK_STATUSES).filter(Boolean)])}{field("Priority", "priority", ["", ...Object.keys(PRIORITIES).filter(Boolean)])}{field("Time", "time")}{field("Day", "day", ["", ...DAYS_ORDER])}{field("Recurrence", "recurrence", ["", ...RECURRENCE])}{field("Place", "place", ["", ...PLACES])}
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

/* ── CELL COMPONENTS ── */
function StatusCell({ status, onClick, width }) { const s = TASK_STATUSES[status] || TASK_STATUSES[""]; return <div onClick={onClick} style={{ width, minWidth: width, height: "100%", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: s.text, fontSize: 12, fontWeight: 600, userSelect: "none", borderLeft: "1px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>{status || "\u00A0"}</div>; }
function PriorityCell({ priority, onClick, width }) { const p = PRIORITIES[priority] || PRIORITIES[""]; return <div onClick={onClick} style={{ width, minWidth: width, height: "100%", background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", color: p.text, fontSize: 12, fontWeight: 600, userSelect: "none", borderLeft: "1px solid rgba(0,0,0,0.06)" }}>{p.icon && <span style={{ fontSize: 11 }}>{p.icon}</span>}{priority || "\u00A0"}</div>; }
function PersonCell({ name, list, onClick, width }) {
  const person = list.find(p => p.name === name);
  return <div onClick={onClick} style={{ width, minWidth: width, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderLeft: "1px solid #eee" }}>
    {person ? <div title={person.name}><div style={{ width: 26, height: 26, borderRadius: "50%", background: person.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}>{person.initials}</div></div>
    : <div style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px dashed #ccc", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="13" height="13" viewBox="0 0 20 20" fill="#ccc"><path d="M10 10c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>}
  </div>;
}
function TextCell({ value, onClick, width, color, fontWeight, icon }) { return <div onClick={onClick} style={{ width, minWidth: width, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", borderLeft: "1px solid #eee", fontSize: 12, color: color || "#555", fontWeight: fontWeight || 500, whiteSpace: "nowrap", overflow: "hidden" }}>{icon && <span style={{ fontSize: 11, opacity: 0.7 }}>{icon}</span>}{value || "—"}</div>; }
function ProgressBar({ tasks, height = 5 }) { if (!tasks.length) return <div style={{ height, borderRadius: 3, background: "#eee", width: "100%" }} />; const c = {}; tasks.forEach(t => { c[t.status] = (c[t.status] || 0) + 1; }); return <div style={{ height, borderRadius: 3, overflow: "hidden", display: "flex", background: "#eee", width: "100%" }}>{Object.entries(c).map(([s, n]) => <div key={s} style={{ width: `${(n / tasks.length) * 100}%`, background: TASK_STATUSES[s]?.bg || "#ccc", transition: "width .3s" }} />)}</div>; }

/* ── TABLE GROUP ── */
function TableGroup({ group, columns, isMobile, onToggle, onUpdate, onAdd }) {
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
      case "doctor": return <PersonCell name={t.doctor} list={DOCTORS} width={col.w} onClick={() => setPicker({ ...b, type: "doctor" })} />;
      case "nurse": return <PersonCell name={t.nurse} list={NURSES} width={col.w} onClick={() => setPicker({ ...b, type: "nurse" })} />;
      case "status": return <StatusCell status={t.status} width={col.w} onClick={() => setPicker({ ...b, type: "status" })} />;
      case "priority": return <PriorityCell priority={t.priority} width={col.w} onClick={() => setPicker({ ...b, type: "priority" })} />;
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
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M12.76 10.56a.77.77 0 000-1.12L8.4 5.23a.84.84 0 00-1.16 0 .77.77 0 000 1.12L11.03 10l-3.79 3.65a.77.77 0 000 1.12.84.84 0 001.16 0l4.36-4.21z"/></svg>
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: group.color }}>{group.name}</span>
        <span style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>{group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}</span>
        {urgentCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: "#df2f4a", color: "#fff", padding: "1px 7px", borderRadius: 10 }}>{urgentCount} urgent</span>}
      </div>
      {collapsed ? <div style={{ padding: isMobile ? "0 6px 4px" : "0 0 4px" }}><ProgressBar tasks={group.tasks} /></div> : (
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
                <div style={{ display: "flex", height: 34, background: "#f5f6f8", borderTop: "1px solid #e0e3eb" }}>{columns.map(c => <div key={c.key} style={{ width: c.w, minWidth: c.w, borderLeft: "1px solid #eee", display: "flex", alignItems: "center", padding: "0 6px" }}>{c.key === "status" && <ProgressBar tasks={group.tasks} height={6} />}</div>)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {makePicker("status", "Set Status", Object.entries(TASK_STATUSES).filter(([k]) => k).map(([k, v]) => ({ name: k, bg: v.bg })), "status")}
      {makePicker("priority", "Set Priority", Object.entries(PRIORITIES).filter(([k]) => k).map(([k, v]) => ({ name: k, bg: v.bg, icon: v.icon })), "priority")}
      {makePicker("doctor", "Assign Doctor", DOCTORS, "doctor")}
      {makePicker("nurse", "Assign Nurse", NURSES, "nurse")}
      {makePicker("day", "Set Day", DAYS_ORDER, "day")}
      {makePicker("recurrence", "Set Recurrence", RECURRENCE, "recurrence")}
      {makePicker("place", "Set Place", PLACES, "place")}
      {makePicker("taskType", "Set Type", TASK_TYPES, "type")}
      {modal && <TaskModal task={modal} groupColor={group.color} onClose={() => setModal(null)} onUpdate={t => { onUpdate(t); setModal(null); }} />}
    </div>
  );
}

/* ── STATS BAR ── */
function StatsBar({ tasks }) {
  const stats = [
    { label: "Total", value: tasks.length, color: "#579bfc", bg: "rgba(87,155,252,0.1)" },
    { label: "Urgent", value: tasks.filter(t => t.priority === "Critical" || t.status === "Urgent").length, color: "#df2f4a", bg: "rgba(223,47,74,0.1)" },
    { label: "Active", value: tasks.filter(t => t.status === "In Progress").length, color: "#fdab3d", bg: "rgba(253,171,61,0.1)" },
    { label: "Scheduled", value: tasks.filter(t => t.status === "Scheduled").length, color: "#579bfc", bg: "rgba(87,155,252,0.08)" },
    { label: "Done", value: tasks.filter(t => t.status === "Completed").length, color: "#00c875", bg: "rgba(0,200,117,0.1)" },
  ];
  return <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 2px" }}>{stats.map(s => <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "10px 16px", minWidth: 95, flexShrink: 0 }}><div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div><div style={{ fontSize: 11, fontWeight: 600, color: s.color, opacity: 0.8, marginTop: 2 }}>{s.label}</div></div>)}</div>;
}

/* ═══════════════ MAIN APP ═══════════════ */
export default function HospitalBoard() {
  const isMobile = useIsMobile();
  const [wards, setWards] = useState(initialWards);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeView, setActiveView] = useState("ward");
  const [activeTab, setActiveTab] = useState("tasks");
  const [sortMode, setSortMode] = useState("default");
  const [ledgerEntries, setLedgerEntries] = useState(() => ([
    { id: uid(), type: "system.seeded", title: "Mock data initialized", detail: "Loaded sample wards and task board", at: new Date(Date.now() - (60 * 60 * 1000)).toISOString() },
    { id: uid(), type: "task.synced", title: "Local projection ready", detail: "Task and ledger mock state attached", at: new Date(Date.now() - (20 * 60 * 1000)).toISOString() },
  ]));

  const allTasks = getAllTasks(wards);
  const todayName = getTodayName();
  const todayReminders = useMemo(() => allTasks.filter((t) => t.day === todayName && t.status !== "Completed"), [allTasks, todayName]);
  const pinnedTasks = useMemo(() => [...allTasks]
    .filter((t) => t.priority === "Critical" || t.status === "Urgent" || t.status === "In Progress")
    .sort((a, b) => getTimeScore(a.time) - getTimeScore(b.time))
    .slice(0, 5), [allTasks]);
  const upcomingReminders = useMemo(() => [...allTasks]
    .filter((t) => t.day !== todayName && t.status !== "Completed")
    .sort((a, b) => getTimeScore(a.time) - getTimeScore(b.time))
    .slice(0, 8), [allTasks, todayName]);

  /* update a task globally (find by id across all wards) */
  const updateTask = useCallback((updatedTask) => {
    const previousTask = allTasks.find((task) => task.id === updatedTask.id) || null;
    setWards(ws => ws.map(w => ({
      ...w, tasks: w.tasks.map(t => {
        if (t.id === updatedTask.id) return { ...updatedTask, wardId: w.id };
        return t;
      })
    })));
    setLedgerEntries((prev) => [
      makeMockEntry(
        "task.updated",
        updatedTask.name || "Task updated",
        previousTask
          ? `Status: ${previousTask.status || "None"} -> ${updatedTask.status || "None"}, Priority: ${previousTask.priority || "None"} -> ${updatedTask.priority || "None"}`
          : "Task edited from board UI"
      ),
      ...prev,
    ].slice(0, 80));
  }, [allTasks]);

  const addTaskToWard = useCallback((wardId, name) => {
    const createdTask = { id: uid(), name, patient: "", doctor: "", nurse: "", status: "Scheduled", priority: "Medium", time: "09:00", day: todayName, recurrence: "None", place: "", type: "", notes: "", wardId };
    setWards(ws => ws.map(w => w.id === wardId ? {
      ...w, tasks: [...w.tasks, createdTask]
    } : w));
    const wardName = wards.find((w) => w.id === wardId)?.name || "Unassigned ward";
    setLedgerEntries((prev) => [
      makeMockEntry("task.created", createdTask.name || "New task", `Added to ${wardName} (${todayName})`),
      ...prev,
    ].slice(0, 80));
  }, [todayName, wards]);

  const addWard = useCallback(() => {
    let wardName = "New Ward";
    setWards(ws => {
      const nextName = `New Ward ${ws.length + 1}`;
      wardName = nextName;
      return [...ws, { id: uid(), name: nextName, color: WARD_COLORS[ws.length % WARD_COLORS.length], collapsed: false, tasks: [] }];
    });
    setLedgerEntries((prev) => [
      makeMockEntry("ward.created", wardName, "Created from task board"),
      ...prev,
    ].slice(0, 80));
  }, []);
  const quickAddTask = useCallback(() => {
    const targetWard = wards[0];
    if (!targetWard) return;
    addTaskToWard(targetWard.id, `Quick Task ${allTasks.length + 1}`);
    setActiveTab("tasks");
  }, [addTaskToWard, wards, allTasks.length]);
  const rotateSort = useCallback(() => {
    setSortMode((s) => (s === "default" ? "priority" : s === "priority" ? "time" : "default"));
  }, []);

  /* Build view groups */
  const columns = getColumns(activeView);
  const viewGroups = buildGroups(activeView, wards);

  /* Filter */
  const filteredGroups = viewGroups.map(g => ({
    ...g,
    tasks: sortTaskList(g.tasks.filter(t => {
      const q = search.toLowerCase();
      const ms = !q || t.name.toLowerCase().includes(q) || t.patient.toLowerCase().includes(q) || t.doctor.toLowerCase().includes(q) || t.nurse.toLowerCase().includes(q) || t.place.toLowerCase().includes(q);
      const mf = activeFilter === "All" || (activeFilter === "Urgent" && (t.priority === "Critical" || t.status === "Urgent")) || (activeFilter === "In Progress" && t.status === "In Progress") || (activeFilter === "Scheduled" && t.status === "Scheduled") || (activeFilter === "Completed" && t.status === "Completed");
      return ms && mf;
    }), sortMode)
  })).filter(g => g.tasks.length > 0 || activeView === "ward");

  const filters = ["All", "Urgent", "In Progress", "Scheduled", "Completed"];
  const currentView = VIEWS.find(v => v.id === activeView);
  const sortLabel = sortMode === "default" ? "Default" : sortMode === "priority" ? "Priority" : "Time";
  const navTabs = [
    { id: "home", label: "Home", icon: "🏠", dot: false },
    { id: "tasks", label: "Tasks", icon: "🗂️", dot: false },
    { id: "ledger", label: "Ledger", icon: "📒", badge: ledgerEntries.length },
    { id: "reminders", label: "Reminders", icon: "⏰", badge: todayReminders.length },
    { id: "audit", label: "Audit", icon: "🧾", dot: ledgerEntries.length > 0 },
  ];
  const headerTitle = activeTab === "home"
    ? "Task Home"
    : activeTab === "tasks"
      ? "Task Board"
      : activeTab === "ledger"
        ? "Task Ledger"
        : activeTab === "reminders"
          ? "Today Reminders"
          : "Audit Trail";

  return (
    <div style={{ fontFamily: "'Figtree', -apple-system, sans-serif", background: "#f0f2f7", minHeight: "100vh", paddingBottom: 132 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{overflow-x:hidden}@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}input::placeholder{color:#bbb}::-webkit-scrollbar{height:4px;width:4px}::-webkit-scrollbar-thumb{background:#c5c9d6;border-radius:2px}::-webkit-scrollbar-track{background:transparent}select{cursor:pointer}`}</style>

      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(135deg, #1a1d2e, #252942)", padding: isMobile ? "14px 12px 12px" : "16px 28px 14px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #579bfc, #3b6de7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏥</div>
              <h1 style={{ fontSize: isMobile ? 17 : 21, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>{headerTitle}</h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {isMobile ? <>
              {(activeTab === "tasks" || activeTab === "home" || activeTab === "reminders") && (
                <button onClick={() => setSearchOpen(!searchOpen)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: searchOpen ? "#579bfc" : "rgba(255,255,255,0.08)", color: "#fff", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⌕</button>
              )}
              {activeTab === "tasks" && activeView === "ward" && <button onClick={addWard} style={{ width: 34, height: 34, borderRadius: 8, background: "#579bfc", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>}
            </> : <>
              {(activeTab === "tasks" || activeTab === "home" || activeTab === "reminders") && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>⌕</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks, patients..." style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: 170, color: "#fff", fontFamily: "inherit" }} />
                </div>
              )}
              {activeTab === "tasks" && activeView === "ward" && <button onClick={addWard} style={{ background: "#579bfc", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Add Ward</button>}
            </>}
          </div>
        </div>
        {isMobile && searchOpen && (activeTab === "tasks" || activeTab === "home" || activeTab === "reminders") && <div style={{ marginTop: 10 }}><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: "100%", padding: "9px 14px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 14, outline: "none", background: "rgba(255,255,255,0.08)", fontFamily: "inherit", color: "#fff" }} /></div>}
        <div style={{ marginTop: 12 }}><StatsBar tasks={allTasks} /></div>
      </div>

      {activeTab === "tasks" && (
        <>
          {/* ── VIEW SWITCHER ── */}
          <div style={{ background: "#fff", borderBottom: "1px solid #e0e3eb" }}>
            <div style={{ display: "flex", gap: 0, overflowX: "auto", WebkitOverflowScrolling: "touch", padding: isMobile ? "0 6px" : "0 28px" }}>
              {VIEWS.map(v => (
                <button key={v.id} onClick={() => setActiveView(v.id)} style={{
                  background: "transparent", border: "none", borderBottom: activeView === v.id ? `3px solid #579bfc` : "3px solid transparent",
                  padding: isMobile ? "10px 10px 8px" : "11px 16px 9px", cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", transition: "all .15s",
                  color: activeView === v.id ? "#1a1d23" : "#888", fontWeight: activeView === v.id ? 700 : 500, fontSize: isMobile ? 12 : 13,
                }}>
                  <span style={{ fontSize: isMobile ? 13 : 14 }}>{v.icon}</span>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── FILTER BAR ── */}
          <div style={{ display: "flex", gap: 4, padding: isMobile ? "7px 10px" : "7px 28px", background: "#fafbfd", borderBottom: "1px solid #eee", overflowX: "auto", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#999", fontWeight: 600, marginRight: 4, whiteSpace: "nowrap" }}>Filter:</span>
            {filters.map(f => <button key={f} onClick={() => setActiveFilter(f)} style={{ background: activeFilter === f ? "#1a1d2e" : "transparent", color: activeFilter === f ? "#fff" : "#666", border: activeFilter === f ? "none" : "1px solid #e8e8e8", padding: "4px 12px", fontSize: 11, cursor: "pointer", borderRadius: 20, whiteSpace: "nowrap", fontFamily: "inherit", fontWeight: activeFilter === f ? 700 : 500 }}>{f}</button>)}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: "#aaa", whiteSpace: "nowrap" }}>{currentView?.icon} {currentView?.desc} | Sorted: {sortLabel}</span>
          </div>

          {/* ── GROUPS ── */}
          <div style={{ padding: isMobile ? "10px 6px 80px" : "16px 28px 40px", maxWidth: 1400, margin: "0 auto" }}>
            {filteredGroups.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>No tasks match your filters</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Try changing the view or clearing filters</div>
              </div>
            )}
            {filteredGroups.map(group => (
              <TableGroup
                key={group.id + activeView}
                group={group}
                columns={columns}
                isMobile={isMobile}
                onToggle={() => {}}
                onUpdate={updateTask}
                onAdd={activeView === "ward" ? (name) => addTaskToWard(group.id, name) : null}
              />
            ))}
          </div>
        </>
      )}

      {activeTab === "home" && (
        <div style={{ padding: isMobile ? "12px 10px 24px" : "20px 28px 30px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div style={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#666", marginBottom: 10 }}>Pinned Tasks</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pinnedTasks.slice(0, 4).map((task) => (
                  <div key={task.id} style={{ padding: "10px 11px", borderRadius: 10, background: "rgba(87,155,252,0.08)", border: "1px solid rgba(87,155,252,0.2)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1d23" }}>{task.name}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: "#666" }}>{task.patient || "No patient"} | {task.day} {task.time || ""}</div>
                  </div>
                ))}
                {!pinnedTasks.length && <div style={{ fontSize: 13, color: "#999" }}>No pinned tasks right now.</div>}
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#666", marginBottom: 10 }}>Today Reminders ({todayName})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todayReminders.slice(0, 5).map((task) => (
                  <div key={task.id} style={{ padding: "10px 11px", borderRadius: 10, background: "rgba(253,171,61,0.1)", border: "1px solid rgba(253,171,61,0.24)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1d23" }}>{task.time || "--:--"} | {task.name}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: "#666" }}>{task.place || "No location"} | {task.status}</div>
                  </div>
                ))}
                {!todayReminders.length && <div style={{ fontSize: 13, color: "#999" }}>No reminders due today.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ledger" && (
        <div style={{ padding: isMobile ? "12px 10px 24px" : "20px 28px 30px", maxWidth: 920, margin: "0 auto" }}>
          <div style={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #eef0f4", fontSize: 13, fontWeight: 700, color: "#566072" }}>Ledger (Mock local ops)</div>
            {ledgerEntries.map((entry, idx) => (
              <div key={entry.id} style={{ padding: "11px 14px", borderBottom: idx < ledgerEntries.length - 1 ? "1px solid #f2f3f6" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1d23" }}>{entry.title}</div>
                  <div style={{ fontSize: 11, color: "#9299a8", whiteSpace: "nowrap" }}>{formatEntryTime(entry.at)}</div>
                </div>
                <div style={{ marginTop: 3, fontSize: 12, color: "#6f7684" }}>{entry.detail}</div>
                <div style={{ marginTop: 4, fontSize: 11, color: "#8f96a6" }}>Type: {entry.type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "reminders" && (
        <div style={{ padding: isMobile ? "12px 10px 24px" : "20px 28px 30px", maxWidth: 980, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div style={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#566072", marginBottom: 10 }}>Today ({todayName})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todayReminders.map((task) => (
                  <div key={task.id} style={{ background: "#f9fafc", borderRadius: 10, padding: "9px 11px", border: "1px solid #edf0f4" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1d23" }}>{task.time || "--:--"} {task.name}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: "#6f7684" }}>{task.patient || "No patient"} | {task.place || "No place"}</div>
                  </div>
                ))}
                {!todayReminders.length && <div style={{ fontSize: 13, color: "#9ca3af" }}>Nothing scheduled for today.</div>}
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#566072", marginBottom: 10 }}>Upcoming</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {upcomingReminders.map((task) => (
                  <div key={task.id} style={{ background: "#f9fafc", borderRadius: 10, padding: "9px 11px", border: "1px solid #edf0f4" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1d23" }}>{task.day} {task.time || ""}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: "#6f7684" }}>{task.name}</div>
                  </div>
                ))}
                {!upcomingReminders.length && <div style={{ fontSize: 13, color: "#9ca3af" }}>No upcoming reminders.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div style={{ padding: isMobile ? "12px 10px 24px" : "20px 28px 30px", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#566072", marginBottom: 10 }}>Audit Activity</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ledgerEntries.map((entry) => (
                <div key={entry.id} style={{ border: "1px solid #edf0f4", borderRadius: 10, padding: "10px 11px", background: "#fbfcfe" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1d23" }}>{entry.title}</div>
                    <div style={{ fontSize: 11, color: "#9299a8", whiteSpace: "nowrap" }}>{formatEntryTime(entry.at)}</div>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#6f7684" }}>{entry.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(activeTab === "tasks" || activeTab === "home" || activeTab === "reminders") && (
        <div style={{ position: "fixed", right: isMobile ? 12 : 24, bottom: 92, zIndex: 90, display: "flex", gap: 8 }}>
          <button onClick={rotateSort} style={{ border: "none", borderRadius: 999, padding: "10px 13px", background: "#1f2937", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: "0 10px 24px rgba(15,23,42,0.2)" }}>
            Sort: {sortLabel}
          </button>
          <button onClick={quickAddTask} style={{ border: "none", borderRadius: 999, width: 42, height: 42, background: "#1f6feb", color: "#fff", fontSize: 24, lineHeight: 1, cursor: "pointer", boxShadow: "0 10px 24px rgba(31,111,235,0.35)" }}>
            +
          </button>
          {activeTab !== "reminders" && (
            <button onClick={() => setActiveTab("reminders")} style={{ border: "none", borderRadius: 999, padding: "10px 13px", background: "#fff", color: "#1f6feb", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: "0 10px 24px rgba(15,23,42,0.15)" }}>
              Next: Reminders
            </button>
          )}
        </div>
      )}

      <TaskBottomNav tabs={navTabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
