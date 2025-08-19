import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PointsSummaryProps {
  totalPoints: number;
  monthPoints: number;
  deltaPercent: number;
  rank: number;
}

export function PointsSummary({ totalPoints, monthPoints, deltaPercent, rank }: PointsSummaryProps) {
  const isPositive = deltaPercent >= 0;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Points Summary</h3>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Current Rank</div>
            <div className="text-2xl font-bold text-primary">#{rank}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Total Points</p>
            <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold">{monthPoints.toLocaleString()}</p>
            <div className={`flex items-center gap-1 text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {Math.abs(deltaPercent)}%
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}