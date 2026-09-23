import { cn } from "@/lib/utils";
import { InlineAssetSvg } from "./inline-asset-svg";
import chevronCollapse24 from "./chevron-collapse-24.svg?raw";
import chevronDown24 from "./chevron-down-24.svg?raw";
import dashedRing16 from "./dashed-ring-16.svg?raw";
import infoCircle24 from "./info-circle-24.svg?raw";
import prospectBadgeCheck24 from "./prospect-badge-check-24.svg?raw";
import sourceLinkedinInverse from "./source-linkedin-inverse.svg?raw";
import stepCheck16 from "./step-check-16.svg?raw";
import stepCircle16 from "./step-circle-16.svg?raw";
import stepPlus16 from "./step-plus-16.svg?raw";

export function VerifyBannerChevronIcon({ className }: { className?: string }) {
  return (
    <InlineAssetSvg
      svg={chevronCollapse24}
      className={cn("h-3.5 w-3.5 text-muted-foreground", className)}
      aria-hidden
    />
  );
}

export function VerifyStepCheckIcon({ className }: { className?: string }) {
  return <InlineAssetSvg svg={stepCheck16} className={cn("h-3 w-3", className)} aria-hidden />;
}

export function VerifyStepCircleIcon({ className }: { className?: string }) {
  return <InlineAssetSvg svg={stepCircle16} className={cn("h-3 w-3", className)} aria-hidden />;
}

export function VerifyStepPlusIcon({ className }: { className?: string }) {
  return <InlineAssetSvg svg={stepPlus16} className={cn("h-3 w-3", className)} aria-hidden />;
}

export function VerifyProspectBadgeCheckIcon({ className }: { className?: string }) {
  return <InlineAssetSvg svg={prospectBadgeCheck24} className={cn("h-3 w-3", className)} aria-hidden />;
}

export function VerifyInfoCircleSkyIcon({ className }: { className?: string }) {
  return <InlineAssetSvg svg={infoCircle24} className={cn("h-4 w-4 flex-shrink-0", className)} aria-hidden />;
}

export function VerifyPanelChevronHintIcon({ className }: { className?: string }) {
  return (
    <InlineAssetSvg
      svg={chevronDown24}
      className={cn("h-3.5 w-3.5 flex-shrink-0", className)}
      aria-hidden
    />
  );
}

export function VerifyDashedRingIcon({ className }: { className?: string }) {
  return <InlineAssetSvg svg={dashedRing16} className={cn("h-4 w-4", className)} aria-hidden />;
}

export function VerifySourceLinkedInInverseIcon({ className }: { className?: string }) {
  return (
    <InlineAssetSvg
      svg={sourceLinkedinInverse}
      className={cn("h-3.5 w-3.5", className)}
      aria-hidden
    />
  );
}
