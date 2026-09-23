import { Building2, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type UserOrganizationBadge = {
  id: string;
  name: string;
  isVerified: boolean;
};

// Color mappings for each variant using semantic theme tokens
const VARIANT_COLORS = {
  blue: {
    icon: "text-brand-sky",
    badge: "bg-brand-sky/10 hover:bg-brand-sky/20 text-brand-sky",
  },
  purple: {
    icon: "text-brand-amethyst",
    badge:
      "bg-brand-amethyst/10 hover:bg-brand-amethyst/20 text-brand-amethyst",
  },
} as const;

type UserOrganizationsSectionProps = {
  organizations?: UserOrganizationBadge[] | null;
  className?: string;
  variant?: "blue" | "purple";
  hideHeader?: boolean;
};

export function UserOrganizationsSection({
  organizations,
  className,
  variant = "blue",
  hideHeader = false,
}: UserOrganizationsSectionProps) {
  if (!organizations?.length) return null;

  const colors = VARIANT_COLORS[variant];

  return (
    <div className={cn("w-full min-w-0", className)}>
      {!hideHeader && (
        <div className={cn("flex items-center gap-2", "mb-2")}>
          <Building2 className={cn("flex-shrink-0 h-5 w-5", colors.icon)} />
          <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
            Organizations
          </span>
        </div>
      )}
      <p className="text-muted-foreground leading-snug mb-2 text-xs">
        Organizations this person belongs to
      </p>
      <div className="flex flex-wrap gap-2">
        {organizations.map((org) => (
          <div
            key={org.id}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-[11px] font-medium",
              colors.badge
            )}
          >
            <span className="truncate max-w-[200px]">{org.name}</span>
            {org.isVerified && (
              <CheckCheck
                className="h-3 w-3 flex-shrink-0"
                aria-label="Verified"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
