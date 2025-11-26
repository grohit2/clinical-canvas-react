import type { Patient } from "@/types/api";
import { Card } from "@shared/components/ui/card";
import { LabsOverviewCard } from "@entities/patient/ui";

type ZoneProps = { patient?: Patient };

export function YellowZone({ patient }: ZoneProps) {
  return (
    <Card className="p-4 space-y-3">
      <p className="text-xs uppercase text-muted-foreground tracking-wide">Labs & Vitals</p>
      <LabsOverviewCard labs={patient?.vitals as any} />
    </Card>
  );
}
