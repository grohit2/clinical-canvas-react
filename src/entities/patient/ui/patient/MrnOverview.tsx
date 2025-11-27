import React, { useState } from "react";
import { ChevronDown, ChevronRight, Activity, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const SCHEME_OPTIONS = ['ASP', 'NAM', 'EHS', 'PAID', 'OTHERS'] as const;
type SchemeOption = typeof SCHEME_OPTIONS[number];

const normalizeScheme = (value?: string): string => {
  const raw = (value || '').trim().toUpperCase();
  if (SCHEME_OPTIONS.includes(raw as SchemeOption)) {
    return raw;
  }
  if (["UNKNOWN", "GENERAL", "OTHER", "OTHERS"].includes(raw)) {
    return 'OTHERS';
  }
  return raw || 'OTHERS';
};

interface MrnHistoryEntry {
  mrn: string;
  scheme: SchemeOption | string;
  date: string; // ISO8601 string
}

interface MrnOverviewProps {
  patientId: string;
  mrnHistory?: MrnHistoryEntry[];
  latestMrn?: string;
  onMrnUpdate?: (updatedHistory: MrnHistoryEntry[], newLatestMrn: string) => void;
}

export function MrnOverview({ patientId, mrnHistory, latestMrn, onMrnUpdate }: MrnOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddMrnDialog, setShowAddMrnDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMrnData, setNewMrnData] = useState({
    mrn: "",
    scheme: "",
    date: new Date().toISOString().slice(0, 10)
  });
  
  const { toast } = useToast();

  // Use mrnHistory from backend or create fallback entry with latest MRN
  const rawHistory: MrnHistoryEntry[] = mrnHistory && mrnHistory.length > 0 
    ? mrnHistory 
    : latestMrn 
      ? [{
          scheme: "OTHERS",
          mrn: latestMrn,
          date: new Date().toISOString()
        }]
      : [{
          scheme: "OTHERS",
          mrn: "No MRN Available",
          date: new Date().toISOString()
        }];

  const displayMrnHistory = rawHistory.map(entry => ({
    ...entry,
    scheme: normalizeScheme(entry.scheme),
  }));

  const handleLabClick = (mrnEntry: MrnHistoryEntry) => {
    // Navigate to external LIS system with the specific MRN
    const lisUrl = `http://115.241.194.20/LIS/Reports/Patient_Report.aspx?prno=${mrnEntry.mrn}`;
    window.open(lisUrl, '_blank');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No date";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleAddMrn = async () => {
    if (!newMrnData.mrn.trim() || !newMrnData.scheme) {
      toast({
        title: "Validation Error",
        description: "Please fill in both MRN number and scheme",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    console.log("🔄 Starting MRN Addition Process");
    console.log("📋 Current MRN History:", displayMrnHistory);
    console.log("🆕 New MRN Data:", newMrnData);
    console.log("👤 Patient ID:", patientId);

    try {
      // Switch registration using backend-supported endpoint
      const payload = {
        mrn: newMrnData.mrn.trim(),
        scheme: normalizeScheme(newMrnData.scheme),
      };
      console.log("🚀 Sending Registration Switch Payload:", payload);

      const response = await api.patients.switchRegistration(patientId, payload);
      console.log("✅ Backend Response:", response);

      // Use server-returned patient to ensure consistency
      const updated = response.patient;
      if (onMrnUpdate) onMrnUpdate(updated.mrnHistory || [], updated.latestMrn || payload.mrn);

      toast({
        title: "MRN Added Successfully",
        description: `New MRN ${newMrnData.mrn} has been added to the patient record`,
      });

      // Reset form and close dialog
      setNewMrnData({
        mrn: "",
        scheme: "",
        date: new Date().toISOString().slice(0, 10)
      });
      setShowAddMrnDialog(false);

    } catch (error) {
      console.error("❌ Failed to add MRN - Full Error:", error);
      console.error("❌ Error Message:", error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: "Error",
        description: `Failed to add MRN: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort all MRNs by date (newest first)
  const sortedMrnHistory = displayMrnHistory.sort((a, b) => {
    const dateA = new Date(a.date || '1970-01-01');
    const dateB = new Date(b.date || '1970-01-01');
    return dateB.getTime() - dateA.getTime();
  });

  const currentMrn = sortedMrnHistory.find(entry => entry.mrn === latestMrn) || sortedMrnHistory[0];

  return (
    <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-r from-blue-50 to-purple-50">
      {/* Header with toggle */}
      <div 
        className="flex items-center justify-between cursor-pointer p-4 hover:bg-white/50 transition-all duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-gray-800">Labs Overview</h3>
            <p className="text-xs text-gray-500">{displayMrnHistory.length} MRN record{displayMrnHistory.length > 1 ? 's' : ''} available</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isExpanded && (
            <div className="text-right">
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                {currentMrn.scheme}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">{currentMrn.mrn}</p>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMrnDialog(true);
            }}
            className="h-8 px-3 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add MRN
          </Button>
          <div className={`transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}>
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-1 duration-300">
          {/* All MRNs ordered by date */}
          <div className="space-y-2">
            {sortedMrnHistory.map((entry, index) => {
              const isCurrent = entry.mrn === latestMrn;
              return (
                <div
                  key={entry.mrn + index}
                  className={`group cursor-pointer rounded-xl border px-3 py-2.5 transition-all duration-200 hover:shadow-md ${
                    isCurrent
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => handleLabClick(entry)}
                >
                  {/* Row 1: MRN + Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-base font-semibold ${
                      isCurrent ? 'text-emerald-700' : 'text-gray-800'
                    }`}>
                      {entry.mrn}
                    </span>
                    <Badge
                      className={`text-[10px] font-semibold px-2 py-0.5 ${
                        isCurrent
                          ? 'bg-emerald-500 text-white border-0'
                          : 'bg-gray-100 text-gray-600 border-0'
                      }`}
                    >
                      {entry.scheme}
                    </Badge>
                  </div>

                  {/* Row 2: Date + Current + Arrow */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${isCurrent ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {formatDate(entry.date)}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">
                          Current
                        </span>
                      )}
                    </div>
                    <ChevronRight className={`h-4 w-4 ${
                      isCurrent ? 'text-emerald-400' : 'text-gray-400 group-hover:text-blue-500'
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add MRN Dialog */}
      <Dialog open={showAddMrnDialog} onOpenChange={setShowAddMrnDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New MRN</DialogTitle>
            <DialogDescription>
              Add a new MRN number for this patient. This will be added to the patient's MRN history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scheme">Scheme *</Label>
              <Select
                value={newMrnData.scheme}
                onValueChange={(value) => setNewMrnData(prev => ({ ...prev, scheme: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {SCHEME_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mrn">MRN Number *</Label>
              <Input
                id="mrn"
                value={newMrnData.mrn}
                onChange={(e) => setNewMrnData(prev => ({ ...prev, mrn: e.target.value }))}
                placeholder="Enter MRN number (e.g., ABC-1234567)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newMrnData.date}
                onChange={(e) => setNewMrnData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddMrnDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMrn}
              disabled={isSubmitting || !newMrnData.mrn.trim() || !newMrnData.scheme}
            >
              {isSubmitting ? "Adding..." : "Add MRN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
