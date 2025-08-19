import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PointsSummary } from "@/components/score/PointsSummary";
import { ActionBreakdownChart } from "@/components/score/ActionBreakdownChart";
import type { ActionBreakdown } from "@/types/scoring";

// Mock data - replace with actual API calls
const mockScoreData = {
  totalPoints: 12450,
  monthPoints: 2350,
  deltaPercent: -5,
  rank: 1,
};

const mockActionBreakdown: ActionBreakdown[] = [
  { action: "note.create", count: 85, points: 850 },
  { action: "task.done", count: 65, points: 1300 },
  { action: "med.create", count: 45, points: 450 },
  { action: "doc.upload", count: 25, points: 500 },
];

// Mock user data
const mockUser = {
  name: "Dr. Sarah Wilson",
  role: "Cardiology",
  avatar: "/api/placeholder/128/128"
};

export default function MyScore() {
  useEffect(() => {
    document.title = "My Score | Clinical Canvas";
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="My Score" showBack />
      
      <div className="p-4 space-y-6">
        {/* Doctor Profile */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar className="h-32 w-32">
            <AvatarImage src={mockUser.avatar} />
            <AvatarFallback className="text-xl">
              {mockUser.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h1 className="text-2xl font-bold">{mockUser.name}</h1>
            <p className="text-muted-foreground">{mockUser.role}</p>
            <p className="text-sm text-muted-foreground">Role: Senior Consultant</p>
          </div>
        </div>

        {/* Points Summary */}
        <PointsSummary 
          totalPoints={mockScoreData.totalPoints}
          monthPoints={mockScoreData.monthPoints}
          deltaPercent={mockScoreData.deltaPercent}
          rank={mockScoreData.rank}
        />

        {/* Action Breakdown */}
        <ActionBreakdownChart 
          data={mockActionBreakdown}
          period="This Month"
        />
      </div>

      <BottomBar />
    </div>
  );
}