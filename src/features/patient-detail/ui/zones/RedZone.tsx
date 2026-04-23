import type { Patient } from "@/types/api";
import { Card } from "@shared/components/ui/card";
import { Separator } from "@shared/components/ui/separator";

type ZoneProps = { patient?: Patient };

export function RedZone({ patient }: ZoneProps) {
  return (
    <Card className="p-4 space-y-3">
      <div>
        <p className="text-xs uppercase text-muted-foreground tracking-wide">Demographics</p>
        <p className="text-sm">
          {patient?.name || "—"} • {patient?.age ? `${patient.age}y` : "Age —"} • {patient?.sex || "—"}
        </p>
        <p className="text-sm text-muted-foreground">
          MRN: {patient?.latestMrn || "—"} • Scheme: {patient?.scheme || "—"} • Room: {patient?.roomNumber || "—"}
        </p>
      </div>
      <Separator />
      <div>
        <p className="text-xs uppercase text-muted-foreground tracking-wide">Diagnosis</p>
        <p className="text-sm">{patient?.diagnosis || "Not recorded"}</p>
      </div>
      <Separator />
      <div>
        <p className="text-xs uppercase text-muted-foreground tracking-wide">Plan</p>
        <p className="text-sm text-muted-foreground">Initial plan placeholder</p>
      </div>
    </Card>
  );
}
