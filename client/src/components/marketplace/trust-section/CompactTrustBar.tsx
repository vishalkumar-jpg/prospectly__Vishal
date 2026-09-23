import { Users, Shield, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformStats } from "./types";

interface CompactTrustBarProps {
  stats: PlatformStats;
  className?: string;
}

export function CompactTrustBar({ stats, className }: CompactTrustBarProps) {
  return (
    <div
      className={cn(
        "bg-gradient-to-r from-primary/5 to-primary/10 py-6",
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo and Tagline */}
          <div className="flex items-center gap-3">
            <img
              src="/prospectly-logo.png"
              alt="Prospectly"
              className="h-8 w-auto"
            />
            <div className="h-6 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              The trusted platform for professional introductions
            </span>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium">{stats.users}</span>
              <span className="text-muted-foreground">users</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="font-medium">Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">4.9/5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
