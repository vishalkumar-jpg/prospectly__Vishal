import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavigationBrandProps {
  isWaitlistPage: boolean;
  marketingSurface: boolean;
  onNavigate?: () => void;
}

export function NavigationBrand({
  isWaitlistPage,
  marketingSurface,
  onNavigate,
}: NavigationBrandProps) {
  const trademarkClass = cn(
    "text-xs",
    marketingSurface ? "text-home-muted" : "text-muted-foreground",
    !isWaitlistPage && "ml-1"
  );

  const logo = (
    <img
      src="/prospectly-logo.png"
      alt="Prospectly"
      className="h-8 w-auto cursor-pointer"
    />
  );

  if (isWaitlistPage) {
    return (
      <div className="flex items-center">
        {logo}
        <span className={trademarkClass}>™</span>
      </div>
    );
  }

  return (
    <Link to="/" className="flex items-center gap-2.5" onClick={onNavigate}>
      {logo}
      <span className={trademarkClass}>™</span>
    </Link>
  );
}
