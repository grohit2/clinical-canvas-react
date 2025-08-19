import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp, TrendingDown, Medal, Award } from "lucide-react";
import { ActionBreakdownChart } from "@/components/score/ActionBreakdownChart";
import type { LeaderboardRow, ActionBreakdown } from "@/types/scoring";

// Mock data - replace with actual API calls
const mockLeaderboardData: LeaderboardRow[] = [
  { doctorId: "1", name: "Dr. Ethan Carter", avatar: "/api/placeholder/64/64", points_total: 12345, rank: 1, deltaRank: 0 },
  { doctorId: "2", name: "Dr. Olivia Bennett", avatar: "/api/placeholder/64/64", points_total: 11987, rank: 2, deltaRank: 1 },
  { doctorId: "3", name: "Dr. Noah Thompson", avatar: "/api/placeholder/64/64", points_total: 11567, rank: 3, deltaRank: -1 },
  { doctorId: "4", name: "Dr. Sophia Harper", avatar: "/api/placeholder/64/64", points_total: 11234, rank: 4, deltaRank: 2 },
  { doctorId: "5", name: "Dr. Owen Foster", avatar: "/api/placeholder/64/64", points_total: 10876, rank: 5, deltaRank: -1 },
  { doctorId: "6", name: "Dr. Ava Hayes", avatar: "/api/placeholder/64/64", points_total: 10543, rank: 6, deltaRank: 0 },
  { doctorId: "7", name: "Dr. Leo Mitchell", avatar: "/api/placeholder/64/64", points_total: 10210, rank: 7, deltaRank: 1 },
  { doctorId: "8", name: "Dr. Chloe Reed", avatar: "/api/placeholder/64/64", points_total: 9876, rank: 8, deltaRank: -2 },
  { doctorId: "9", name: "Dr. Caleb Morgan", avatar: "/api/placeholder/64/64", points_total: 9543, rank: 9, deltaRank: 0 },
  { doctorId: "10", name: "Dr. Mia Coleman", avatar: "/api/placeholder/64/64", points_total: 9210, rank: 10, deltaRank: 1 },
];

const mockActionBreakdown: ActionBreakdown[] = [
  { action: "note.create", count: 45, points: 450 },
  { action: "task.done", count: 32, points: 640 },
  { action: "med.create", count: 28, points: 280 },
  { action: "doc.upload", count: 15, points: 300 },
];

const departments = ["All Departments", "Cardiology", "Surgery", "Emergency", "Neurology"];
const periods = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "all", label: "All Time" },
];

export default function Leaderboard() {
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardRow[]>(mockLeaderboardData);

  useEffect(() => {
    document.title = "Leaderboard | Clinical Canvas";
  }, []);

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
    <div className="min-h-screen bg-background pb-20">
      <Header title="Leaderboard" />
      
      <div className="p-4 space-y-6">
        {/* Filters */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Department</h3>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Time Period</h3>
            <div className="flex rounded-lg bg-muted p-1">
              {periods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    selectedPeriod === period.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <Card className="p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Rankings</h3>
            
            <div className="space-y-2">
              {leaderboardData.map((doctor) => (
                <div 
                  key={doctor.doctorId}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-[60px]">
                    {getRankIcon(doctor.rank)}
                    <span className="font-semibold">#{doctor.rank}</span>
                  </div>
                  
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={doctor.avatar} />
                    <AvatarFallback>
                      {doctor.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doctor.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {doctor.points_total.toLocaleString()} points
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {getTrendIcon(doctor.deltaRank)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Action Breakdown */}
        <ActionBreakdownChart 
          data={mockActionBreakdown} 
          period={periods.find(p => p.value === selectedPeriod)?.label || "Last 30 Days"}
        />

        {/* Recent Activity */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback>EC</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">Dr. Ethan Carter</p>
                <p className="text-sm text-muted-foreground">Completed urgent task</p>
              </div>
              <Badge variant="secondary">+15 pts</Badge>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback>OB</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">Dr. Olivia Bennett</p>
                <p className="text-sm text-muted-foreground">Added patient note</p>
              </div>
              <Badge variant="secondary">+10 pts</Badge>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback>NT</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">Dr. Noah Thompson</p>
                <p className="text-sm text-muted-foreground">Uploaded document</p>
              </div>
              <Badge variant="secondary">+20 pts</Badge>
            </div>
          </div>
        </Card>
      </div>

      <BottomBar />
    </div>
  );
}