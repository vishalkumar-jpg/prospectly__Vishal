import { Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PublicRequestMobileClaimBarProps = {
  claimerShare: number;
  claiming: boolean;
  onClaim: () => void;
};

export function PublicRequestMobileClaimBar({
  claimerShare,
  claiming,
  onClaim,
}: PublicRequestMobileClaimBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t border-border bg-background/95 p-4 backdrop-blur-xl md:hidden">
      <Button
        size="lg"
        onClick={onClaim}
        disabled={claiming}
        className="flex-1 gap-2 bg-brand-gradient text-brand-foreground shadow-brand-cta"
      >
        {claiming ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Redirecting...
          </>
        ) : (
          <>
            <Wallet className="h-5 w-5" />
            Claim This Intro — ${claimerShare.toLocaleString("en-US")}
          </>
        )}
      </Button>
    </div>
  );
}
