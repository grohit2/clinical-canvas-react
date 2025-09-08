import React, { useState } from "react";
import { ChevronDown, ChevronRight, Star, Calendar, TestTube, FileBarChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MrnHistoryEntry {
  mrn: string;
  scheme: 'ASP' | 'NAM' | 'Paid' | 'Unknown' | string;
  date: string; // ISO8601 string
}

interface MrnOverviewProps {
  patientId: string;
  mrnHistory?: MrnHistoryEntry[];
  latestMrn?: string;
}

export function MrnOverview({ patientId, mrnHistory, latestMrn }: MrnOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Use mrnHistory from backend or create mock entries
  const displayMrnHistory: MrnHistoryEntry[] = mrnHistory && mrnHistory.length > 0 
    ? mrnHistory 
    : [
        {
          scheme: "ASP",
          mrn: latestMrn || "MRN-001",
          date: new Date().toISOString()
        },
        {
          scheme: "NAM",
          mrn: "NAM-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
          date: "2024-01-15T10:30:00.000Z"
        },
        {
          scheme: "Paid", 
          mrn: "PAID-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
          date: "2023-12-10T14:45:00.000Z"
        }
      ];

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

  const currentMrn = displayMrnHistory.find(entry => entry.mrn === latestMrn) || displayMrnHistory[0];
  const otherMrns = displayMrnHistory.filter(entry => entry.mrn !== latestMrn);

  return (
    <Card className="p-4 space-y-4">
      {/* Header with toggle */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <TestTube className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-base">MRN & Lab Overview</h3>
          <Badge variant="secondary" className="text-xs">
            {displayMrnHistory.length} MRN{displayMrnHistory.length > 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <Badge variant="outline" className="text-xs">
              Current: {currentMrn.scheme} - {currentMrn.mrn}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="space-y-3">
          {/* Current MRN */}
          <div className="border border-green-200 bg-green-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-green-600 fill-green-600" />
                <span className="text-sm font-medium text-green-800">Current MRN</span>
              </div>
              <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Scheme</p>
                <p className="font-medium text-sm">{currentMrn.scheme}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MRN Number</p>
                <p className="font-medium text-sm">{currentMrn.mrn}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(currentMrn.date)}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handleLabClick(currentMrn)}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <FileBarChart className="h-4 w-4 mr-2" />
              View Labs for {currentMrn.scheme}
            </Button>
          </div>

          {/* Other MRNs */}
          {otherMrns.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Previous MRNs</h4>
              {otherMrns.map((entry) => (
                <div key={entry.id} className="border border-gray-200 bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Scheme</p>
                      <p className="font-medium text-sm">{entry.scheme}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">MRN Number</p>
                      <p className="font-medium text-sm">{entry.mrn}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(entry.date)}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLabClick(entry)}
                    className="w-full"
                  >
                    <FileBarChart className="h-4 w-4 mr-2" />
                    View Labs for {entry.scheme}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Summary stats */}
          <div className="border-t pt-3 mt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-blue-600">{displayMrnHistory.length}</p>
                <p className="text-xs text-muted-foreground">Total MRNs</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">1</p>
                <p className="text-xs text-muted-foreground">Latest</p>
              </div>
              <div>
                <p className="text-xl font-bold text-purple-600">
                  {displayMrnHistory.reduce((acc, entry) => acc + (entry.scheme === "ASP" ? 1 : 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">ASP Entries</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}