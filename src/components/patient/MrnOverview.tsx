import React, { useState } from "react";
import { ChevronDown, ChevronRight, Star, Calendar, TestTube, FileBarChart, Activity } from "lucide-react";
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
                  className={`group cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:shadow-md ${
                    isCurrent 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-300 shadow-lg' 
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => handleLabClick(entry)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCurrent 
                          ? 'bg-white/20' 
                          : 'bg-gray-100 group-hover:bg-blue-50'
                      }`}>
                        {isCurrent ? (
                          <Star className="h-5 w-5 text-white fill-white" />
                        ) : (
                          <TestTube className="h-5 w-5 text-gray-500 group-hover:text-blue-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant={isCurrent ? "secondary" : "outline"} 
                            className={`text-xs ${
                              isCurrent 
                                ? 'bg-white/20 text-white border-white/30' 
                                : 'border-gray-300 group-hover:border-blue-300'
                            }`}
                          >
                            {entry.scheme}
                          </Badge>
                          {isCurrent && (
                            <Badge className="bg-white/20 text-white text-xs border-0">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className={`font-mono text-sm font-medium ${
                          isCurrent ? 'text-white' : 'text-gray-700 group-hover:text-blue-700'
                        }`}>
                          {entry.mrn}
                        </p>
                        <p className={`text-xs flex items-center gap-1 mt-1 ${
                          isCurrent ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          <Calendar className="h-3 w-3" />
                          {formatDate(entry.date)}
                        </p>
                      </div>
                    </div>
                    <div className={`transition-all duration-200 ${
                      isCurrent 
                        ? 'text-white' 
                        : 'text-gray-400 group-hover:text-blue-500'
                    }`}>
                      <FileBarChart className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}