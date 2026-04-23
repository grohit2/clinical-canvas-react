import { Card } from "@/components/ui/card";
import { Heart, Smile, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface Activity {
  type: string;
  icon: typeof Heart;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  border: string;
}

const mindfulnessActivities: Activity[] = [
  {
    type: "breathing",
    icon: Heart,
    title: "Take 10 Deep Breaths",
    subtitle: "Reset your mind",
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-200",
  },
  {
    type: "balance",
    icon: Smile,
    title: "How do you feel?",
    subtitle: "Check in with yourself",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  {
    type: "reminder",
    icon: Heart,
    title: "Care for yourself too",
    subtitle: "You matter as much as your patients",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  {
    type: "wellness",
    icon: RefreshCw,
    title: "Rest well, eat well",
    subtitle: "Your wellbeing is essential",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    type: "balance-check",
    icon: Smile,
    title: "Have you lost your balance?",
    subtitle: "It's okay to pause",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  {
    type: "joy",
    icon: Heart,
    title: "Enjoy life",
    subtitle: "Find moments of joy today",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  {
    type: "strength",
    icon: RefreshCw,
    title: "Don't break yourself",
    subtitle: "While helping others heal",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  {
    type: "gratitude",
    icon: Smile,
    title: "You're making a difference",
    subtitle: "Your work matters",
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
];

export function MindfulnessTile() {
  const [currentActivity, setCurrentActivity] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentActivity((prev) => (prev + 1) % mindfulnessActivities.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const activity = mindfulnessActivities[currentActivity];
  const Icon = activity.icon;

  return (
    <Card
      className={`${activity.bg} ${activity.border} border p-4 cursor-pointer hover:shadow-md transition-all`}
      onClick={() =>
        setCurrentActivity((prev) => (prev + 1) % mindfulnessActivities.length)
      }
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${activity.color}`} />
        <div className="flex gap-1">
          {mindfulnessActivities.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                index === currentActivity
                  ? activity.color.replace("text-", "bg-")
                  : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="text-sm font-semibold text-gray-900 mb-1 leading-tight">
        {activity.title}
      </div>
      <div className="text-xs text-gray-600 leading-relaxed">
        {activity.subtitle}
      </div>
    </Card>
  );
}

