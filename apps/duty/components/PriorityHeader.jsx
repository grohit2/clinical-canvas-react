/* PriorityHeader.jsx — section divider for urgency-grouped view.
   Uses the same DOM shape and styles as `.group-header` so both views
   share a single visual language. */

const LABELS = {
  overdue: "Overdue",
  now:     "Due now",
  pending: "Pending",
  later:   "Later today",
  done:    "Done",
};

function PriorityHeader({ bucket, count }) {
  return (
    <div className={`group-header bucket-${bucket}`}>
      <span className="dot"></span>
      <span className="label">{LABELS[bucket] || bucket}</span>
      <span className="cnt">{count}</span>
    </div>
  );
}

window.PriorityHeader = PriorityHeader;
