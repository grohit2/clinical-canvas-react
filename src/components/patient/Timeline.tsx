import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Clock } from "lucide-react";
import { TimelineEntry } from "@/types/models";
import { cn } from "@/lib/utils";

interface TimelineProps {
  entries: TimelineEntry[];
  currentState: string;
}

interface DayGroup {
  date: string;
  activities: TimelineEntry[];
}

export function Timeline({ entries, currentState }: TimelineProps) {
  const getStateStatus = (state: string, dateOut?: string) => {
    if (state === currentState && !dateOut) return 'current';
    if (dateOut) return 'completed';
    return 'upcoming';
  };

  const formatDuration = (dateIn: string, dateOut?: string) => {
    const start = new Date(dateIn);
    const end = dateOut ? new Date(dateOut) : new Date();
    const diffHours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  // Group entries by date
  const groupByDate = (entries: TimelineEntry[]): DayGroup[] => {
    const groups = new Map<string, TimelineEntry[]>();
    
    entries.forEach(entry => {
      const date = new Date(entry.dateIn).toLocaleDateString();
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(entry);
    });

    return Array.from(groups.entries()).map(([date, activities]) => ({
      date,
      activities: activities.sort((a, b) => new Date(a.dateIn).getTime() - new Date(b.dateIn).getTime())
    }));
  };

  const dayGroups = groupByDate(entries);

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-6">Patient Journey</h3>
      
      {/* Timeline container with relative positioning */}
      <div className="space-y-8 relative">
        {/* Vertical timeline spine */}
        <div className="absolute left-1.5 top-6 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Day groups */}
        {dayGroups.map((dayGroup, dayIndex) => (
          <div key={dayGroup.date}>
            {/* Day header */}
            <div className="flex items-center mb-4 relative">
              <div className="w-3 h-3 bg-white border-2 border-gray-400 rounded-full mr-3 relative z-10"></div>
              <Clock className="w-4 h-4 mr-2 text-gray-500" />
              <h3 className="text-lg font-medium">{dayGroup.date}</h3>
            </div>

            {/* Activity cards for this day */}
            <div className="space-y-4 ml-6">
              {dayGroup.activities.map((entry, index) => {
                const status = getStateStatus(entry.state, entry.dateOut);
                
                return (
                  <div key={`${entry.state}-${entry.dateIn}`} className="relative">
                    {/* Horizontal connector bar */}
                    <div className="absolute -left-4.5 top-6 w-4.5 h-0.5 bg-gray-200"></div>
                    
                    {/* Activity card */}
                    <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 border">
                      {/* Status icon */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center mt-1 flex-shrink-0",
                        status === 'completed' && "bg-green-100 text-green-600",
                        status === 'current' && "bg-blue-100 text-blue-600",
                        status === 'upcoming' && "bg-gray-100 text-gray-500"
                      )}>
                        {status === 'completed' && <CheckCircle className="h-4 w-4" />}
                        {status === 'current' && <Clock className="h-4 w-4" />}
                        {status === 'upcoming' && <Circle className="h-4 w-4" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{entry.state}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {formatDuration(entry.dateIn, entry.dateOut)}
                            </Badge>
                            {status === 'current' && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          <div>
                            Admitted: {new Date(entry.dateIn).toLocaleDateString()} at{' '}
                            {new Date(entry.dateIn).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          {entry.dateOut && (
                            <div>
                              Discharged: {new Date(entry.dateOut).toLocaleDateString()} at{' '}
                              {new Date(entry.dateOut).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          )}
                        </div>

                        {/* Admission Tasks */}
                        {entry.checklistIn.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-medium text-green-700 mb-1">Admission Tasks:</div>
                            <div className="flex flex-wrap gap-1">
                              {entry.checklistIn.map((task) => (
                                <Badge key={task} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  ✓ {task}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Discharge Tasks */}
                        {entry.checklistOut.length > 0 && entry.dateOut && (
                          <div>
                            <div className="text-xs font-medium text-green-700 mb-1">Discharge Tasks:</div>
                            <div className="flex flex-wrap gap-1">
                              {entry.checklistOut.map((task) => (
                                <Badge key={task} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
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
          </div>
        ))}
      </div>
    </Card>
  );
}