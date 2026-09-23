import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnifiedStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color:
    | "green"
    | "blue"
    | "amber"
    | "red"
    | "purple"
    | "orange"
    | "teal"
    | "slate";
  isLoading?: boolean;
  isCurrency?: boolean;
}

const colorConfigs = {
  green: {
    gradient:
      "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30",
    border: "border-green-200/50 dark:border-green-800/50",
    iconBg: "bg-green-500/15",
    iconColor: "text-green-600 dark:text-green-400",
  },
  blue: {
    gradient:
      "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
    border: "border-blue-200/50 dark:border-blue-800/50",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  amber: {
    gradient:
      "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
    border: "border-amber-200/50 dark:border-amber-800/50",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  red: {
    gradient: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30",
    border: "border-red-200/50 dark:border-red-800/50",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-600 dark:text-red-400",
  },
  purple: {
    gradient:
      "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30",
    border: "border-purple-200/50 dark:border-purple-800/50",
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  orange: {
    gradient:
      "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30",
    border: "border-orange-200/50 dark:border-orange-800/50",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  teal: {
    gradient:
      "from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30",
    border: "border-teal-200/50 dark:border-teal-800/50",
    iconBg: "bg-teal-500/15",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  slate: {
    gradient:
      "from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30",
    border: "border-slate-200/50 dark:border-slate-800/50",
    iconBg: "bg-slate-500/15",
    iconColor: "text-slate-600 dark:text-slate-400",
  },
};

export function UnifiedStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  isLoading = false,
  isCurrency = false,
}: UnifiedStatCardProps) {
  const config = colorConfigs[color];

  const formatValue = () => {
    if (typeof value === "number" && isCurrency) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value;
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md",
        "bg-gradient-to-br",
        config.gradient,
        config.border
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              config.iconBg
            )}
          >
            <Icon className={cn("h-6 w-6", config.iconColor)} />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-muted/50 animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold text-foreground">
              {formatValue()}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
