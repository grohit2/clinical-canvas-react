import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// Convert polar → screen coordinates (0°=right, 90°=up)
function toScreen(radius, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.cos(a), y: -radius * Math.sin(a) };
}

function computeArcAngles(n, startDeg, endDeg) {
  if (n <= 0) return [];
  if (n === 1) return [startDeg];
  const step = (endDeg - startDeg) / (n - 1);
  return Array.from({ length: n }, (_, i) => startDeg + i * step);
}

function useClickOutside(onOutside) {
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onOutside]);
  return ref;
}

export function ArcSpeedDial({
  radius = 100,
  startAngle = 240,
  endAngle = 120,
  items,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useClickOutside(() => setOpen(false));

  const actions = useMemo(() => {
    const baseItems = items ?? [];
    const angles = computeArcAngles(baseItems.length, startAngle, endAngle);
    return baseItems.map((a, i) => ({ ...a, angle: angles[i], radius }));
  }, [items, startAngle, endAngle, radius]);

  const positions = useMemo(
    () => actions.map((a) => ({ key: a.key, ...toScreen(a.radius, a.angle) })),
    [actions]
  );

  return (
    <div
      ref={rootRef}
      className="fixed bottom-24 right-6 z-[60] select-none"
      aria-label="Speed dial"
    >
      <AnimatePresence>
        {open && (
          <>
            {actions.map((a, idx) => {
              const p = positions.find((p) => p.key === a.key);
              const delay = 0.02 + idx * 0.05;
              return (
                <motion.button
                  key={a.key}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                  animate={{ opacity: 1, x: p.x, y: p.y, scale: 1 }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 540, damping: 28, delay }}
                  onClick={() => {
                    a.onClick?.();
                    setOpen(false);
                  }}
                  className="group absolute flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 shadow-xl shadow-sky-900/30 ring-1 ring-white/10 hover:bg-sky-400"
                  aria-label={a.label}
                  title={a.label}
                >
                  <a.Icon className="h-5 w-5" />
                  <span className="pointer-events-none absolute right-14 whitespace-nowrap rounded-full bg-neutral-800/90 px-3 py-1 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100">
                    {a.label}
                  </span>
                </motion.button>
              );
            })}
          </>
        )}
      </AnimatePresence>

      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 shadow-2xl shadow-sky-900/40 ring-1 ring-white/10"
          aria-expanded={open}
          aria-label={open ? "Close actions" : "Open actions"}
        >
          <motion.div
            initial={false}
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="grid place-items-center"
          >
            <X className="h-6 w-6" />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}
