import { Award } from "lucide-react";
import { useUserStats } from "@/hooks/useUserStats";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent } from "./ui/card";

export function TrustPointsDisplay() {
  const { user } = useAuth();
  const { trustPoints, loading } = useUserStats();

  if (!user) return null;

  if (loading) {
    return (
      <Card className="w-full h-full bg-gradient-to-br from-blue-500/5 to-blue-600/5 border-blue-500/20">
        <CardContent className="p-0 flex flex-col items-center justify-center h-full">
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-center items-start px-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-blue-500/20">
          <Award className="h-5 w-5 text-blue-600" />
        </div>
        <div className="text-2xl font-bold bg-gradient-to-br from-blue-600 to-blue-500 bg-clip-text text-transparent">
          {trustPoints}
        </div>
      </div>
      <div className="text-[10px] font-semibold text-blue-600/80 mt-2 uppercase tracking-wider">
        Trust Points
      </div>
    </div>
  );
}
