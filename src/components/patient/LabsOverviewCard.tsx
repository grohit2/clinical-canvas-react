import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, FlaskConical } from "lucide-react";

type LabsOverviewCardProps = {
  title?: string;
  mrnHistory?: Array<{ mrn: string; scheme?: string }>;
  latestMrn?: string | null;
  activeScheme?: string | undefined;
  rightAction?: ReactNode;
  children: ReactNode;
};

export function LabsOverviewCard({
  title = "Labs Overview",
  mrnHistory,
  latestMrn,
  activeScheme,
  rightAction,
  children,
}: LabsOverviewCardProps) {
  const [open, setOpen] = useState(true);

  const recordsCount = mrnHistory?.length ?? 0;
  const subtitle = useMemo(() => {
    const suffix = recordsCount === 1 ? "record" : "records";
    return `${recordsCount} MRN ${suffix} available`;
  }, [recordsCount]);

  return (
    <div className="bg-white dark:bg-card-dark rounded-lg border border-gray-200 dark:border-border-dark overflow-hidden">
      <button
        type="button"
        className="w-full p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
            <FlaskConical className="h-5 w-5 text-purple-600 dark:text-purple-300" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div className="px-4 pb-3">
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeScheme ? (
              <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium px-2.5 py-1 rounded-full uppercase">
                {activeScheme}
              </span>
            ) : null}
            {latestMrn ? (
              <p className="text-sm text-muted-foreground">{latestMrn}</p>
            ) : null}
          </div>
          {rightAction}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-border-dark" />

      <div
        className={`transition-[grid-template-rows] duration-200 ease-in-out grid ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
