import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowLeft, Bell, User, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { BottomBar } from "./BottomBar";
import { usePullToSearch } from "@shared/hooks/usePullToSearch";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PageShellHeaderProps {
  title: string;
  /** Show a back arrow on the left */
  showBack?: boolean;
  onBack?: () => void;
  /** Show the "+" add button (only rendered when title === "Patients" historically) */
  showAdd?: boolean;
  onAdd?: () => void;
  /** Notification bell */
  showBell?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
  /** Hide the title text completely */
  hideTitle?: boolean;
  /** Extra className for the header bar */
  className?: string;
}

export interface PageShellProps {
  /** Header configuration. If omitted the header bar is not rendered (page manages its own). */
  header?: PageShellHeaderProps;

  /** Whether to show the shared BottomBar. @default true */
  showBottomBar?: boolean;

  /**
   * Render prop / component shown inside the full-screen search overlay.
   * Receives `query`, `onQueryChange`, and `onClose`.
   * If not provided a default search input is rendered.
   */
  renderSearch?: (props: {
    query: string;
    onQueryChange: (v: string) => void;
    onClose: () => void;
  }) => React.ReactNode;

  /** Controlled search value (kept in parent so filtering works). */
  searchValue?: string;
  /** Controlled setter */
  onSearchChange?: (v: string) => void;

  /** Disable the pull-to-search gesture entirely. @default false */
  disablePullToSearch?: boolean;

  /** Extra className for the main scrollable content area. */
  contentClassName?: string;

  children: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Haptic helper                                                      */
/* ------------------------------------------------------------------ */

function triggerHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(5);
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PageShell({
  header,
  showBottomBar = true,
  renderSearch,
  searchValue: controlledQuery,
  onSearchChange: controlledOnChange,
  disablePullToSearch = false,
  contentClassName = "",
  children,
}: PageShellProps) {
  const navigate = useNavigate();

  // Local search state fallback when not controlled
  const [localQuery, setLocalQuery] = useState("");
  const searchQuery = controlledQuery ?? localQuery;
  const setSearchQuery = controlledOnChange ?? setLocalQuery;

  // Full-screen search overlay state
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  // Pull-to-search hook
  const pull = usePullToSearch({
    enabled: !disablePullToSearch && !searchOpen,
    threshold: 80,
    maxPull: 120,
    onThresholdCross: triggerHaptic,
    onTrigger: openSearch,
  });

  // Auto-focus the search input when overlay opens
  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchOpen]);

  /* ---------------------------------------------------------------- */
  /*  Pull indicator (the animated search icon shown during pull)      */
  /* ---------------------------------------------------------------- */

  const pullIndicator = (
    <AnimatePresence>
      {pull.isPulling && pull.progress > 0 && (
        <motion.div
          className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-40"
          style={{ top: 0 }}
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: Math.min(pull.progress * 1.5, 1),
            y: pull.pullOffset * 0.5,
            scale: 0.6 + pull.progress * 0.4,
          }}
          exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-full shadow-lg",
              "h-12 w-12 bg-card border",
              pull.progress >= 1
                ? "border-primary bg-primary/10"
                : "border-border",
            )}
          >
            <Search
              className={cn(
                "h-5 w-5 transition-colors",
                pull.progress >= 1 ? "text-primary" : "text-muted-foreground",
              )}
            />
          </div>
          {pull.progress >= 1 && (
            <motion.span
              className="absolute -bottom-5 text-xs font-medium text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Search
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* ---------------------------------------------------------------- */
  /*  Search overlay                                                   */
  /* ---------------------------------------------------------------- */

  const searchOverlay = (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-background flex flex-col"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40, transition: { duration: 0.18 } }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {/* Search header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b bg-card">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <Button variant="ghost" size="sm" onClick={closeSearch}>
              Cancel
            </Button>
          </div>

          {/* Custom search body or default */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderSearch ? (
              renderSearch({
                query: searchQuery,
                onQueryChange: setSearchQuery,
                onClose: closeSearch,
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                {searchQuery
                  ? `Searching for "${searchQuery}"...`
                  : "Start typing to search"}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* ---------------------------------------------------------------- */
  /*  Header bar                                                       */
  /* ---------------------------------------------------------------- */

  const headerBar = header ? (
    <header
      className={cn(
        "h-14 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-30",
        header.className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {header.showBack && (
          <Button variant="ghost" size="sm" onClick={header.onBack} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {!header.hideTitle && (
          <h1 className="text-lg font-semibold text-foreground truncate">
            {header.title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Search button (opens overlay on mobile, inline on desktop via old Header) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={openSearch}
          aria-label="Search"
          className="md:hidden"
        >
          <Search className="h-4 w-4" />
        </Button>

        {header.showAdd && (
          <Button onClick={header.onAdd} size="sm" className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        )}

        {header.showBell && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={header.onNotificationClick}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
            {(header.notificationCount ?? 0) > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-urgent text-urgent-foreground text-xs">
                {(header.notificationCount ?? 0) > 9
                  ? "9+"
                  : header.notificationCount}
              </Badge>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/profile")}
          aria-label="Profile"
        >
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  ) : null;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div
      ref={pull.containerRef}
      className="min-h-screen bg-background flex flex-col relative overscroll-y-contain"
    >
      {pullIndicator}
      {headerBar}

      <main
        className={cn(
          "flex-1",
          showBottomBar ? "pb-20" : "",
          contentClassName,
        )}
      >
        {children}
      </main>

      {showBottomBar && <BottomBar />}

      {searchOverlay}
    </div>
  );
}
