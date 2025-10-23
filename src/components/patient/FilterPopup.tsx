import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Filter, X } from "lucide-react";

interface FilterPopupProps {
  selectedPathway: string;
  selectedStage: string;
  showUrgentOnly: boolean;
  onPathwayChange: (pathway: string) => void;
  onStageChange: (stage: string) => void;
  onUrgentToggle: (urgent: boolean) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

const pathwayFilters = ['all', 'surgical', 'emergency', 'consultation'];
// Updated stages: remove 'recovery' and 'stable', rename 'surgery' -> 'intra-op'
// New stage filters (compact names)
const stageFilters = ['all', 'onboarding', 'preop', 'intraop', 'postop', 'discharge-init', 'discharge'];

export function FilterPopup({
  selectedPathway,
  selectedStage,
  showUrgentOnly,
  onPathwayChange,
  onStageChange,
  onUrgentToggle,
  onClearFilters,
  activeFiltersCount
}: FilterPopupProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Filters</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Pathways */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Pathway</label>
            <RadioGroup value={selectedPathway} onValueChange={(value) => {
              onPathwayChange(value);
              setOpen(false);
            }}>
              {pathwayFilters.map((pathway) => (
                <div key={pathway} className="flex items-center space-x-2">
                  <RadioGroupItem value={pathway} id={`pathway-${pathway}`} />
                  <Label htmlFor={`pathway-${pathway}`} className="text-sm cursor-pointer">
                    {pathway === 'all' ? 'All' : pathway.charAt(0).toUpperCase() + pathway.slice(1)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Stages */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Stage</label>
            <RadioGroup value={selectedStage} onValueChange={(value) => {
              onStageChange(value);
              setOpen(false);
            }}>
              {stageFilters.map((stage) => (
                <div key={stage} className="flex items-center space-x-2">
                  <RadioGroupItem value={stage} id={`stage-${stage}`} />
                  <Label htmlFor={`stage-${stage}`} className="text-sm cursor-pointer">
                    {stage === 'all' ? 'All' : stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Urgent Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Button
              variant={showUrgentOnly ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onUrgentToggle(!showUrgentOnly);
                setOpen(false);
              }}
              className="text-xs"
            >
              Urgent Only
            </Button>
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onClearFilters();
                setOpen(false);
              }}
              className="w-full text-xs"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
