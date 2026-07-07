/* sync.js — checkpoint-driven delta polling, shared by every duty view.
   Plain script, exposes `window.dutySync`. No bundler.

   The backend keeps two append-only change feeds:
     - GET /changes?scope=…&id=…&after=<cursor>        (unified: VITALS, PNOTE,
                                                         MEDORD, MAR)
     - GET /tasks/changes?scope=…&id=…&after=<cursor>  (legacy TASKSYNC: every
                                                         task event — these do
                                                         NOT appear in the
                                                         unified feed yet)
   Both cursors are `<ISO datetime>#<eventId>` compared lexicographically, so
   a bare ISO timestamp is a valid bootstrap checkpoint ("everything after
   now").

   startDeltaPoll persists one localStorage checkpoint per feed and polls on
   an interval: an empty poll costs one tiny read; when items arrive, the
   caller's onChange refetches its view and the cursor advances past them.
   Polls skip while the tab is hidden/occluded (document.hidden) and catch up
   immediately on visibilitychange. */
(function () {
  // opts.feeds: [{ key:   localStorage checkpoint key,
  //                fetch: (after) => Promise<{items, cursor|nextCursor}>,
  //                match: optional (item) => bool — only these items count }]
  // Returns a stop() function (use as a React effect cleanup).
  function startDeltaPoll({ feeds, onChange, intervalMs = 25000 }) {
    for (const f of feeds) {
      if (!localStorage.getItem(f.key)) {
        localStorage.setItem(f.key, new Date().toISOString());
      }
    }
    let stop = false, busy = false;
    async function tick() {
      if (stop || busy || document.hidden) return;
      busy = true;
      let changed = false;
      await Promise.all(feeds.map(async (f) => {
        try {
          const after = localStorage.getItem(f.key);
          const res = await f.fetch(after);
          const cursor = res?.cursor || res?.nextCursor;
          if (cursor && cursor !== after) localStorage.setItem(f.key, cursor);
          const items = Array.isArray(res?.items) ? res.items : [];
          if (items.length > 0 && (!f.match || items.some(f.match))) changed = true;
        } catch (e) { /* transient poll failure — next tick retries */ }
      }));
      if (changed && !stop) {
        try { await onChange(); } catch (e) { /* view refresh failed — next tick retries */ }
      }
      busy = false;
    }
    const iv = setInterval(tick, intervalMs);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    tick(); // immediate catch-up from the saved checkpoint (covers time away)
    return () => {
      stop = true;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }

  window.dutySync = { startDeltaPoll };
})();
