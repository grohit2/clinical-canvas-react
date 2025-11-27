import { Button } from "@shared/components/ui/button";

interface PatientsListEmptyProps {
  hasFilters: boolean;
  isMyPatientsTab: boolean;
  onClearFilters: () => void;
}

export function PatientsListEmpty({
  hasFilters,
  isMyPatientsTab,
  onClearFilters,
}: PatientsListEmptyProps) {
  if (isMyPatientsTab) {
    if (hasFilters) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No pinned patients matching your criteria</p>
          <Button variant="outline" className="mt-4" onClick={onClearFilters}>
            Clear Filters
          </Button>
        </div>
      );
    }
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">No patients pinned yet</p>
        <p className="text-sm text-muted-foreground">
          Pin patients you care about using the 3-dot menu on any patient card
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">No patients found matching your criteria</p>
      <Button variant="outline" className="mt-4" onClick={onClearFilters}>
        Clear Filters
      </Button>
    </div>
  );
}
