import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Linkedin, Link2 } from "lucide-react";
import type { SharedDeal } from "./types";

interface SharedDealAnalyticsProps {
  analytics: SharedDeal["analytics"] & {
    platformAnalytics?: Array<{
      platform: "linkedin" | "twitter" | "facebook" | "copy";
      clicks: number;
      signupAttempts: number;
      claimAttempts: number;
      successfulClaims: number;
    }>;
  };
}

const platformConfig = {
  linkedin: {
    name: "LinkedIn",
    icon: Linkedin,
    iconBg: "bg-[#0A66C2]",
    textColor: "text-[#0A66C2]",
    cardBg: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-900/30",
  },
  twitter: {
    name: "X (Twitter)",
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    iconBg: "bg-black",
    textColor: "text-slate-900 dark:text-slate-100",
    cardBg: "bg-slate-50 dark:bg-slate-900/20",
    borderColor: "border-slate-200 dark:border-slate-800",
  },
  facebook: {
    name: "Facebook",
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    iconBg: "bg-[#1877F2]",
    textColor: "text-[#1877F2]",
    cardBg: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-900/30",
  },
  copy: {
    name: "Direct Link",
    icon: Link2,
    iconBg: "bg-slate-600",
    textColor: "text-slate-700 dark:text-slate-300",
    cardBg: "bg-slate-50 dark:bg-slate-900/20",
    borderColor: "border-slate-200 dark:border-slate-800",
  },
};

export function SharedDealAnalytics({ analytics }: SharedDealAnalyticsProps) {
  const platformAnalytics = analytics.platformAnalytics || [];

  return (
    <div className="space-y-4">
      {/* Platform Performance Section */}
      {platformAnalytics.length > 0 && (
        <div className="space-y-3">
          <h6 className="text-sm font-semibold text-foreground">
            Platform Performance
          </h6>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platformAnalytics.map((platform) => {
              const config = platformConfig[platform.platform];
              const Icon = config.icon;

              return (
                <div
                  key={platform.platform}
                  className={cn(
                    "rounded-lg border p-4 sm:p-5",
                    config.cardBg,
                    config.borderColor
                  )}
                >
                  {/* Platform Header */}
                  <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 p-2 rounded text-primary-foreground dark:text-primary-foreground",
                        config.iconBg
                      )}
                    >
                      <Icon />
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {config.name}
                    </span>
                  </div>

                  {/* Platform Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <PlatformStat
                      value={platform.clicks}
                      label="Clicks"
                      textColor={config.textColor}
                    />
                    <PlatformStat
                      value={platform.signupAttempts}
                      label="Signups"
                      textColor={config.textColor}
                    />
                    <PlatformStat
                      value={platform.successfulClaims}
                      label="Claims"
                      textColor={config.textColor}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform Badges (if no detailed analytics yet) */}
      {platformAnalytics.length === 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Shared via:</span>
          {Object.entries(analytics.sharesByPlatform).map(
            ([platform, count]) => {
              if (count === 0) return null;
              const config =
                platformConfig[platform as keyof typeof platformConfig];
              if (!config) return null;
              const Icon = config.icon;

              return (
                <Badge
                  key={platform}
                  className={cn(
                    "gap-1 px-2 py-1 h-6 text-white border-0 text-xs font-medium",
                    config.iconBg
                  )}
                >
                  <Icon />
                  {config.name} ({count})
                </Badge>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function PlatformStat({
  value,
  label,
  textColor,
}: {
  value: number;
  label: string;
  textColor: string;
}) {
  return (
    <div className="text-center">
      <p className={cn("text-lg font-bold mb-0.5", textColor)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
