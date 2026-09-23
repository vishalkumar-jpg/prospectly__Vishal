import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  navInnerDefault,
  navInnerMarketing,
} from "./navigation/navigation-constants";
import { NavigationBrand } from "./navigation/NavigationBrand";
import { NavigationAuthButtons } from "./navigation/NavigationAuthButtons";

export interface NavigationProps {
  /** Landing-page chrome: lighter bar matching homepage HTML mockup */
  marketingSurface?: boolean;
}

const Navigation = ({ marketingSurface = true }: NavigationProps) => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isWaitlistPage = location.pathname.startsWith("/waitlist");
  const isSignInPage = location.pathname === "/signin";
  const isSignUpPage = location.pathname === "/signup";

  return (
    <>
      <a
        href="#main-content"
        className={cn(
          "sr-only focus-visible:not-sr-only",
          "focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100]",
          "focus-visible:rounded-lg focus-visible:bg-home-amethyst focus-visible:px-4 focus-visible:py-2",
          "focus-visible:text-sm focus-visible:font-semibold focus-visible:text-white",
          "focus-visible:shadow-home-cta focus-visible:outline-none"
        )}
      >
        Skip to main content
      </a>
      <nav
        className={cn(
          "fixed top-0 z-50 w-full",
          marketingSurface
            ? "h-16 border-0 bg-home-bg/60 backdrop-blur-[16px]"
            : "border-b border-border bg-background/80 backdrop-blur-md"
        )}
      >
        <div
          className={cn(
            marketingSurface ? navInnerMarketing : navInnerDefault,
            "min-h-16"
          )}
        >
          <div className="flex min-w-0 shrink items-center gap-2.5">
            <NavigationBrand
              isWaitlistPage={isWaitlistPage}
              marketingSurface={marketingSurface}
            />
          </div>

          {!isSignInPage && !isSignUpPage && (
            <>
              <div
                className={cn(
                  "hidden shrink-0 items-center md:flex",
                  marketingSurface ? "gap-6" : "gap-3 md:gap-4"
                )}
              >
                <NavigationAuthButtons
                  marketingSurface={marketingSurface}
                  loading={loading}
                  user={user}
                  layout="desktop"
                />
              </div>

              <div className="md:hidden">
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className={cn(
                    "p-2",
                    marketingSurface ? "text-home-fg" : "text-foreground"
                  )}
                  aria-label="Open menu"
                >
                  <Menu size={24} />
                </button>
              </div>
            </>
          )}
        </div>

        {isMenuOpen && !isSignInPage && !isSignUpPage && (
          <div
            className={cn(
              "fixed left-0 top-0 z-[60] w-full animate-in rounded-b-3xl border-b shadow-xl slide-in-from-top-5",
              marketingSurface
                ? "border-home-border bg-home-bg/95 backdrop-blur-[16px]"
                : "border-border bg-background/95 backdrop-blur-md"
            )}
          >
            <div
              className={cn(
                marketingSurface ? navInnerMarketing : navInnerDefault,
                "flex-col py-4"
              )}
            >
              <div className="mb-6 flex w-full items-center justify-between">
                <NavigationBrand
                  isWaitlistPage={isWaitlistPage}
                  marketingSurface={marketingSurface}
                  onNavigate={() => setIsMenuOpen(false)}
                />

                <button
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "p-2",
                    marketingSurface ? "text-home-fg" : "text-foreground"
                  )}
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex w-full flex-col space-y-4 pb-4">
                <NavigationAuthButtons
                  marketingSurface={marketingSurface}
                  loading={loading}
                  user={user}
                  layout="mobile"
                  onMenuClose={() => setIsMenuOpen(false)}
                />
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export { NavigationHomeCta } from "./navigation/NavigationHomeCta";
export { NavigationAuthButtons } from "./navigation/NavigationAuthButtons";
export { NavigationBrand } from "./navigation/NavigationBrand";
export default Navigation;
