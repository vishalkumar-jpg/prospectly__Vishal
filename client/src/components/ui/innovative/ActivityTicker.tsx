import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { cn } from "@/lib/utils";
import { Eye, UserPlus, CheckCircle } from "lucide-react";

export interface ActivityItem {
  id: string;
  type: "view" | "interest" | "claim";
  name: string;
  location?: string;
  timeAgo: string;
}

interface ActivityTickerProps {
  activities: ActivityItem[];
  interval?: number;
  className?: string;
}

const iconMap = {
  view: Eye,
  interest: UserPlus,
  claim: CheckCircle,
};

const colorMap = {
  view: "text-blue-500 bg-blue-50",
  interest: "text-purple-500 bg-purple-50",
  claim: "text-emerald-500 bg-emerald-50",
};

const textMap = {
  view: "viewed this deal",
  interest: "showed interest",
  claim: "claimed this deal",
};

function showNextTickerActivity({
  activitiesLength,
  setCurrentIndex,
  setIsVisible,
}: {
  activitiesLength: number;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
  setIsVisible: Dispatch<SetStateAction<boolean>>;
}): void {
  setCurrentIndex((prev) => (prev + 1) % activitiesLength);
  setIsVisible(true);
}

export function ActivityTicker({
  activities,
  interval = 4000,
  className,
}: ActivityTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (activities.length <= 1) return;

    const timer = setInterval(() => {
      setIsVisible(false);
      setTimeout(
        () =>
          showNextTickerActivity({
            activitiesLength: activities.length,
            setCurrentIndex,
            setIsVisible,
          }),
        300
      );
    }, interval);

    return () => clearInterval(timer);
  }, [activities.length, interval]);

  if (activities.length === 0) return null;

  const activity = activities[currentIndex];
  const Icon = iconMap[activity.type];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-full",
        "bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm",
        "transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
        className
      )}
    >
      <div className={cn("p-1.5 rounded-full", colorMap[activity.type])}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="font-medium text-foreground">{activity.name}</span>
        {activity.location && (
          <span className="text-muted-foreground">
            from {activity.location}
          </span>
        )}
        <span className="text-muted-foreground">{textMap[activity.type]}</span>
        <span className="text-xs text-muted-foreground/70">
          · {activity.timeAgo}
        </span>
      </div>
    </div>
  );
}

// Generate mock activities for demo
export function generateMockActivities(count: number = 5): ActivityItem[] {
  const names = [
    "Sarah",
    "Michael",
    "Emma",
    "James",
    "Olivia",
    "William",
    "Ava",
    "David",
  ];
  const locations = [
    "SF",
    "NYC",
    "LA",
    "Chicago",
    "Boston",
    "Austin",
    "Seattle",
    "Denver",
  ];
  const types: ActivityItem["type"][] = ["view", "interest", "claim"];
  const times = ["just now", "2m ago", "5m ago", "8m ago", "15m ago"];

  return Array.from({ length: count }, (_, i) => ({
    id: `activity-${i}`,
    type: types[Math.floor(Math.random() * types.length)],
    name: names[Math.floor(Math.random() * names.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    timeAgo: times[Math.floor(Math.random() * times.length)],
  }));
}
