import { useState, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// CLINICAL CANVAS — WARD REGISTER v3 (freeze pane)
//  Col 1 (POD · Name · MRN · Dx · Vitals · Labs) is FROZEN —
//  always pinned to the left edge.
//  Morning / Afternoon / Night slide horizontally underneath it,
//  with scroll-snap so each swipe lands cleanly on a column.
//  All 9 patients remain visible vertically (no vertical scroll);
//  only the shift columns slide.
// ─────────────────────────────────────────────────────────────

const C = {
  ink: "#1A2433", dim: "#69788E", line: "#D8DFE9", paper: "#FBFCFE", margin: "#F2F5FA",
  good: "#1B7A3D", bad: "#C62828",
  todo: "#E53935", prog: "#EF6C00", done: "#2E7D32", pend: "#1565C0",
};
const STATES = ["todo", "prog", "done", "pend"];
const SMETA = {
  todo: { dot: C.todo, label: "To-do", sym: "●" },
  prog: { dot: C.prog, label: "In progress", sym: "◐" },
  done: { dot: C.done, label: "Done", sym: "✓" },
  pend: { dot: C.pend, label: "Pending", sym: "⏸" },
};

const lab = (n, prev, curr, good) => ({ n, prev, curr, good });
const w = (text, state = "todo") => ({ text, state });

const seed = [
  {
    pod: "POD-3", name: "ANKAMMA", mrn: "481223", dx: "Duodenal perf — ex-lap + Mod. Graham's patch",
    vit: "150/90 · 74 · 100% · 37.2°", params: "⒭subhep 120ml · pelvic 25ml · I/O 1685/1777",
    labs: [lab("Hb", "7.9", "9.4", true), lab("Creat", "5.23", "3.52", true), lab("WBC", "23.3k", "22.1k", true), lab("Alb", null, "2.45", false)],
    morning: [w("Repeat RFT + electrolytes", "prog"), w("Chase albumin report", "pend"), w("Dressing change"), w("CBC sent", "done")],
    afternoon: { pending: ["Albumin report f/u"], todo: ["Assess Ryles removal", "Mobilize to chair"] },
    night: { bp: "", hr: "", spo2: "", grbs: "", uo: "" },
  },
  {
    pod: "POD-0", name: "SRIRAM", mrn: "481547", dx: "s/p BKA ⒭ — diabetic foot",
    vit: "140/80 · 82 · 98% · 37.0°", params: "Stump drain 30ml",
    labs: [lab("GRBS", "242", "178", true), lab("Hb", null, "11.1", false)],
    morning: [w("Stump inspection"), w("Endo review call", "prog"), w("IV antibiotics", "done")],
    afternoon: { pending: ["Endo review"], todo: ["GRBS 6pm"] },
    night: { bp: "", hr: "", spo2: "", grbs: "", uo: "" },
  },
  {
    pod: "POD-0", name: "SRINIVASULU", mrn: "481602", dx: "s/p Fistulectomy + LIS",
    vit: "124/78 · 76 · 99% · 36.8°", params: "",
    labs: [],
    morning: [w("Sitz bath teaching"), w("Oral analgesia", "done"), w("Wound check")],
    afternoon: { pending: [], todo: ["Assess for discharge"] },
    night: { bp: "", hr: "", spo2: "", grbs: "", uo: "" },
  },
  {
    pod: "POD-1/2", name: "VENKATESWARLU", mrn: "480911", dx: "Duodenal perf closure + T-tube gastrostomy + FJ — ICU, ventilated",
    vit: "108/64 · 102 · 96% · 38.1°", params: "ICD air leak + · PEEP 8 FiO₂ 50% · I/O 1200/1500",
    labs: [lab("Na", "141", "146", false), lab("K", "4.7", "4.2", true)],
    morning: [w("ABG", "prog"), w("T-tube output chart"), w("CXR portable", "pend"), w("Sedation review")],
    afternoon: { pending: ["CXR report"], todo: ["Wean trial if ABG ok"] },
    night: { bp: "", hr: "", spo2: "", grbs: "", uo: "" },
  },
  {
    pod: "D-6", name: "KRISHNAIAH", mrn: "481388", dx: "⒭ LL cellulitis — Aug + Clinda",
    vit: "130/82 · 78 · 98% · 37.4°", params: "Erythema regressing",
    labs: [lab("TLC", "13.2k", "9.4k", true)],
    morning: [w("Limb elevation", "done"), w("Mark erythema edge", "done"), w("Afebrile chart review", "prog")],
    afternoon: { pending: [], todo: ["Discharge if afebrile 24h"] },
    night: { bp: "", hr: "", spo2: "", grbs: "", uo: "" },
  },
  {
    pod: "POD-3", name: "BUJJI REDDY", mrn: "481450", dx: "s/p BKA — Piptaz D5",
    vit: "126/80 · 80 · 97% · 36.9°", params: "",
    labs: [lab("K", null, "3.5", false), lab("Na", null, "138", true)],
    morning: [w("Stump dressing"), w("K⁺ correction syp", "prog"), w("Pulmo review call", "pend")],
    afternoon: { pending: ["Pulmo review"], todo: ["Discharge planning note"] },
    night: { bp: "", hr: "", spo2: "", grbs: "", uo: "" },
  },
  {
    pod: "POD-5", name: "VENKATESWARLU (2)", mrn: "480874", dx: "s/p Fasciotomy ⒧ LL",
    vit: "118/76 · 74 · 99% · 36.7°", params: "Wound granulating",
    labs: [],
    morning: [w("Med review (K⁺)", "done"), w("Pulmo review — dsch meds", "pend")],
    afternoon: { pending: ["Pulmo review"], todo: ["DISCH. T/m — summary draft"] },
    night: { bp: "", hr: "", spo2: "", grbs: "", uo: "" },
  },
  {
    pod: "POD-4", name: "POLAMMA", mrn: "481119", dx: "s/p Forefoot amputation — DM",
    vit: "134/84 · 84 · 98% · 37.0°", params: "",
    labs: [lab("GRBS", "186", "154", true)],
    morning: [w("Insulin chart", "done"), w("Derma biopsy f/u", "pend"), w("Wound dressing", "done")],
    afternoon: { pending: ["Biopsy report"], todo: [] },
    night: { bp: "", hr: "", spo2: "", grbs: "", uo: "" },
  },
  {
    pod: "—", name: "SARADA", mrn: "481533", dx: "Non-healing ulcer ⒭ LL (dorsal) — w/u",
    vit: "122/78 · 80 · 98% · 36.8°", params: "Doppler: triphasic",
    labs: [lab("Hb", null, "8.4", false), lab("TLC", null, "6.5k", true)],
    morning: [w("Wound swab C/S", "prog"), w("Daily dressing", "done"), w("Derma ref — biopsy", "pend")],
    afternoon: { pending: ["Derma biopsy slot"], todo: ["Start iron correction"] },
    night: { bp: "", hr: "", spo2: "", grbs: "", uo: "" },
  },
];

// column widths: frozen pane + sliding panes
const FROZEN_W = 250;
const SHIFT_W = { morning: 240, afternoon: 210, night: 230 };
const VIT_FIELDS = [["bp", "BP"], ["hr", "HR"], ["spo2", "SpO₂"], ["grbs", "GRBS"], ["uo", "UO"]];

function LabChip({ l }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 2, marginRight: 7, whiteSpace: "nowrap" }}>
      <b style={{ fontSize: 9.5, color: C.dim }}>{l.n}</b>
      {l.prev && <span style={{ fontSize: 9.5, color: "#9AA7B8", textDecoration: "line-through" }}>{l.prev}</span>}
      {l.prev && <span style={{ fontSize: 9, color: l.good ? C.good : C.bad }}>→</span>}
      <b style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace", color: l.good ? C.good : l.prev ? C.bad : C.ink }}>{l.curr}</b>
    </span>
  );
}

function WorkItem({ item, onTap }) {
  const m = SMETA[item.state];
  const done = item.state === "done";
  return (
    <button onClick={onTap} title={m.label} style={{
      display: "flex", alignItems: "center", gap: 4, width: "100%", textAlign: "left",
      background: "transparent", border: "none", padding: "1px 1px", cursor: "pointer", minWidth: 0,
    }}>
      <span style={{ fontSize: 9, color: m.dot, flexShrink: 0, width: 11 }}>{m.sym}</span>
      <span style={{
        fontSize: 11, lineHeight: "15px", fontWeight: 500,
        color: done ? "#A8B3C2" : C.ink, textDecoration: done ? "line-through" : "none",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{item.text}</span>
    </button>
  );
}

function Counts({ items }) {
  const c = (s) => items.filter((i) => i.state === s).length;
  return (
    <span style={{ display: "inline-flex", gap: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 800 }}>
      {STATES.map((s) => c(s) > 0 && <span key={s} style={{ color: SMETA[s].dot }}>{SMETA[s].sym}{c(s)}</span>)}
    </span>
  );
}

export default function WardRegisterFreeze() {
  const [rows, setRows] = useState(seed);
  const scroller = useRef(null);

  const cycle = (r, i) =>
    setRows((rs) => rs.map((row, ri) => ri !== r ? row : {
      ...row,
      morning: row.morning.map((it, ii) => ii !== i ? it : { ...it, state: STATES[(STATES.indexOf(it.state) + 1) % 4] }),
    }));

  const strikeAft = (r, group, i) =>
    setRows((rs) => rs.map((row, ri) => ri !== r ? row : {
      ...row,
      afternoon: { ...row.afternoon, [group]: row.afternoon[group].map((t, ii) => ii !== i ? t : (t.startsWith("~") ? t.slice(1) : "~" + t)) },
    }));

  const setNight = (r, k, v) =>
    setRows((rs) => rs.map((row, ri) => ri !== r ? row : { ...row, night: { ...row.night, [k]: v } }));

  const jumpTo = (key) => {
    const el = scroller.current?.querySelector(`[data-col="${key}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  const baseCell = { borderBottom: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}`, padding: "4px 7px", minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 1 };
  const subLabel = { fontSize: 8.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.dim };
  const totalW = FROZEN_W + SHIFT_W.morning + SHIFT_W.afternoon + SHIFT_W.night;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.paper, fontFamily: "'Inter',system-ui,sans-serif", overflow: "hidden" }}>
      {/* top bar with quick-jump tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderBottom: `2px solid ${C.ink}`, flexShrink: 0 }}>
        <b style={{ fontSize: 13.5, color: C.ink }}>Ward Register</b>
        <span style={{ fontSize: 10.5, color: C.dim }}>9 patients · slide ⟷</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[["morning", "Morning"], ["afternoon", "Afternoon"], ["night", "Night"]].map(([k, lbl]) => (
            <button key={k} onClick={() => jumpTo(k)} style={{
              border: `1px solid ${C.line}`, background: "#fff", borderRadius: 7, padding: "4px 10px",
              fontSize: 11, fontWeight: 700, color: C.ink, cursor: "pointer",
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* ONE horizontal scroller; first column sticky-left inside it */}
      <div ref={scroller} style={{
        flex: 1, overflowX: "auto", overflowY: "hidden",
        scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch",
      }}>
        <div style={{ minWidth: totalW, height: "100%", display: "flex", flexDirection: "column" }}>

          {/* header row */}
          <div style={{ display: "flex", flexShrink: 0, borderBottom: `1.5px solid ${C.ink}` }}>
            <div style={{
              ...baseCell, borderBottom: "none", width: FROZEN_W, flexShrink: 0, background: C.margin,
              position: "sticky", left: 0, zIndex: 3, boxShadow: "4px 0 8px -4px rgba(20,40,80,0.18)",
            }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.dim }}>Patient · Dx · Vitals · Labs</span>
            </div>
            {[["morning", "Morning — works"], ["afternoon", "Afternoon — pending / to-do"], ["night", "Night — vitals & parameters"]].map(([k, h]) => (
              <div key={k} data-col={k} style={{ ...baseCell, borderBottom: "none", width: SHIFT_W[k], flexShrink: 0, background: C.margin, scrollSnapAlign: "start" }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.dim }}>{h}</span>
              </div>
            ))}
          </div>

          {/* 9 rows share remaining height */}
          <div style={{ flex: 1, display: "grid", gridTemplateRows: `repeat(${rows.length}, 1fr)`, minHeight: 0 }}>
            {rows.map((p, r) => (
              <div key={r} style={{ display: "flex", minHeight: 0 }}>

                {/* FROZEN column 1 */}
                <div style={{
                  ...baseCell, width: FROZEN_W, flexShrink: 0, background: "#fff",
                  position: "sticky", left: 0, zIndex: 2,
                  boxShadow: "4px 0 8px -4px rgba(20,40,80,0.18)",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 8.5, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", border: `1.5px solid ${C.ink}`, borderRadius: 3, padding: "0 3px", flexShrink: 0 }}>{p.pod}</span>
                    <b style={{ fontSize: 11.5, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</b>
                    <span style={{ fontSize: 9, color: C.dim, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>{p.mrn}</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: C.dim, lineHeight: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.dx}</div>
                  <div style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono',monospace", color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.vit}{p.params && <span style={{ color: "#7B5EA7" }}> · {p.params}</span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", rowGap: 1, overflow: "hidden" }}>
                    {p.labs.map((l, i) => <LabChip key={i} l={l} />)}
                  </div>
                </div>

                {/* SLIDING: Morning */}
                <div style={{ ...baseCell, width: SHIFT_W.morning, flexShrink: 0, scrollSnapAlign: "start" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={subLabel}>Works</span>
                    <Counts items={p.morning} />
                  </div>
                  {p.morning.map((it, i) => <WorkItem key={i} item={it} onTap={() => cycle(r, i)} />)}
                </div>

                {/* SLIDING: Afternoon */}
                <div style={{ ...baseCell, width: SHIFT_W.afternoon, flexShrink: 0, scrollSnapAlign: "start" }}>
                  {p.afternoon.pending.length > 0 && <>
                    <span style={{ ...subLabel, color: C.pend }}>Pending</span>
                    {p.afternoon.pending.map((t, i) => {
                      const struck = t.startsWith("~");
                      return (
                        <button key={i} onClick={() => strikeAft(r, "pending", i)} style={{ textAlign: "left", background: "none", border: "none", padding: "1px 0", cursor: "pointer", fontSize: 11, lineHeight: "15px", color: struck ? "#A8B3C2" : C.pend, fontWeight: 600, textDecoration: struck ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {struck ? t.slice(1) : t}
                        </button>
                      );
                    })}
                  </>}
                  {p.afternoon.todo.length > 0 && <>
                    <span style={{ ...subLabel, marginTop: 2 }}>To-do</span>
                    {p.afternoon.todo.map((t, i) => {
                      const struck = t.startsWith("~");
                      return (
                        <button key={i} onClick={() => strikeAft(r, "todo", i)} style={{ textAlign: "left", background: "none", border: "none", padding: "1px 0", cursor: "pointer", fontSize: 11, lineHeight: "15px", color: struck ? "#A8B3C2" : C.ink, textDecoration: struck ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {struck ? t.slice(1) : t}
                        </button>
                      );
                    })}
                  </>}
                </div>

                {/* SLIDING: Night */}
                <div style={{ ...baseCell, width: SHIFT_W.night, flexShrink: 0, borderRight: "none", scrollSnapAlign: "start" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
                    {VIT_FIELDS.map(([k, lbl]) => (
                      <label key={k} style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ fontSize: 7.5, fontWeight: 800, color: C.dim, textTransform: "uppercase" }}>{lbl}</span>
                        <input value={p.night[k]} onChange={(e) => setNight(r, k, e.target.value)} placeholder="—"
                          style={{ width: "100%", border: "none", borderBottom: `1px dashed ${C.line}`, background: "transparent", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.ink, padding: 0, outline: "none" }} />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}