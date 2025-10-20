import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { paths } from "@/app/navigation";

/** ---------------- Types ---------------- */
type GroupKey = "Orders" | "Notes & Docs" | "Records & Results" | "Monitoring" | "Other";

type ActionItem = {
  code: string;                             // "IO", "MO", ...
  label: string;                            // "Investigation Order", ...
  emoji?: string;                           // optional 🧪 etc (for extra affordance)
  group: GroupKey;
  to?: (patientId: string) => string;       // route builder if implemented
  enabled?: boolean;                        // clickable if true
};

/** ---------------- Registry ----------------
 * Keep routes centralized here. Enabled == implemented.
 */
const BASE_REGISTRY: ActionItem[] = [
  // Orders / Requests
  { code: "IO", label: "Investigation Order", emoji: "🧪", group: "Orders" },
  { code: "MO", label: "Medication Order",   emoji: "💊", group: "Orders", to: paths.addMedication, enabled: true },
  { code: "CC", label: "Cross Consultation", emoji: "🔄", group: "Orders" },

  // Notes & Documents
  { code: "PN", label: "Progress Notes",     emoji: "🩺", group: "Notes & Docs", to: paths.addNote, enabled: true },
  { code: "DS", label: "Discharge Summary",  emoji: "🏁", group: "Notes & Docs", to: paths.dischargeSummary, enabled: true },
  { code: "IA", label: "Initial Assessment", emoji: "🧾", group: "Notes & Docs" },
  { code: "RS", label: "Risk Scorecard",     emoji: "⚠️", group: "Notes & Docs" },
  { code: "DI", label: "Discharge Intimation", emoji: "📢", group: "Notes & Docs" },
  { code: "FC", label: "Family Communication", emoji: "👨‍👩‍👧", group: "Notes & Docs" },
  { code: "OT", label: "OT Notes",           emoji: "🧾", group: "Notes & Docs" },
  { code: "PA", label: "PAC (Pre‑Anesthesia)", emoji: "🩹", group: "Notes & Docs" },

  // Records / Results
  { code: "RE", label: "Results",            emoji: "📈", group: "Records & Results" },
  { code: "PR", label: "Past Records",       emoji: "📚", group: "Records & Results" },

  // Monitoring
  { code: "VT", label: "Vital Trends",       emoji: "❤️", group: "Monitoring" },
  { code: "CH", label: "Checklist",          emoji: "✅", group: "Monitoring" },
  { code: "LM", label: "Live Monitoring",    emoji: "📊", group: "Monitoring" },

  // Other
  { code: "TA", label: "Tasks",              emoji: "📋", group: "Other", to: paths.addTask, enabled: true },
  { code: "IR", label: "Incident Reporting", emoji: "🚨", group: "Other" },
];

/** Group ordering & colors */
const GROUPS: { key: GroupKey; title: string; hue: string }[] = [
  { key: "Orders",            title: "Orders & Requests",         hue: "blue"    },
  { key: "Notes & Docs",      title: "Notes & Documents",         hue: "violet"  },
  { key: "Records & Results", title: "Records & Results",         hue: "emerald" },
  { key: "Monitoring",        title: "Monitoring",                hue: "amber"   },
  { key: "Other",             title: "Other",                     hue: "slate"   },
];

function codeBadgeClass(hue: string, ghost?: boolean) {
  if (ghost) return "bg-muted text-muted-foreground border border-dashed";
  // tint per group hue
  const map: Record<string, string> = {
    blue:    "bg-blue-100 text-blue-800 border-blue-200",
    violet:  "bg-violet-100 text-violet-800 border-violet-200",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
    amber:   "bg-amber-100 text-amber-900 border-amber-200",
    slate:   "bg-slate-100 text-slate-800 border-slate-200",
  };
  return `${map[hue]} border`;
}

function tileClass(enabled: boolean) {
  return cn(
    "group rounded-lg border p-2 sm:p-2.5 bg-white hover:bg-muted/20 transition",
    enabled
      ? "cursor-pointer hover:border-foreground/15"
      : "opacity-60 cursor-not-allowed bg-muted/20 border-dashed"
  );
}

export function BottomActionPanel({
  patientId,
  open: openProp,
  onOpenChange,
}: {
  patientId: string;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
}) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof openProp === "boolean" && typeof onOpenChange === "function";
  const open = isControlled ? (openProp as boolean) : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) return onOpenChange!(next);
    setInternalOpen(next);
  };

  const byGroup = useMemo(() => {
    const m = new Map<GroupKey, ActionItem[]>();
    for (const g of GROUPS) m.set(g.key as GroupKey, []);
    for (const a of BASE_REGISTRY) {
      const list = m.get(a.group) || [];
      list.push(a);
      m.set(a.group, list);
    }
    return m;
  }, []);

  const onClick = (it: ActionItem) => {
    if (!it.enabled || !it.to) {
      toast("This module is coming soon");
      return;
    }
    navigate(it.to(patientId));
    setOpen(false);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground>
        <DrawerContent
          style={{
            height: "85vh",
            maxHeight: "85vh",
          }}
        >
          <DrawerHeader className="flex-shrink-0">
            <DrawerTitle className="text-base">Patient Actions</DrawerTitle>
          </DrawerHeader>

          <div
            className="flex-1 min-h-0 overflow-y-scroll px-3 pb-3 space-y-3"
            style={{
              WebkitOverflowScrolling: "touch" as any,
              touchAction: "pan-y",
              overscrollBehavior: "contain",
              position: "relative",
            }}
          >
            {GROUPS.map(({ key, title, hue }) => {
              const items = byGroup.get(key) || [];
              if (items.length === 0) return null;
              return (
                <section key={key}>
                  <h3 className="text-[11px] font-semibold mb-1 text-muted-foreground uppercase tracking-wide">{title}</h3>
                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 sm:gap-2">
                    {items.map((it) => {
                      const enabled = Boolean(it.enabled && it.to);
                      return (
                        <button
                          key={it.code}
                          type="button"
                          onClick={() => onClick(it)}
                          className={tileClass(enabled)}
                          aria-disabled={!enabled}
                          title={enabled ? it.label : "Coming soon"}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold",
                            codeBadgeClass(hue, !enabled)
                          )}>
                            {it.code}
                          </div>
                          <div className="mt-1 text-left">
                            <div className="text-[11px] leading-snug font-medium line-clamp-2">
                              {it.label}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
