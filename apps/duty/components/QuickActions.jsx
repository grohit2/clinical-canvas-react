/* QuickActions.jsx — sticky bottom action panel for a task. */

const ACTIONS_BY_STATUS = {
  todo:        ["start", "done", "pending", "block"],
  in_progress: ["done", "pending", "block"],
  pending:     ["done", "block"],
  blocked:     ["start", "done"],
  done:        [],
  cancelled:   [],
};

const ACTION_LABELS = {
  start: "Start",
  done: "Done",
  pending: "Pending",
  block: "Block",
};
const ACTION_CLASS = {
  start: "primary",
  done: "success",
  pending: "",
  block: "danger",
};

function QuickActions({ task, onAction }) {
  const actions = ACTIONS_BY_STATUS[task.status] || [];
  if (actions.length === 0) return null;
  return (
    <div className="qactions">
      {actions.map((a) => (
        <button key={a} className={`qa-btn ${ACTION_CLASS[a] || ""}`} onClick={() => onAction(a)}>
          {ACTION_LABELS[a]}
        </button>
      ))}
    </div>
  );
}

window.QuickActions = QuickActions;
