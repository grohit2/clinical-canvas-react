import { Card } from "@/components/ui/card";
import type { ActionBreakdown } from "@/types/scoring";

interface ActionBreakdownChartProps {
  data: ActionBreakdown[];
  period: string;
}

export function ActionBreakdownChart({ data, period }: ActionBreakdownChartProps) {
  const maxCount = Math.max(...data.map(d => d.count));
  
  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'note.create': 'Notes',
      'note.update': 'Note Updates',
      'med.create': 'Medications',
      'med.update': 'Med Updates',
      'task.done': 'Tasks Completed',
      'timeline.transition': 'Timeline Updates',
      'doc.upload': 'Documents'
    };
    return labels[action] || action;
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Action Breakdown</h3>
          <p className="text-sm text-muted-foreground">{period}</p>
        </div>
        
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.action} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">{getActionLabel(item.action)}</span>
                <div className="flex gap-2 text-muted-foreground">
                  <span>{item.count} actions</span>
                  <span>•</span>
                  <span>{item.points} pts</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}