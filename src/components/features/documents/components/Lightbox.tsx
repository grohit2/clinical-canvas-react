import * as React from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { DocItem } from "../api/documents.types";

export function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: DocItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const item = items[index];
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const last = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "+") setScale((s) => Math.min(4, s + 0.25));
      else if (e.key === "-") setScale((s) => Math.max(1, s - 0.25));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  React.useEffect(() => {
    // reset zoom when switching images
    setScale(1);
    setOffset({ x: 0, y: 0 });
    last.current = null;
  }, [index]);

  function onWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return; // pinch‑to‑zoom (trackpad) or ctrl+wheel
    e.preventDefault();
    setScale((s) => {
      const next = e.deltaY > 0 ? Math.max(1, s - 0.1) : Math.min(4, s + 0.1);
      return Number(next.toFixed(3));
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    last.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!last.current || scale === 1) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    last.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    last.current = null;
  }

  if (!item) return null;

  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 text-white">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute top-3 right-3 p-2 rounded-md bg-white/10 hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <button
        disabled={!canPrev}
        onClick={onPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30"
        aria-label="Previous"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        disabled={!canNext}
        onClick={onNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30"
        aria-label="Next"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <a
        href={item.fileUrl}
        target="_blank"
        rel="noreferrer"
        className="absolute left-3 bottom-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20"
      >
        <Download className="h-4 w-4" />
        <span className="text-xs">Open original</span>
      </a>

      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden select-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {item.isImage ? (
          <img
            src={item.fileUrl}
            alt={item.name}
            className="max-h-[90vh] max-w-[90vw]"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: last.current ? "none" : "transform 120ms ease",
            }}
            draggable={false}
            onDoubleClick={() =>
              setScale((s) => (s === 1 ? 2 : 1))
            }
          />
        ) : (
          <div className="text-sm opacity-80">Preview not available</div>
        )}
      </div>

      <div className="absolute bottom-3 right-3 text-right">
        <div className="text-xs opacity-80">{item.name}</div>
        <div className="text-[10px] opacity-60">{new Date(item.uploadedAt).toLocaleString()}</div>
      </div>
    </div>
  );
}
