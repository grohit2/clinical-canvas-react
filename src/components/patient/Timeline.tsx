import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Clock } from "lucide-react";
import { TimelineEntry } from "@/types/models";
import { cn } from "@/lib/utils";
import { Fragment } from "react";

// Utility: derive status of a timeline entry relative to the current patient state
const getStateStatus = (currentState: string, entry: TimelineEntry) => {
  if (entry.state === currentState && !entry.dateOut) return "current";
  if (entry.dateOut) return "completed";
  return "upcoming";
};

// Utility: format the elapsed time between admission and discharge (or now)
const formatDuration = (dateIn: string, dateOut?: string) => {
  const start = new Date(dateIn);
  const end = dateOut ? new Date(dateOut) : new Date();
  const diffHours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  return diffHours < 24 ? `${diffHours}h` : `${Math.floor(diffHours / 24)}d`;
};

// Group timeline entries by calendar day (based on dateIn)
const groupByDay = (entries: TimelineEntry[]) => {
  const map = new Map<string, TimelineEntry[]>();
  for (const e of entries) {
    const dayKey = new Date(e.dateIn).toISOString().split("T")[0]; // YYYY-MM-DD
    if (!map.has(dayKey)) map.set(dayKey, []);
    map.get(dayKey)!.push(e);
  }
  // Sort groups by date ascending (earliest first)
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

interface TimelineProps {
  entries: TimelineEntry[];
  currentState: string;
}

export function Timeline({ entries, currentState }: TimelineProps) {
  const grouped = groupByDay(entries);

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Patient Journey</h3>

      {/* Timeline container */}
      <div className="space-y-8 relative">
        {/* Vertical timeline spine */}
        <div className="absolute left-1.5 top-6 bottom-0 w-0.5 bg-gray-200" />

        {grouped.map(([day, dayEntries]) => (
          <Fragment key={day}>
            {/* Day header */}
            <div className="flex items-center mb-4 relative">
              {/* intersection dot */}
              <div className="w-3 h-3 bg-white border-2 border-gray-400 rounded-full mr-3 relative z-10" />
              <Clock className="w-4 h-4 text-gray-500 mr-2" />
              <h3 className="text-lg font-medium">
                {new Date(day).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </h3>
            </div>

            {/* Activity cards for the day */}
            <div className="space-y-4">
              {dayEntries.map((entry) => {
                const status = getStateStatus(currentState, entry);
                return (
                  <div key={`${entry.state}-${entry.dateIn}`} className="relative">
                    {/* Horizontal connector bar */}
                    <div className="absolute -left-[4.5rem] top-6 w-[4.5rem] h-0.5 bg-gray-200" />

                    {/* Card */}
                    <div className="flex gap-3 bg-gray-50 rounded-lg p-4 relative">
                      {/* Status icon */}
                      <div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          status === "completed" && "bg-stable text-stable-foreground",
                          status === "current" && "bg-medical text-medical-foreground",
                          status === "upcoming" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {status === "completed" && <CheckCircle className="h-4 w-4" />}
                        {status === "current" && <Clock className="h-4 w-4" />}
                        {status === "upcoming" && <Circle className="h-4 w-4" />}
                      </div>

                      {/* Card body */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">{entry.state}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {formatDuration(entry.dateIn, entry.dateOut)}
                            </Badge>
                            {status === "current" && (
                              <Badge className="bg-medical text-medical-foreground">Current</Badge>
                            )}
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground mb-2">
                          <div>
                            Admitted: {new Date(entry.dateIn).toLocaleDateString()} at {" "}
                            {new Date(entry.dateIn).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          {entry.dateOut && (
                            <div>
                              Discharged: {new Date(entry.dateOut).toLocaleDateString()} at {" "}
                              {new Date(entry.dateOut).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>

                        {/* Checklists */}
                        {entry.checklistIn.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs font-medium text-stable mb-1">Admission Tasks:</div>
                            <div className="flex flex-wrap gap-1">
                              {entry.checklistIn.map((task) => (
                                <Badge key={task} variant="outline" className="text-xs">
                                  ✓ {task}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {entry.checklistOut.length > 0 && entry.dateOut && (
                          <div>
                            <div className="text-xs font-medium text-stable mb-1">Discharge Tasks:</div>
                            <div className="flex flex-wrap gap-1">
                              {entry.checklistOut.map((task) => (
                                <Badge key={task} variant="outline" className="text-xs">
                                  ✓ {task}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>
    </Card>
  );
}