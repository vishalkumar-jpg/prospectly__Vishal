import { useEffect, useState } from "react";
import { BadgeDollarSign, Eye, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { utcDayjs } from "@/lib/dayjs";
import { DATE_FORMATS } from "@/constants/date";
import type { PublicDealData } from "./types";

type PublicRequestStatsProps = {
  request: Pick<PublicDealData, "claimerShare" | "viewCount" | "createdAt">;
};

export function PublicRequestStats({ request }: PublicRequestStatsProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const formattedPostedDate = (() => {
    if (!request.createdAt) return "—";
    const date = utcDayjs(request.createdAt);
    return isHydrated
      ? date.local().format(DATE_FORMATS.US_DATETIME)
      : date.format(DATE_FORMATS.US_DATETIME);
  })();

  const stats = [
    {
      label: "Referral Reward",
      icon: BadgeDollarSign,
      tint: "bg-brand-success/10 text-brand-success border-brand-success/20",
      value: `$${request.claimerShare.toLocaleString("en-US")}`,
    },
    {
      label: "Views",
      icon: Eye,
      tint: "bg-brand-sky/10 text-brand-sky border-brand-sky/20",
      value: request.viewCount.toLocaleString("en-US"),
    },
    {
      label: "Posted",
      icon: Calendar,
      tint: "bg-brand-rose/10 text-brand-rose border-brand-rose/20",
      value: formattedPostedDate,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-3">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={cn(
            "flex items-center gap-4 border-border p-4 sm:p-6",
            i < stats.length - 1 && "border-b sm:border-b-0 sm:border-r"
          )}
        >
          <div
            className={cn(
              "grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border",
              stat.tint
            )}
          >
            <stat.icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="mb-0.5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </div>
            <div className="truncate text-sm font-extrabold leading-tight">
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
