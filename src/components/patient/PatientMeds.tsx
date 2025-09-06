import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Medication } from "@/types/api";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import AttachBar from "@/components/AttachBar";
import FileGrid from "@/components/FileGrid";

interface PatientMedsProps {
  patientId: string;
}

export function PatientMeds({ patientId }: PatientMedsProps) {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [gridTokens, setGridTokens] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    api.meds
      .list(patientId, true, 50)
      .then((res) => setMeds(res.items))
      .catch((err) => console.error(err));
  }, [patientId]);

  if (meds.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-lg border border-dashed">
        No medications for this patient
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meds.map((med) => (
        <Card key={med.medId} className="p-3 space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm sm:text-base">{med.name}</h4>
            <Badge variant="outline" className="capitalize">
              {med.priority}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
            <span>{med.dose}</span>
            <span>• {med.route}</span>
            <span>• {med.freq}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Start: {new Date(med.start).toLocaleDateString()}
            {med.end && ` • End: ${new Date(med.end).toLocaleDateString()}`}
          </div>
          {med.scheduleTimes && med.scheduleTimes.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Times: {med.scheduleTimes.join(", ")}
            </div>
          )}
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={() => navigate(`/patients/${patientId}/meds/${med.medId}/edit`)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          <div className="border-t pt-2">
            <AttachBar
              patientId={patientId}
              ctx={{ kind: "med", refId: med.medId }}
              onAdded={() => setGridTokens((t) => ({ ...t, [med.medId]: (t[med.medId] || 0) + 1 }))}
            />
            <div className="mt-2">
              <FileGrid patientId={patientId} kind="med" refId={med.medId} detachable refreshToken={gridTokens[med.medId] || 0} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
