/* TopBar.jsx — sticky header with identity + back affordance. */

function TopBar({ title, me, onBack, onChangeIdentity, right }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        {onBack ? (
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20"><path d="M12 4l-6 6 6 6" stroke="#e8eaed" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        ) : null}
        <span>{title}</span>
        {me ? <span className="me">· {me.name}</span> : null}
      </div>
      <div className="topbar-right">
        {right}
        {onChangeIdentity ? (
          <button className="icon-btn" onClick={onChangeIdentity} aria-label="Change identity">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="3" stroke="#e8eaed" strokeWidth="1.5"/>
              <path d="M3 17c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" stroke="#e8eaed" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

window.TopBar = TopBar;
