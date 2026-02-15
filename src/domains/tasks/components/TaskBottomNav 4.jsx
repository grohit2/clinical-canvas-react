import React from "react";

export function TaskBottomNav({ tabs, activeTab, onTabChange }) {
  const enabledTabs = tabs.filter((tab) => tab.enabled !== false);

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 120,
        background: "#fff",
        borderTop: "1px solid rgba(20, 23, 31, 0.08)",
        boxShadow: "0 -10px 24px rgba(16, 24, 40, 0.08)",
        padding: "7px 8px calc(7px + env(safe-area-inset-bottom))",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: `repeat(${enabledTabs.length}, minmax(0, 1fr))`,
          gap: 4,
        }}
      >
        {enabledTabs.map((tab) => {
          const active = activeTab === tab.id;
          const hasBadge = tab.badge !== undefined && tab.badge !== null && tab.badge !== false;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                border: "none",
                background: active ? "rgba(87, 155, 252, 0.12)" : "transparent",
                borderRadius: 12,
                color: active ? "#1f6feb" : "#6b7280",
                cursor: "pointer",
                padding: "7px 4px",
                fontFamily: "inherit",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                minHeight: 46,
              }}
              aria-current={active ? "page" : undefined}
              aria-label={tab.label}
              title={tab.label}
            >
              <div style={{ position: "relative", fontSize: 16, lineHeight: 1 }}>
                {tab.icon}
                {hasBadge && (
                  <span
                    style={{
                      position: "absolute",
                      top: -7,
                      right: -10,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 999,
                      background: "#df2f4a",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                    }}
                  >
                    {typeof tab.badge === "number" && tab.badge > 99 ? "99+" : String(tab.badge)}
                  </span>
                )}
                {!hasBadge && tab.dot && (
                  <span
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -5,
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: "#df2f4a",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 600,
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default TaskBottomNav;
