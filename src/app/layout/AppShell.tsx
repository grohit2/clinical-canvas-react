import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Minimal shell – just passes through to child pages.
 * Pages use <PageShell> for header, bottom bar, and pull-to-search.
 */
export function MinimalShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">{children ?? <Outlet />}</main>
    </div>
  );
}

/**
 * Shell variant with no chrome (no header, no bottom bar).
 * Use for fullscreen experiences like lightboxes, onboarding, etc.
 */
export function FullscreenShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children ?? <Outlet />}
    </div>
  );
}
