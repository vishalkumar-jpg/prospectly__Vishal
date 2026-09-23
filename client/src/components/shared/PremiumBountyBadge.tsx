import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumBountyBadgeProps {
  amount: number;
  size?: "sm" | "md" | "lg";
  variant?: "card" | "flat";
  className?: string;
}

export function PremiumBountyBadge({
  amount,
  size = "md",
  variant = "card",
  className,
}: PremiumBountyBadgeProps) {
  const sizes = {
    sm: {
      container: "w-[120px] h-[70px]",
      text: "text-lg",
      chip: "w-6 h-4",
      icon: "h-4 w-4",
    },
    md: {
      container: "w-[160px] h-[95px]",
      text: "text-2xl",
      chip: "w-8 h-6",
      icon: "h-5 w-5",
    },
    lg: {
      container: "w-[200px] h-[120px]",
      text: "text-3xl",
      chip: "w-10 h-7",
      icon: "h-6 w-6",
    },
  };

  if (variant === "flat") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-2 border-amber-500/30 shadow-lg",
          className
        )}
      >
        <DollarSign className="h-5 w-5 text-amber-600" />
        <span className="text-xl font-black text-amber-600">
          ${amount.toLocaleString()}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative group/bounty", className)}>
      <div
        className={cn(
          sizes[size].container,
          "rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-4 shadow-2xl border-2 border-amber-300/50 transition-transform group-hover/bounty:scale-105"
        )}
      >
        {/* Pattern background */}
        <div className="absolute inset-0 opacity-10 overflow-hidden rounded-xl">
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-white blur-sm" />
          <div className="absolute bottom-3 left-3 w-6 h-6 rounded-full border-2 border-white blur-sm" />
        </div>

        {/* Holographic chip */}
        <div
          className={cn(
            sizes[size].chip,
            "absolute top-3 left-3 rounded bg-gradient-to-br from-yellow-200 to-amber-400 opacity-80"
          )}
        />

        {/* Amount */}
        <div className="relative flex flex-col items-end justify-end h-full">
          <div className="flex items-center gap-1">
            <DollarSign className={cn("text-white", sizes[size].icon)} />
            <span className={cn(sizes[size].text, "font-black text-white")}>
              {amount.toLocaleString()}
            </span>
          </div>
          <p className="text-[8px] font-bold text-white/80 uppercase tracking-wider">
            Referral Payout
          </p>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 -z-10 bg-amber-500/40 blur-xl opacity-0 group-hover/bounty:opacity-100 transition-opacity rounded-xl" />
    </div>
  );
}
