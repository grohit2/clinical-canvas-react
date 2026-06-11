/* NowStrip.jsx — top 3 urgent tasks, single-line rows. */

const PRIORITY_W = { critical: 4, urgent: 3, important: 2, routine: 1 };

function urgencyScore(t) {
  const now = Date.now();
  const due = t.dueAt ? new Date(t.dueAt).getTime() : Number.POSITIVE_INFINITY;
  const overdueMin = due < now ? (now - due) / 60000 : 0;
  const upcomingMin = due > now && due !== Number.POSITIVE_INFINITY ? (due - now) / 60000 : 100000;
  const pri = PRIORITY_W[t.priority] || 1;
  return (overdueMin > 0 ? 100000 + Math.min(overdueMin, 10000) : 0) + pri * 1000 + Math.max(0, 10000 - upcomingMin);
}

function NowStrip({ tasks, onOpen, onSeeMore }) {
  const open = tasks.filter(t => !["done","cancelled"].includes(t.status));
  const top = [...open].sort((a,b) => urgencyScore(b) - urgencyScore(a)).slice(0, 3);
  const remaining = Math.max(0, open.length - top.length);

  if (top.length === 0) {
    return (
      <div className="now-strip">
        <div className="now-head"><span>NOW</span><span className="now-count">all caught up</span></div>
      </div>
    );
  }

  return (
    <div className="now-strip">
      <div className="now-head">
        <span>NOW · {open.length}</span>
        {remaining > 0 && (
          <button className="now-more-inline" onClick={onSeeMore}>see {remaining} more →</button>
        )}
      </div>
      {top.map(t => (
        <TaskRow key={t.taskId} task={t} onOpen={onOpen} />
      ))}
    </div>
  );
}

window.NowStrip = NowStrip;
window.urgencyScore = urgencyScore;
