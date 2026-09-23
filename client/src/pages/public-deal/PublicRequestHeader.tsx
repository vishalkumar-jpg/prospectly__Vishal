import { Link } from "react-router-dom";
import { Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PublicRequestHeaderProps = {
  claiming: boolean;
  onClaim: () => void;
};

export function PublicRequestHeader({
  claiming,
  onClaim,
}: PublicRequestHeaderProps) {
  return (
    <header className="sticky top-0 z-[60] flex h-[60px] items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-8">
      <Link to="/" className="flex flex-shrink-0 items-center gap-2">
        <img
          src="/prospectly-logo.png"
          alt="Prospectly"
          className="h-8 w-auto"
        />
      </Link>
      <div className="hidden items-center gap-2 md:flex">
        <Button
          size="sm"
          onClick={onClaim}
          disabled={claiming}
          className="gap-2 bg-brand-gradient text-brand-foreground shadow-brand-cta hover:shadow-brand-cta-lg"
        >
          {claiming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4" />
              Claim This Intro
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
