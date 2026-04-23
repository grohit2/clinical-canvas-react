// Full-screen document lightbox with zoom and pan support
import React, { useEffect, useState, useRef, useCallback } from "react";
import type { DocumentItem } from "../model/types";

interface DocumentLightboxProps {
  document: DocumentItem;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function DocumentLightbox({
  document,
  currentIndex,
  totalCount,
  onClose,
  onNavigate,
  canNavigatePrev,
  canNavigateNext,
}: DocumentLightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lastPan = useRef<{ x: number; y: number } | null>(null);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef<number>(0);
  const movedRef = useRef(false);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  // Reset zoom when document changes
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    lastPan.current = null;
    activePointers.current.clear();
    pinchStart.current = null;
  }, [document.id]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && canNavigatePrev) onNavigate("prev");
      if (e.key === "ArrowRight" && canNavigateNext) onNavigate("next");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNavigate, canNavigatePrev, canNavigateNext]);

  // Swipe detection
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    swipeRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (swipeRef.current == null) return;
      const dx = e.clientX - swipeRef.current.x;
      const dy = e.clientY - swipeRef.current.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      swipeRef.current = null;
      if (absX > 3 || absY > 3) movedRef.current = true;
      if (absX > 40 && absX > absY && scale === 1) {
        if (dx < 0 && canNavigateNext) onNavigate("next");
        else if (dx > 0 && canNavigatePrev) onNavigate("prev");
      }
    },
    [scale, canNavigateNext, canNavigatePrev, onNavigate]
  );

  // Zoom with wheel (ctrl/cmd + wheel)
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setScale((s) => clamp(s + (e.deltaY > 0 ? -0.1 : 0.1), MIN_SCALE, MAX_SCALE));
  }, []);

  // Pan and pinch handlers
  const onLbPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.current.size === 1) {
        lastPan.current = { x: e.clientX, y: e.clientY };
      } else if (activePointers.current.size === 2) {
        const pts = Array.from(activePointers.current.values());
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        pinchStart.current = { dist: Math.hypot(dx, dy), scale };
        lastPan.current = null;
      }
    },
    [scale]
  );

  const onLbPointerMove = useCallback((e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2 && pinchStart.current) {
      const pts = Array.from(activePointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy) || 1;
      const nextScale = clamp(
        pinchStart.current.scale * (dist / (pinchStart.current.dist || 1)),
        MIN_SCALE,
        MAX_SCALE
      );
      setScale(nextScale);
      return;
    }

    if (lastPan.current) {
      setScale((currentScale) => {
        if (currentScale > 1 && lastPan.current) {
          const dx = e.clientX - lastPan.current.x;
          const dy = e.clientY - lastPan.current.y;
          setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
          lastPan.current = { x: e.clientX, y: e.clientY };
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) movedRef.current = true;
        }
        return currentScale;
      });
    }
  }, []);

  const onLbPointerUp = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchStart.current = null;
    if (activePointers.current.size === 0) lastPan.current = null;
  }, []);

  const onDoubleClick = useCallback(() => {
    if (scale === 1) {
      setScale(2);
    } else {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [scale]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      // Double-tap support
      const now = Date.now();
      const delta = now - lastTap.current;
      lastTap.current = now;
      if (delta < 300) {
        onDoubleClick();
        return;
      }
      // Suppress close if there was a drag/pan
      if (movedRef.current) {
        movedRef.current = false;
        return;
      }
      // Close when clicking backdrop (not the image)
      const path: EventTarget[] = (e as any).nativeEvent?.composedPath?.() || [];
      if (imgRef.current && path.includes(imgRef.current)) return;
      onClose();
    },
    [onClose, onDoubleClick]
  );

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 text-white"
      role="dialog"
      aria-modal="true"
      onClick={onClick}
      onPointerDown={(e) => {
        onPointerDown(e);
        onLbPointerDown(e);
      }}
      onPointerMove={onLbPointerMove}
      onPointerUp={(e) => {
        onPointerUp(e);
        onLbPointerUp(e);
      }}
      onWheel={onWheel}
      style={{ touchAction: "none" }}
    >
      {/* Close button */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute top-3 right-3 p-2 rounded-md bg-white/10 hover:bg-white/20 z-10"
      >
        ×
      </button>

      {/* Navigation buttons */}
      <button
        disabled={!canNavigatePrev}
        onClick={(e) => {
          e.stopPropagation();
          if (canNavigatePrev) onNavigate("prev");
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 z-10"
        aria-label="Previous"
      >
        ‹
      </button>

      <button
        disabled={!canNavigateNext}
        onClick={(e) => {
          e.stopPropagation();
          if (canNavigateNext) onNavigate("next");
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 z-10"
        aria-label="Next"
      >
        ›
      </button>

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm opacity-80 z-10">
        {currentIndex + 1} / {totalCount}
      </div>

      {/* Image container */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden select-none">
        {document.fileUrl ? (
          <img
            src={document.fileUrl}
            alt={document.name}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            draggable={false}
            onDoubleClick={onDoubleClick}
            ref={imgRef}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: activePointers.current.size ? "none" : "transform 120ms ease",
            }}
          />
        ) : (
          <div className="text-sm opacity-80">Preview not available</div>
        )}
      </div>
    </div>
  );
}
