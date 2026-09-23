import { cn } from "@/lib/utils";
import { DollarSign } from "lucide-react";

interface CoinStackProps {
  amount: number;
  maxCoins?: number;
  size?: "sm" | "md" | "lg";
  showAmount?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { coin: "h-6 w-6", offset: 3, fontSize: "text-sm" },
  md: { coin: "h-8 w-8", offset: 4, fontSize: "text-lg" },
  lg: { coin: "h-10 w-10", offset: 5, fontSize: "text-xl" },
};

export function CoinStack({
  amount,
  maxCoins = 5,
  size = "md",
  showAmount = true,
  animated = true,
  className,
}: CoinStackProps) {
  const config = sizeConfig[size];

  // Calculate number of coins based on amount (more money = more coins)
  const coinCount = Math.min(Math.max(Math.ceil(amount / 200), 2), maxCoins);

  return (
    <div className={cn("inline-flex items-end gap-3", className)}>
      {/* Coin Stack */}
      <div
        className="relative"
        style={{
          height: `${parseInt(config.coin) + (coinCount - 1) * config.offset}px`,
        }}
      >
        {Array.from({ length: coinCount }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "absolute rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500",
              "border-2 border-amber-300 shadow-md",
              config.coin,
              animated && "transition-all duration-300 hover:scale-110"
            )}
            style={{
              bottom: index * config.offset,
              left: 0,
              zIndex: coinCount - index,
              animationDelay: animated ? `${index * 100}ms` : undefined,
            }}
          >
            <DollarSign className="h-1/2 w-1/2 text-amber-700" />
          </div>
        ))}
      </div>

      {/* Amount Display */}
      {showAmount && (
        <div className="flex flex-col">
          <span className={cn("font-black text-amber-600", config.fontSize)}>
            ${amount.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Bounty
          </span>
        </div>
      )}
    </div>
  );
}
