import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";

interface AppShellProps {
  /**
   * Optional header configuration.
   * If not provided, no header is rendered.
   */
  headerProps?: {
    title: string;
    showBack?: boolean;
    showSearch?: boolean;
    showAdd?: boolean;
    onBack?: () => void;
    onAdd?: () => void;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    notificationCount?: number;
    onNotificationClick?: () => void;
    hideTitle?: boolean;
    showBell?: boolean;
  };

  /**
   * Whether to show the header.
   * @default true
   */
  showHeader?: boolean;

  /**
   * Whether to show the bottom navigation bar.
   * @default true
   */
  showBottomBar?: boolean;

  /**
   * Optional children to render instead of <Outlet />.
   * Use this when AppShell is not used as a route layout element.
   */
  children?: React.ReactNode;

  /**
   * Additional className for the main content area.
   */
  contentClassName?: string;
}

/**
 * Main application shell layout component.
 *
 * Provides consistent layout with:
 * - Header at top (optional)
 * - Main content area with proper padding for bottom bar
 * - Bottom navigation bar (optional)
 *
 * Can be used in two ways:
 *
 * 1. As a route layout element (uses <Outlet />):
 * ```tsx
 * <Route element={<AppShell headerProps={{ title: "Patients" }} />}>
 *   <Route path="/patients" element={<PatientsListPage />} />
 *   <Route path="/patients/:id" element={<PatientDetailPage />} />
 * </Route>
 * ```
 *
 * 2. As a wrapper component (uses children):
 * ```tsx
 * <AppShell headerProps={{ title: "Dashboard" }}>
 *   <DashboardContent />
 * </AppShell>
 * ```
 */
export function AppShell({
  headerProps,
  showHeader = true,
  showBottomBar = true,
  children,
  contentClassName = "",
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      {showHeader && headerProps && <Header {...headerProps} />}

      {/* Main content area */}
      <main
        className={`flex-1 ${showBottomBar ? "pb-20" : ""} ${contentClassName}`}
      >
        {children ?? <Outlet />}
      </main>

      {/* Bottom navigation */}
      {showBottomBar && <BottomBar />}
    </div>
  );
}

/**
 * Minimal shell with just the bottom bar.
 * Use for pages that manage their own header.
 */
export function MinimalShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-20">{children ?? <Outlet />}</main>
      <BottomBar />
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
