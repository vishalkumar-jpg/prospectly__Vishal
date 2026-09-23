import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getInitials,
  getPlatformColor,
  statusRingColors,
  statusBgColors,
} from "./types";

interface Claimer {
  name: string;
  platform: "linkedin" | "twitter" | "facebook" | "copy";
  status: "in_progress" | "verified" | "completed" | "failed";
  progress: number;
  reason?: string;
}

interface SharedDealClaimersProps {
  claimers: Claimer[];
  dealId: string;
}

export function SharedDealClaimers({
  claimers,
  dealId,
}: SharedDealClaimersProps) {
  const getClaimerStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-100 border-emerald-200 text-[10px] font-semibold">
            <CheckCircle className="h-3 w-3 mr-1" />
            Won
          </Badge>
        );
      case "verified":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-700 hover:text-blue-100 border-blue-200 text-[10px] font-semibold">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-700 hover:text-amber-100 border-amber-200 text-[10px] font-semibold">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-700 hover:text-red-100 border-red-200 text-[10px] font-semibold">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-amber-600" />
          Claimers Progress
        </h5>
        <Badge variant="outline" className="text-xs font-medium">
          {claimers.length} total
        </Badge>
      </div>
      <div className="space-y-2">
        {claimers.map((claimer) => (
          <div
            key={`${dealId}-${claimer.name}`}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 transition-all",
              statusBgColors[claimer.status]
            )}
          >
            <Avatar
              className={cn(
                "h-9 w-9 ring-2 ring-offset-1",
                statusRingColors[claimer.status]
              )}
            >
              <AvatarFallback className="text-xs font-semibold bg-white">
                {getInitials(claimer.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-sm truncate">{claimer.name}</p>
                {getClaimerStatusBadge(claimer.status)}
              </div>
              <div className="flex items-center gap-2">
                <Progress
                  value={claimer.progress}
                  className={cn(
                    "h-1.5 flex-1",
                    claimer.status === "completed" && "[&>div]:bg-emerald-500",
                    claimer.status === "verified" && "[&>div]:bg-blue-500",
                    claimer.status === "in_progress" && "[&>div]:bg-amber-500",
                    claimer.status === "failed" && "[&>div]:bg-red-400"
                  )}
                />
                <span className="text-xs font-medium text-muted-foreground w-8">
                  {claimer.progress}%
                </span>
              </div>
              {claimer.reason && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {claimer.reason}
                </p>
              )}
            </div>

            <Badge
              className={cn(
                "text-[9px] uppercase font-bold px-2",
                getPlatformColor(claimer.platform)
              )}
            >
              {claimer.platform}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
