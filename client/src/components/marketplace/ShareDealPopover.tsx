import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Share2,
  Facebook,
  Linkedin,
  Copy,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useMySharedRequests } from "@/hooks/useMySharedRequests";

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

export interface ShareDealData {
  dealId: string;
  sharerCode: string;
  prospectName: string;
  prospectCompany: string;
  bountyAmount: number;
  meetingTitle: string;
}

interface ShareDealPopoverProps {
  deal: ShareDealData;
  onShareClick?: (
    dealId: string,
    platform: "facebook" | "twitter" | "linkedin" | "copy"
  ) => Promise<{ sharerCode: string; shareUrl: string } | null>;
  trigger?: React.ReactNode;
  className?: string;
}

export function ShareDealPopover({
  deal,
  onShareClick,
  trigger,
  className,
}: ShareDealPopoverProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { shares, loading: sharesLoading } = useMySharedRequests();
  const userId = user?.id;
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [open, setOpen] = useState(false);
  // Track the created share URL - only show after a share is created via API
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);

  // Generate share text
  const shareText = `Know ${deal.prospectName} at ${deal.prospectCompany}? Earn $${Math.floor(deal.bountyAmount / 2)} by making an introduction. Check it out:`;

  // localStorage key for this deal - scoped to current user
  const storageKey = `marketplace-share-${deal.dealId}-${userId || "anonymous"}`;

  // Load persisted share URL on mount
  useEffect(() => {
    const loadPersistedShare = () => {
      // Wait for shares data to be available from hook
      if (sharesLoading) {
        return;
      }

      // Find existing share from hook data (authoritative source)
      const existingShare = shares.find(
        (share) => share.request.id === deal.dealId
      );

      if (existingShare) {
        // Validate localStorage against hook data
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            // Only use localStorage if it matches the authoritative sharerCode from hook
            if (
              parsed.shareUrl &&
              parsed.sharerCode === existingShare.sharerCode
            ) {
              setCreatedShareUrl(parsed.shareUrl);
              return;
            }
          }
        } catch {
          // Ignore localStorage errors
        }
      } else {
        // No share found in hook data - clear localStorage if it exists (stale data)
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            localStorage.removeItem(storageKey);
          }
        } catch {
          // Ignore localStorage errors
        }
      }
    };

    loadPersistedShare();
  }, [deal.dealId, userId, shares, sharesLoading]);

  // Helper function to persist share URL
  const persistShareUrl = (shareUrl: string, sharerCode: string) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          shareUrl,
          sharerCode,
          createdAt: Date.now(),
        })
      );
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleCopyToClipboard = async () => {
    setIsCopying(true);
    try {
      // Call onShareClick first to create share record and get shareUrl
      if (!onShareClick) {
        toast({
          title: "Share unavailable",
          description: "Unable to generate share link. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const result = await onShareClick(deal.dealId, "copy");
      if (!result?.shareUrl) {
        toast({
          title: "Failed to generate link",
          description: "Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Save the created share URL
      setCreatedShareUrl(result.shareUrl);
      // Persist to localStorage
      persistShareUrl(result.shareUrl, result.sharerCode);

      await navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      toast({
        title: "Copied to clipboard!",
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

  const handleShareFacebook = async () => {
    if (!onShareClick) return;

    const result = await onShareClick(deal.dealId, "facebook");
    if (!result?.shareUrl) return;

    // Save the created share URL
    setCreatedShareUrl(result.shareUrl);
    // Persist to localStorage
    persistShareUrl(result.shareUrl, result.sharerCode);

    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(result.shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, "_blank", "width=600,height=400");
  };

  const handleShareTwitter = async () => {
    if (!onShareClick) return;

    const result = await onShareClick(deal.dealId, "twitter");
    if (!result?.shareUrl) return;

    // Save the created share URL
    setCreatedShareUrl(result.shareUrl);

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(result.shareUrl)}`;
    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  const handleShareLinkedIn = async () => {
    if (!onShareClick) return;

    const result = await onShareClick(deal.dealId, "linkedin");
    if (!result?.shareUrl) return;

    // Save the created share URL
    setCreatedShareUrl(result.shareUrl);
    // Persist to localStorage
    persistShareUrl(result.shareUrl, result.sharerCode);

    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(result.shareUrl)}`;
    window.open(linkedinUrl, "_blank", "width=600,height=400");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <h4 className="font-semibold text-sm">Share this opportunity</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Earn 50% of the payout (${Math.floor(deal.bountyAmount / 2)}) when
            someone you share with claims and completes this deal
          </p>
        </div>

        <div className="p-4 space-y-3">
          {/* Social Share Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleShareFacebook}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] transition-colors group"
            >
              <Facebook className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">Facebook</span>
            </button>

            <button
              onClick={handleShareTwitter}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-foreground transition-colors group"
            >
              <TwitterIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">X / Twitter</span>
            </button>

            <button
              onClick={handleShareLinkedIn}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2] transition-colors group"
            >
              <Linkedin className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">LinkedIn</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-popover px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Copy Link Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 truncate text-xs text-muted-foreground font-mono">
                {createdShareUrl ||
                  "Click a share option to generate your unique link"}
              </div>
              <Button
                size="sm"
                variant={copied ? "default" : "outline"}
                className={cn(
                  "shrink-0 gap-1.5",
                  copied && "bg-green-600 hover:bg-green-700"
                )}
                onClick={handleCopyToClipboard}
                disabled={isCopying}
              >
                {isCopying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Copying
                  </>
                ) : copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Preview Link - only show when share has been created */}
          {createdShareUrl && (
            <a
              href={createdShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Preview public page
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ShareDealPopover;
