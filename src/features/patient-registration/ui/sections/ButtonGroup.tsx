import { cn } from "@/lib/utils";

type ButtonGroupOption<T> = { value: T; label: string };

interface ButtonGroupProps<T> {
  options: ButtonGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function ButtonGroup<T extends string | boolean>({
  options,
  value,
  onChange,
  className,
}: ButtonGroupProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 rounded-full border transition-all text-xs",
            value === option.value
              ? "bg-blue-500 border-blue-500 text-white"
              : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
