import { Building2 } from "lucide-react";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import type { MarketplaceDeal } from "./types";

interface CardHeaderProps {
  deal: MarketplaceDeal;
}

export function CardHeader({ deal }: CardHeaderProps) {
  // Prefer contact data from contacts table, fallback to introduction request data
  const jobTitle = deal.prospect.jobTitle || deal.prospect.title || "";
  const company = deal.prospect.company || "";

  return (
    <div className="p-4 sm:p-5 lg:p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <PremiumAvatar
          name={deal.prospect.name}
          size="md"
          imageUrl={deal.prospect.photoUrl}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-foreground transition-colors group-hover:text-brand-amethyst">
                {deal.prospect.name}
              </h3>
              {jobTitle && (
                <p
                  className="mt-0.5 line-clamp-2 text-sm font-medium text-foreground/80"
                  title={jobTitle}
                >
                  {jobTitle}
                </p>
              )}
              {company && (
                <div className="mt-1 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="truncate text-sm font-medium text-muted-foreground">
                    {company}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Agenda */}
      <div className="mt-4 rounded-xl border border-border bg-muted/50 p-3">
        <p className="mb-1 line-clamp-1 text-sm font-semibold text-foreground">
          "{deal.meetingAgenda.title}"
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {deal.meetingAgenda.description}
        </p>
      </div>
    </div>
  );
}
