import { cn } from "@/lib/utils";

interface UpdateRingProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeVariants = {
  sm: { ring: "w-8 h-8", badge: "w-5 h-5 text-xs", stroke: "2" },
  md: { ring: "w-12 h-12", badge: "w-6 h-6 text-sm", stroke: "3" },
  lg: { ring: "w-16 h-16", badge: "w-8 h-8 text-base", stroke: "4" }
};

export function UpdateRing({ count, size = 'md', className }: UpdateRingProps) {
  if (count === 0) return null;

  const { ring, badge, stroke } = sizeVariants[size];
  const ringSize = parseInt(ring.match(/w-(\d+)/)?.[1] || '12') * 4; // Convert to pixels
  const center = ringSize / 2;
  const radius = center - parseInt(stroke) * 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate progress based on update count (max 20 for full ring)
  const progress = Math.min(count / 20, 1);
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <div className={cn("relative", ring, className)}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${ringSize} ${ringSize}`}>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-muted"
        />
        {/* Progress ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-medical transition-all duration-300"
        />
      </svg>
      
      {/* Count badge */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center",
        badge,
        "bg-medical text-medical-foreground rounded-full font-semibold"
      )}>
        {count > 99 ? '99+' : count}
      </div>
    </div>
  );
}