/* clipboard.js — copy text with a toast confirmation. */
(function () {
  const TOAST_DURATION_MS = 1600;
  let toastEl = null;
  let toastTimer = null;

  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    if (toastEl) toastEl.remove();
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    toastEl.textContent = msg;
    document.body.appendChild(toastEl);
    toastTimer = setTimeout(() => { if (toastEl) toastEl.remove(); toastEl = null; }, TOAST_DURATION_MS);
  }

  async function copy(text, confirmMsg = "Copied") {
    if (text === null || text === undefined) { showToast("Nothing to copy"); return false; }
    const s = typeof text === "string" ? text : JSON.stringify(text, null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(s);
      } else {
        const ta = document.createElement("textarea");
        ta.value = s; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      showToast(confirmMsg);
      return true;
    } catch (e) {
      showToast("Copy failed");
      return false;
    }
  }

  window.clip = { copy, showToast };
})();
