import { Button } from "@/components/ui/button";
import { Linkedin, Share2, Users, Eye } from "lucide-react";
import type { MouseEvent } from "react";
import type { ShareDealData } from "../ShareDealPopover";
import { ShareDealModal } from "../ShareDealModal";

interface CardActionFooterProps {
  linkedinUrl?: string;
  interestedCount: number;
  viewsCount: number;
  shareData?: ShareDealData;
  onShareClick?: (
    dealId: string,
    platform: "facebook" | "twitter" | "linkedin" | "copy"
  ) => Promise<{ sharerCode: string; shareUrl: string } | null>;
}

export function CardActionFooter({
  linkedinUrl,
  interestedCount,
  viewsCount,
  shareData,
  onShareClick,
}: CardActionFooterProps) {
  const handleLinkedinClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  const shareButton = (
    <Button
      size="sm"
      disabled={!shareData}
      className="order-1 h-8 w-full gap-1.5 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg sm:order-none sm:w-auto"
    >
      <Share2 className="h-4 w-4" />
      Share
    </Button>
  );

  return (
    <div className="border-t border-dashed border-border px-4 pb-4 pt-4 sm:px-5 lg:px-6">
      {/* Meta row */}
      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {interestedCount} interested
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          {viewsCount} views
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {linkedinUrl && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="order-2 h-8 flex-1 gap-1.5 sm:order-none sm:w-auto sm:flex-initial"
          >
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkedinClick}
              title="LinkedIn Profile"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          </Button>
        )}
        {shareData ? (
          <ShareDealModal
            deal={shareData}
            onShareClick={onShareClick}
            trigger={shareButton}
          />
        ) : (
          shareButton
        )}
      </div>
    </div>
  );
}
