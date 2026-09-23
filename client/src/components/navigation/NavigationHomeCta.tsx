import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useWorkspaceHomeDestination } from "@/hooks/useWorkspaceHomeDestination";
import { cn } from "@/lib/utils";
import { authBtnClass, marketingDashboardClass } from "./navigation-constants";

interface NavigationHomeCtaProps {
  marketingSurface?: boolean;
  isMobile: boolean;
  onMenuClose?: () => void;
}

export function NavigationHomeCta({
  marketingSurface = true,
  isMobile,
  onMenuClose,
}: NavigationHomeCtaProps) {
  const { path, label, isLoading } = useWorkspaceHomeDestination();

  const buttonClass = cn(
    marketingSurface
      ? marketingDashboardClass
      : cn(
          authBtnClass,
          "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        ),
    isMobile && "w-full justify-center",
    !marketingSurface &&
      isMobile &&
      "w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
  );

  if (isLoading) {
    return (
      <Button
        className={buttonClass}
        variant={marketingSurface ? undefined : "outline"}
        disabled
        aria-busy="true"
      >
        Loading…
      </Button>
    );
  }

  return (
    <Button
      asChild
      className={buttonClass}
      variant={marketingSurface ? undefined : "outline"}
      onClick={onMenuClose}
    >
      <Link to={path}>{label}</Link>
    </Button>
  );
}
