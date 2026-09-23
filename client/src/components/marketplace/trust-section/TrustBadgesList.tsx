import type { TrustBadge } from "./types";

interface TrustBadgesListProps {
  badges: TrustBadge[];
}

export function TrustBadgesList({ badges }: TrustBadgesListProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 mb-12">
      {badges.map((badge, index) => (
        <div
          key={index}
          className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border"
        >
          <badge.icon className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-medium">{badge.label}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
