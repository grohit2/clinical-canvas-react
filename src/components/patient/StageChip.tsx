import { cn } from "@/lib/utils";

interface StageChipProps {
  stage: string;
  variant?: 'default' | 'urgent' | 'stable' | 'caution';
  size?: 'sm' | 'md' | 'lg';
}

const stageVariants = {
  default: "bg-muted text-muted-foreground",
  urgent: "bg-urgent text-urgent-foreground",
  stable: "bg-stable text-stable-foreground", 
  caution: "bg-caution text-caution-foreground"
};

const sizeVariants = {
  sm: "h-6 px-2 text-xs",
  md: "h-8 px-3 text-sm",
  lg: "h-10 px-4 text-base"
};

export function StageChip({ 
  stage, 
  variant = 'default',
  size = 'md' 
}: StageChipProps) {
  const label = (() => {
    const s = (stage || '').toLowerCase();
    switch (s) {
      case 'pre-op':
        return 'Pre-Op';
      case 'surgery':
      case 'intra-op':
        return 'Intra-Op';
      case 'post-op':
      case 'recovery':
      case 'stable':
        return 'Post-Op';
      case 'icu':
        return 'ICU';
      default: {
        // Title-case words; preserve hyphens within words
        const raw = String(stage || '');
        return raw
          .split(/\s+/)
          .map((w) => w.replace(/(^[a-z])|(-[a-z])/g, (m) => m.toUpperCase()))
          .join(' ');
      }
    }
  })();
  return (
    <div className={cn(
      "inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap",
      stageVariants[variant],
      sizeVariants[size]
    )}>
      {label}
    </div>
  );
}
