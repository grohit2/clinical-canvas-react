import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageChip } from "./StageChip";
import { UpdateRing } from "./UpdateRing";
import { QRCodeGenerator } from "@/components/qr/QRCodeGenerator";
import { PatientMeta } from "@/types/models";
import { Calendar, MapPin, Clock, QrCode } from "lucide-react";

interface PatientCardProps {
  patient: PatientMeta;
  onClick?: () => void;
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  const [showQR, setShowQR] = useState(false);
  const getStageVariant = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'icu':
      case 'critical':
        return 'urgent';
      case 'post-op':
      case 'recovery':
        return 'caution';
      case 'discharge':
      case 'stable':
        return 'stable';
      default:
        return 'default';
    }
  };

  const getCardColorClass = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'icu':
      case 'critical':
        return 'border-l-4 border-l-urgent';
      case 'post-op':
      case 'recovery':
        return 'border-l-4 border-l-caution';
      case 'discharge':
      case 'stable':
        return 'border-l-4 border-l-stable';
      default:
        return 'border-l-4 border-l-medical';
    }
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <Card 
      className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${getCardColorClass(patient.currentState)}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Update Ring */}
        <div className="flex-shrink-0">
          <UpdateRing count={patient.updateCounter} size="sm" />
        </div>

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground truncate">
              {patient.name}
            </h3>
            <StageChip 
              stage={patient.currentState} 
              variant={getStageVariant(patient.currentState)}
              size="sm"
            />
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="capitalize">{patient.pathway}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{patient.diagnosis}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatLastUpdated(patient.lastUpdated)}</span>
            </div>
          </div>

          {/* Comorbidities */}
          {patient.comorbidities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {patient.comorbidities.slice(0, 3).map((comorbidity) => (
                <Badge key={comorbidity} variant="secondary" className="text-xs">
                  {comorbidity}
                </Badge>
              ))}
              {patient.comorbidities.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{patient.comorbidities.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowQR(!showQR);
            }}
            className="p-1 hover:bg-muted rounded"
          >
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      
      {showQR && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg flex flex-col items-center gap-2">
          <QRCodeGenerator value={patient.qrCode} size={120} />
          <p className="text-xs text-muted-foreground text-center">
            Scan for patient details
          </p>
        </div>
      )}
    </Card>
  );
}