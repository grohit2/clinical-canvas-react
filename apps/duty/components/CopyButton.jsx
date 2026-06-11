/* CopyButton.jsx — uniform copy affordance.
   Accepts either `text` (string) or `getText` (async returning string).
   Shows toast via window.clip.copy on success. */

function CopyButton({ label, text, getText, confirmMsg, style }) {
  const [busy, setBusy] = React.useState(false);
  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      const s = getText ? await getText() : text;
      await window.clip.copy(s, confirmMsg || `Copied ${label}`);
    } catch (e) {
      window.clip.showToast("Copy failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button className="copy-btn" onClick={onClick} disabled={busy} style={style}>
      <svg className="icon" viewBox="0 0 16 16" fill="none">
        <rect x="4" y="4" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M3 3h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M3 3v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      {label}
    </button>
  );
}

window.CopyButton = CopyButton;
