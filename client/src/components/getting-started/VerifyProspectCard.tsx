import {
  VerifyInfoCircleSkyIcon,
  VerifyProspectBadgeCheckIcon,
} from "@/assets/getting-started/verify-svgs";

interface VerifyProspectCardProps {
  prospectName: string;
  prospectTitle: string;
  prospectCompany: string;
  claimerShare: number;
  showImportHint: boolean;
}

export function VerifyProspectCard({
  prospectName,
  prospectTitle,
  prospectCompany,
  claimerShare,
  showImportHint,
}: VerifyProspectCardProps) {
  const initial = prospectName?.charAt(0)?.toUpperCase() || "?";

  return (
    <div>
      <div className="flex items-center gap-4 p-[18px] rounded-[14px] bg-card border border-border">
        <div className="w-[52px] h-[52px] rounded-[14px] text-white flex items-center justify-center text-xl font-extrabold flex-shrink-0 relative bg-gs-brand-gradient">
          {initial}
          <div className="absolute -bottom-[3px] -right-[3px] w-[18px] h-[18px] rounded-full bg-background flex items-center justify-center border-2 border-background shadow-sm">
            <VerifyProspectBadgeCheckIcon />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-extrabold mb-0.5">{prospectName}</div>
          <div
            className="text-[13px] text-muted-foreground leading-[1.4] line-clamp-2"
          >
            {prospectTitle}
            {prospectTitle && prospectCompany ? " at " : ""}
            {prospectCompany}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-[26px] font-extrabold leading-none text-gs-brand-gradient">
            ${claimerShare.toFixed(0)}
          </div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
            Intro Value
          </div>
        </div>
      </div>

      {showImportHint && (
        <div className="mt-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
            Import your contacts from any source below
          </div>
          <div className="flex items-center gap-1.5 p-2 px-3 rounded-lg border border-gs-sky/15 bg-gs-sky/8 text-[12px] text-muted-foreground leading-[1.4]">
            <VerifyInfoCircleSkyIcon />
            <span>
              We'll <strong className="text-foreground">automatically check</strong> if this
              prospect exists in your network once you import contacts.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
