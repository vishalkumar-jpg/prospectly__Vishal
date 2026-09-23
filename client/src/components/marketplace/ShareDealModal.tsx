import { useState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Copy,
  Linkedin,
  Facebook,
  Check,
  Loader2,
  ExternalLink,
  UserCheck,
  Users,
  Star,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { ShareDealData } from "./ShareDealPopover";

const formatPayoutAmount = (value: unknown): string => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `$${parsed.toLocaleString()}` : "—";
};

// Twitter/X icon component
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface ShareDealModalProps {
  deal: ShareDealData;
  onShareClick?: (
    dealId: string,
    platform: "facebook" | "twitter" | "linkedin" | "copy"
  ) => Promise<{ sharerCode: string; shareUrl: string } | null>;
  trigger?: ReactNode;
}

export function ShareDealModal({
  deal,
  onShareClick,
  trigger,
}: ShareDealModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.id;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);

  const sharerShare = Math.floor(deal.bountyAmount / 2);
  const storageKey = `marketplace-share-${deal.dealId}-${userId || "anonymous"}`;

  // Load persisted share URL when modal opens
  useEffect(() => {
    if (!open) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.shareUrl) {
          setCreatedShareUrl(parsed.shareUrl);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey, open]);

  // Reset transient state when modal closes
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setIsCopying(false);
    }
  }, [open]);

  const persistShareUrl = (shareUrl: string, sharerCode: string) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ shareUrl, sharerCode, createdAt: Date.now() })
      );
    } catch {
      // Ignore localStorage errors
    }
  };

  const shareText = `Know ${deal.prospectName} at ${deal.prospectCompany}? Earn $${sharerShare} by making an introduction. Check it out:`;

  const openSocialShare = async (
    platform: "facebook" | "twitter" | "linkedin",
    buildUrl: (shareUrl: string) => string
  ) => {
    if (!onShareClick) return;
    try {
      const result = await onShareClick(deal.dealId, platform);
      if (!result?.shareUrl) return;

      setCreatedShareUrl(result.shareUrl);
      persistShareUrl(result.shareUrl, result.sharerCode);

      window.open(buildUrl(result.shareUrl), "_blank", "width=600,height=400");
    } catch {
      toast({
        title: "Share failed",
        description: "Unable to open the share window. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShareLinkedIn = () =>
    openSocialShare(
      "linkedin",
      (shareUrl) =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    );

  const handleShareTwitter = () =>
    openSocialShare(
      "twitter",
      (shareUrl) =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    );

  const handleShareFacebook = () =>
    openSocialShare(
      "facebook",
      (shareUrl) =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`
    );

  const handleCopyLink = async () => {
    if (!onShareClick) {
      toast({
        title: "Share unavailable",
        description: "Unable to generate share link. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsCopying(true);
    try {
      const result = await onShareClick(deal.dealId, "copy");
      if (!result?.shareUrl) {
        toast({
          title: "Failed to generate link",
          description: "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setCreatedShareUrl(result.shareUrl);
      persistShareUrl(result.shareUrl, result.sharerCode);

      await navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link on any platform to earn rewards.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please try again or copy the link manually.",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        mobileFullscreen
        hideCloseButton
      >
        {/* Earnings hero */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider opacity-95">
              <Star className="h-3.5 w-3.5 fill-current" />
              Refer &amp; earn up to
            </div>
            <DialogTitle className="mt-2 font-mono text-4xl font-extrabold leading-none tracking-tight text-white sm:text-5xl">
              {formatPayoutAmount(sharerShare)}
            </DialogTitle>
            <DialogDescription className="mt-2.5 max-w-[320px] text-[13.5px] leading-relaxed text-white/95">
              Share this introduction request and earn 50% of the referral
              payout when someone you refer claims and completes it.
            </DialogDescription>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6 sm:p-7">
          {/* Scenarios */}
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center gap-3 p-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-success/10 text-brand-success">
                <UserCheck className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold leading-tight text-foreground">
                  Total referral payout
                </p>
                <p className="text-xs text-muted-foreground">
                  On this introduction request
                </p>
              </div>
              <span className="shrink-0 font-mono text-lg font-extrabold text-brand-amethyst">
                {formatPayoutAmount(deal.bountyAmount)}
              </span>
            </div>
            <div className="flex items-center gap-3 border-t border-border p-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
                <Users className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold leading-tight text-foreground">
                  Your share when claimed
                </p>
                <p className="text-xs text-muted-foreground">
                  Earn 50% when the intro completes
                </p>
              </div>
              <span className="shrink-0 font-mono text-lg font-extrabold text-brand-amethyst">
                {formatPayoutAmount(sharerShare)}
              </span>
            </div>
          </div>

          {/* Share URL display */}
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/50 p-2.5 sm:p-3">
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate font-mono text-xs text-muted-foreground">
                {createdShareUrl ||
                  "Click a share option to generate your link"}
              </p>
            </div>
            <Button
              size="sm"
              variant={copied ? "default" : "outline"}
              className={cn(
                "shrink-0 gap-1.5",
                copied && "bg-brand-success hover:bg-brand-success/90"
              )}
              onClick={handleCopyLink}
              disabled={isCopying}
            >
              {isCopying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">Copying</span>
                </>
              ) : copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </Button>
          </div>

          {/* Social share */}
          <div>
            <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Share via
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                onClick={handleShareLinkedIn}
                className="group flex flex-col items-center gap-1.5 rounded-xl bg-[#0A66C2]/10 p-3 text-[#0A66C2] transition-colors hover:bg-[#0A66C2]/20 sm:gap-2 sm:p-4"
              >
                <Linkedin className="h-5 w-5 transition-transform group-hover:scale-110 sm:h-6 sm:w-6" />
                <span className="text-[10px] font-medium sm:text-xs">
                  LinkedIn
                </span>
              </button>
              <button
                onClick={handleShareTwitter}
                className="group flex flex-col items-center gap-1.5 rounded-xl bg-black/5 p-3 text-foreground transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 sm:gap-2 sm:p-4"
              >
                <TwitterIcon className="h-5 w-5 transition-transform group-hover:scale-110 sm:h-6 sm:w-6" />
                <span className="text-[10px] font-medium sm:text-xs">
                  X / Twitter
                </span>
              </button>
              <button
                onClick={handleShareFacebook}
                className="group flex flex-col items-center gap-1.5 rounded-xl bg-[#1877F2]/10 p-3 text-[#1877F2] transition-colors hover:bg-[#1877F2]/20 sm:gap-2 sm:p-4"
              >
                <Facebook className="h-5 w-5 transition-transform group-hover:scale-110 sm:h-6 sm:w-6" />
                <span className="text-[10px] font-medium sm:text-xs">
                  Facebook
                </span>
              </button>
            </div>
          </div>

          {/* Preview link */}
          {createdShareUrl && (
            <a
              href={createdShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs text-brand-amethyst hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Preview public page
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDealModal;
