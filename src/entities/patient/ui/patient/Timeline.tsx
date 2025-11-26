import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Clock } from "lucide-react";
import { TimelineEntry } from "@/types/api";
import { cn } from "@/lib/utils";

interface TimelineProps {
  entries: TimelineEntry[];
  currentState: string;
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

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Patient Journey</h3>
      
      <div className="space-y-4">
        {entries.map((entry, index) => {
          const status = getStateStatus(entry.state, entry.dateOut);
          const isLast = index === entries.length - 1;
          
          return (
            <div key={`${entry.state}-${entry.dateIn}`} className="relative">
              <div className="flex items-start gap-3">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    status === 'completed' && "bg-stable text-stable-foreground",
                    status === 'current' && "bg-medical text-medical-foreground",
                    status === 'upcoming' && "bg-muted text-muted-foreground"
                  )}>
                    {status === 'completed' && <CheckCircle className="h-4 w-4" />}
                    {status === 'current' && <Clock className="h-4 w-4" />}
                    {status === 'upcoming' && <Circle className="h-4 w-4" />}
                  </div>
                  
                  {/* Connecting line */}
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 h-8 mt-2",
                      status === 'completed' ? "bg-stable" : "bg-muted"
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{entry.state}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {formatDuration(entry.dateIn, entry.dateOut)}
                      </Badge>
                      {status === 'current' && (
                        <Badge className="bg-medical text-medical-foreground">
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
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
    </Card>
  );
}