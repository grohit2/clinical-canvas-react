import { useState, useMemo } from "react";
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageChip } from "./StageChip";
import { UpdateRing } from "./UpdateRing";
import { QRCodeGenerator } from "@/components/qr/QRCodeGenerator";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import { PatientMeta } from "@/types/models";
import { Calendar, MapPin, Clock, QrCode, TestTube, Copy, ImageIcon, Trash2 } from "lucide-react";
import { copyToClipboard, triggerHaptic, openInBrowser, generateLabsUrl, generateRadiologyUrl } from "@/utils/mobile";
import { useToast } from "@/hooks/use-toast";

interface PatientCardProps {
  patient: PatientMeta;
  onClick?: () => void;
  onDelete?: (patient: PatientMeta) => void;
}

export const PatientCard = React.memo<PatientCardProps>(
  ({ patient, onClick, onDelete }) => {
    const [showQR, setShowQR] = useState(false);
    const { toast } = useToast();

    const getStageVariant = (stage: string) => {
      switch (stage.toLowerCase()) {
        case "icu":
        case "critical":
          return "urgent";
        case "post-op":
        case "recovery":
          return "caution";
        case "discharge":
        case "stable":
          return "stable";
        default:
          return "default";
      }
    };

    const getCardColorClass = (stage: string) => {
      switch (stage.toLowerCase()) {
        case "icu":
        case "critical":
          return "border-l-4 border-l-urgent";
        case "post-op":
        case "recovery":
          return "border-l-4 border-l-caution";
        case "discharge":
        case "stable":
          return "border-l-4 border-l-stable";
        default:
          return "border-l-4 border-l-medical";
      }
    };

    // Memoize the formatLastUpdated calculation
    const formattedLastUpdated = useMemo(() => {
      const date = new Date(patient.lastUpdated);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    }, [patient.lastUpdated]);

    // Swipe actions
    const swipeActions = [
      {
        id: "labs",
        label: "Labs",
        icon: <TestTube className="h-4 w-4" />,
        color: "bg-blue-500 hover:bg-blue-600",
        onClick: () => {
          const labsUrl = generateLabsUrl(patient.mrn);
          openInBrowser(labsUrl);
        },
      },
      {
        id: "copy-mrn",
        label: "Copy MRN",
        icon: <Copy className="h-4 w-4" />,
        color: "bg-green-500 hover:bg-green-600",
        onClick: async () => {
          const success = await copyToClipboard(patient.mrn);
          if (success) {
            triggerHaptic('selection');
            toast({
              variant: "success",
              title: "MRN Copied",
              description: `${patient.mrn} copied to clipboard`,
            });
          } else {
            toast({
              variant: "destructive",
              title: "Copy Failed",
              description: "Unable to copy MRN to clipboard",
            });
          }
        },
      },
      {
        id: "radiology",
        label: "Radiology",
        icon: <ImageIcon className="h-4 w-4" />,
        color: "bg-purple-500 hover:bg-purple-600",
        onClick: () => {
          const radiologyUrl = generateRadiologyUrl(patient.mrn);
          // For now, just show a toast since it's a placeholder
          toast({
            title: "Radiology",
            description: "Radiology feature coming soon",
          });
        },
      },
      onDelete && {
        id: "delete",
        label: "Delete",
        icon: <Trash2 className="h-4 w-4" />,
        color: "bg-red-600 hover:bg-red-700",
        onClick: () => {
          if (window.confirm("Mark this patient as inactive?")) {
            onDelete(patient);
          }
        },
      },
    ].filter(Boolean) as any[];

    return (
      <SwipeableCard 
        actions={swipeActions}
        className="mb-3"
      >
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

              {/* MRN */}
              <p className="text-xs text-muted-foreground mb-1">
                MRN: {patient.mrn}
              </p>

              {/* Diagnosis */}
              <p className="text-sm text-muted-foreground mb-2 truncate">
                {patient.diagnosis}
              </p>

              {/* Comorbidities */}
              {patient.comorbidities && patient.comorbidities.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {patient.comorbidities.slice(0, 3).map((condition, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {condition}
                    </Badge>
                  ))}
                  {patient.comorbidities.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{patient.comorbidities.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formattedLastUpdated}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-24">
                    {patient.assignedDoctor}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQR(!showQR);
                    }}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <QrCode className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Popup */}
          {showQR && (
            <div className="mt-4 pt-4 border-t">
              <QRCodeGenerator
                patientId={patient.id}
                patientName={patient.name}
                onClose={() => setShowQR(false)}
              />
            </div>
          )}
        </Card>
      </SwipeableCard>
    );
  },
);

PatientCard.displayName = "PatientCard";
