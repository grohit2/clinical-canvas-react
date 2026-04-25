import { Badge } from "@shared/components/ui/badge";
import { FilterPopup, ViewToggle } from "@entities/patient/ui/patient";

interface PatientsListFiltersProps {
  selectedPathway: string;
  selectedStage: string;
  showUrgentOnly: boolean;
  onPathwayChange: (pathway: string) => void;
  onStageChange: (stage: string) => void;
  onUrgentToggle: (urgent: boolean) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  patientCount: number;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
}

export function PatientsListFilters({
  selectedPathway,
  selectedStage,
  showUrgentOnly,
  onPathwayChange,
  onStageChange,
  onUrgentToggle,
  onClearFilters,
  activeFiltersCount,
  patientCount,
  viewMode,
  onViewModeChange,
}: PatientsListFiltersProps) {
  return (
    <div className="flex items-center justify-between">
      <FilterPopup
        selectedPathway={selectedPathway}
        selectedStage={selectedStage}
        showUrgentOnly={showUrgentOnly}
        onPathwayChange={onPathwayChange}
        onStageChange={onStageChange}
        onUrgentToggle={onUrgentToggle}
        onClearFilters={onClearFilters}
        activeFiltersCount={activeFiltersCount}
      />
      <div className="flex items-center gap-2">
        <ViewToggle mode={viewMode} onChange={onViewModeChange} />
        <Badge variant="secondary">{patientCount} patients</Badge>
      </div>
    </div>
  );
}
