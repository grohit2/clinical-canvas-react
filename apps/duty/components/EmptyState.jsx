/* EmptyState.jsx — neutral empty state matching scorecard density. */

function EmptyState({ title, body, children }) {
  return (
    <div className="empty">
      <div className="title">{title}</div>
      {body ? <div className="body">{body}</div> : null}
      {children ? <div style={{marginTop: 14}}>{children}</div> : null}
    </div>
  );
}

window.EmptyState = EmptyState;
