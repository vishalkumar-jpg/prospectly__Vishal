import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { authBtnClass, marketingDashboardClass } from "./navigation-constants";
import { NavigationHomeCta } from "./NavigationHomeCta";

interface NavigationAuthButtonsProps {
  marketingSurface: boolean;
  loading: boolean;
  user: ReturnType<typeof useAuth>["user"];
  onMenuClose?: () => void;
  layout: "desktop" | "mobile";
}

export function NavigationAuthButtons({
  marketingSurface,
  loading,
  user,
  onMenuClose,
  layout,
}: NavigationAuthButtonsProps) {
  const isMobile = layout === "mobile";
  const loadingClass = cn(
    "text-sm",
    marketingSurface ? "text-home-muted" : "text-primary",
    isMobile && "py-2 text-center"
  );

  if (loading) {
    return <span className={loadingClass}>Loading...</span>;
  }

  if (user) {
    return (
      <NavigationHomeCta
        marketingSurface={marketingSurface}
        isMobile={isMobile}
        onMenuClose={onMenuClose}
      />
    );
  }

  if (marketingSurface) {
    return (
      <Button
        asChild
        className={cn(
          marketingDashboardClass,
          isMobile && "w-full justify-center"
        )}
        onClick={onMenuClose}
      >
        <Link to="/signin">Sign In</Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        asChild
        variant="outline"
        className={cn(
          isMobile
            ? "w-full justify-center border-primary text-lg font-medium text-primary hover:bg-primary hover:text-primary-foreground"
            : cn(
                authBtnClass,
                "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              )
        )}
        onClick={onMenuClose}
      >
        <Link to="/signin">Sign In</Link>
      </Button>
      <Button
        asChild
        className={cn(
          isMobile
            ? "w-full justify-center bg-primary text-lg font-medium text-primary-foreground hover:bg-primary/90"
            : cn(
                authBtnClass,
                "bg-primary font-bold text-primary-foreground hover:bg-primary/90"
              )
        )}
        onClick={onMenuClose}
      >
        <Link to="/signup">Get Started</Link>
      </Button>
    </>
  );
}
