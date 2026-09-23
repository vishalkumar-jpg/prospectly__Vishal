import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import type { MarketplaceDeal } from "./types";

interface UrgencyBadgeProps {
  urgency: MarketplaceDeal["urgency"];
}

export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  switch (urgency) {
    case "urgent":
      return (
        <Badge className="bg-red-500/10 text-red-700 hover:bg-red-700 hover:text-red-50 border-red-200 font-semibold text-[10px]">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
          Urgent
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-700 hover:text-amber-50 border-amber-200 font-semibold text-[10px]">
          <Zap className="h-3 w-3 mr-1" />
          High Priority
        </Badge>
      );
    case "normal":
      return (
        <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-700 hover:text-blue-50 border-blue-200 font-semibold text-[10px]">
          Normal
        </Badge>
      );
    case "flexible":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-50 border-emerald-200 font-semibold text-[10px]">
          Flexible
        </Badge>
      );
    default:
      return null;
  }
}
