/* PatientDocs.jsx — PDDocsView: patient document library (Docs tab).
   Folder cards → category grid → lightbox; upload via presign → S3 PUT → attach.
   Loaded before PatientTasks.jsx. Global: window.PDDocsView. */

// category (DDB attach name) ↔ ui key (GET /documents) ↔ docType (presign) ↔ label/icon
const PD_DOC_CATS = [
  { cat: "preop_pics",     ui: "preopPics",     docType: "preop",     label: "Pre-op photos",   icon: "ti-camera",         color: "var(--pd-blu)" },
  { cat: "lab_reports",    ui: "labReports",    docType: "lab",       label: "Lab reports",     icon: "ti-file-text",      color: "var(--pd-grn)" },
  { cat: "radiology",      ui: "radiology",     docType: "radiology", label: "Radiology",       icon: "ti-scan",           color: "var(--pd-pur)" },
  { cat: "intraop_pics",   ui: "intraopPics",   docType: "intraop",   label: "Intra-op photos", icon: "ti-scissors",       color: "var(--pd-yel)" },
  { cat: "ot_notes",       ui: "otNotes",       docType: "otnotes",   label: "OT notes",        icon: "ti-clipboard-text", color: "var(--pd-f1)"  },
  { cat: "postop_pics",    ui: "postopPics",    docType: "postop",    label: "Post-op photos",  icon: "ti-bandage",        color: "var(--pd-blu)" },
  { cat: "discharge_pics", ui: "dischargePics", docType: "discharge", label: "Discharge",       icon: "ti-file-check",     color: "var(--pd-grn)" },
];

const PD_DOC_MIME_OK = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function pdDocIsImage(entry) {
  const mime = entry.mimeType || "";
  if (mime.startsWith("image/")) return true;
  const ext = ((entry.key || "").split(".").pop() || "").toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp"].includes(ext);
}
function pdDocName(entry) {
  return entry.caption || (entry.key || "file").split("/").pop();
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function PDDocLightbox({ items, index, onClose, onStep }) {
  const [zoom, setZoom] = React.useState(1);
  const item = items[index];
  React.useEffect(() => { setZoom(1); }, [index]);
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onStep(1);
      if (e.key === "ArrowLeft")  onStep(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onStep]);
  if (!item) return null;
  return (
    <div className="pd-lb" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pd-lb-top">
        <span className="pd-lb-name">{pdDocName(item.entry)}</span>
        <span className="pd-lb-ctl">
          <button onClick={() => setZoom(z => Math.max(1, z - 0.5))}><i className="ti ti-zoom-out" /></button>
          <button onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom(z => Math.min(5, z + 0.5))}><i className="ti ti-zoom-in" /></button>
          <button onClick={onClose}><i className="ti ti-x" /></button>
        </span>
      </div>
      <div className="pd-lb-body">
        <img src={item.url} alt={pdDocName(item.entry)} style={{ transform: `scale(${zoom})` }} />
      </div>
      {items.length > 1 && (
        <React.Fragment>
          <button className="pd-lb-nav prev" onClick={() => onStep(-1)}><i className="ti ti-chevron-left" /></button>
          <button className="pd-lb-nav next" onClick={() => onStep(1)}><i className="ti ti-chevron-right" /></button>
        </React.Fragment>
      )}
    </div>
  );
}

// ── Docs view ─────────────────────────────────────────────────────────────────

function PDDocsView({ patientId }) {
  const [docs, setDocs]       = React.useState(null);
  const [err, setErr]         = React.useState(null);
  const [cat, setCat]         = React.useState(null);      // ui key of open category
  const [urls, setUrls]       = React.useState({});        // key → presigned url (cdnUrl fallback)
  const [lb, setLb]           = React.useState(null);      // { items, index }
  const [busy, setBusy]       = React.useState(null);      // "Uploading 1/3…" etc.
  const fileRef               = React.useRef(null);

  async function load() {
    setErr(null);
    try { setDocs(await window.api.getDocuments(patientId)); }
    catch (e) { setErr(e.message || String(e)); }
  }
  React.useEffect(() => { load(); }, [patientId]);

  // Resolve a viewable URL for an entry: cdnUrl if present, else presigned GET.
  async function urlFor(entry) {
    if (entry.cdnUrl) return entry.cdnUrl;
    if (urls[entry.key]) return urls[entry.key];
    const r = await window.api.presignFileDownload(patientId, entry.key);
    if (r?.url) setUrls(u => ({ ...u, [entry.key]: r.url }));
    return r?.url || null;
  }

  // Pre-resolve URLs when a category opens (patient doc counts are small).
  React.useEffect(() => {
    if (!cat || !docs) return;
    const entries = (docs[cat] || []).filter(e => !e.cdnUrl && !urls[e.key]);
    entries.forEach(e => { urlFor(e).catch(() => {}); });
  }, [cat, docs]);

  async function openEntry(entry, list) {
    const url = await urlFor(entry);
    if (!url) return;
    if (!pdDocIsImage(entry)) { window.open(url, "_blank"); return; }
    const imgs = [];
    for (const e of list) {
      if (!pdDocIsImage(e)) continue;
      const u = e.cdnUrl || urls[e.key] || (e === entry ? url : null);
      if (u) imgs.push({ entry: e, url: u });
    }
    const idx = Math.max(0, imgs.findIndex(i => i.entry.key === entry.key));
    setLb({ items: imgs, index: idx });
  }

  async function removeEntry(catDef, entry) {
    if (!window.confirm(`Remove "${pdDocName(entry)}" from ${catDef.label}?`)) return;
    try {
      await window.api.detachDocument(patientId, { category: catDef.cat, key: entry.key });
      load();
    } catch (e) { alert("Could not remove: " + (e.message || e)); }
  }

  async function onFiles(ev) {
    const catDef = PD_DOC_CATS.find(c => c.ui === cat);
    const files = Array.from(ev.target.files || []);
    ev.target.value = "";
    if (!catDef || files.length === 0) return;
    const me = window.api.getIdentity ? window.api.getIdentity() : null;
    let i = 0;
    for (const file of files) {
      i++;
      setBusy(`Uploading ${i}/${files.length}…`);
      try {
        if (!PD_DOC_MIME_OK.includes(file.type)) {
          alert(`${file.name}: only JPEG / PNG / WebP / AVIF images are supported`);
          continue;
        }
        const pre = await window.api.presignUpload(patientId, {
          filename: file.name, mimeType: file.type,
          kind: "doc", docType: catDef.docType,
          quality: 80, maxW: 1600,
        });
        const put = await fetch(pre.uploadUrl, { method: "PUT", body: file, headers: pre.headers || {} });
        if (!put.ok) throw new Error(`S3 upload failed (${put.status})`);
        // Attach directly — idempotent; the S3-event auto-attach is the fallback.
        await window.api.attachDocument(patientId, {
          category: catDef.cat, key: pre.key,
          uploadedBy: me?.name || me?.userId || null,
          mimeType: file.type, size: file.size,
        });
      } catch (e) {
        alert(`${file.name}: ${e.message || e}`);
      }
    }
    setBusy(null);
    load();
  }

  if (err)   return <EmptyState title="Could not load documents" body={err} />;
  if (!docs) return <div className="pd-dc-loading">Loading documents…</div>;

  // ── Category detail ──
  if (cat) {
    const catDef  = PD_DOC_CATS.find(c => c.ui === cat);
    const entries = docs[cat] || [];
    return (
      <div>
        <div className="pd-dc-head">
          <button className="pd-dc-back" onClick={() => setCat(null)}><i className="ti ti-arrow-left" /></button>
          <span className="pd-dc-title"><i className={`ti ${catDef.icon}`} style={{ color: catDef.color }} /> {catDef.label}</span>
          <span className="pd-dc-count">{entries.length}</span>
          <button className="pd-dc-add" onClick={() => fileRef.current && fileRef.current.click()} disabled={!!busy}>
            <i className="ti ti-plus" /> {busy || "Add photo"}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple
          style={{ display: "none" }} onChange={onFiles} />
        {entries.length === 0 && (
          <div className="pd-dc-loading">No files in {catDef.label} yet — tap “Add photo” to upload.</div>
        )}
        <div className="pd-dc-grid">
          {entries.map(e => (
            <div key={e.key} className="pd-dc-tile" onClick={() => openEntry(e, entries)}>
              {pdDocIsImage(e) && (e.cdnUrl || urls[e.key])
                ? <img src={e.cdnUrl || urls[e.key]} alt={pdDocName(e)} loading="lazy" />
                : <span className="pd-dc-fileic"><i className={`ti ${pdDocIsImage(e) ? "ti-photo" : "ti-file"}`} /></span>}
              <span className="pd-dc-cap">{pdDocName(e)}</span>
              {e.stamp?.label && <span className="pd-dc-stamp">{e.stamp.label}</span>}
              <button className="pd-dc-del" onClick={ev => { ev.stopPropagation(); removeEntry(catDef, e); }}>
                <i className="ti ti-x" />
              </button>
            </div>
          ))}
        </div>
        {lb && (
          <PDDocLightbox items={lb.items} index={lb.index}
            onClose={() => setLb(null)}
            onStep={d => setLb(s => ({ ...s, index: (s.index + d + s.items.length) % s.items.length }))} />
        )}
      </div>
    );
  }

  // ── Folder cards ──
  const total = PD_DOC_CATS.reduce((n, c) => n + (docs[c.ui] || []).length, 0);
  return (
    <div>
      <div className="pd-sec">Documents {total > 0 ? `· ${total}` : ""}</div>
      <div className="pd-dc-folders">
        {PD_DOC_CATS.map(c => {
          const n = (docs[c.ui] || []).length;
          return (
            <button key={c.ui} className="pd-dc-folder" onClick={() => setCat(c.ui)}>
              <i className={`ti ${c.icon}`} style={{ color: c.color }} />
              <span className="t">{c.label}</span>
              <span className={`n${n === 0 ? " zero" : ""}`}>{n === 0 ? "—" : n}</span>
              <i className="ti ti-chevron-right chev" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.PDDocsView = PDDocsView;
