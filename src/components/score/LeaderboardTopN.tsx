import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, Medal, Trophy, Award } from "lucide-react";
import type { LeaderboardRow } from "@/types/scoring";

interface LeaderboardTopNProps {
  rows: LeaderboardRow[];
  limit?: number;
}

export function LeaderboardTopN({ rows, limit = 10 }: LeaderboardTopNProps) {
  const topRows = rows.slice(0, limit);
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getTrendIcon = (deltaRank?: number) => {
    if (!deltaRank) return null;
    return deltaRank > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Top Performers</h3>
        
        <div className="space-y-2">
          {topRows.map((row) => (
            <div 
              key={row.doctorId} 
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-[60px]">
                {getRankIcon(row.rank)}
                <span className="font-semibold text-sm">#{row.rank}</span>
              </div>
              
              <Avatar className="h-12 w-12">
                <AvatarImage src={row.avatar} />
                <AvatarFallback>
                  {row.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{row.name}</p>
                <p className="text-sm text-muted-foreground">
                  {row.points_total.toLocaleString()} points
                </p>
              </div>
              
              <div className="flex items-center gap-1">
                {getTrendIcon(row.deltaRank)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}