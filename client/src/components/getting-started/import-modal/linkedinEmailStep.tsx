import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { ImportModalActionCard } from "@/components/getting-started/import-modal/actionCard";
import { ImportModalHero } from "@/components/getting-started/import-modal/hero";
import { ImportModalPrimaryCta } from "@/components/getting-started/import-modal/primaryCta";
import { ImportModalTextButton } from "@/components/getting-started/import-modal/textButton";
import { ImportModalTip } from "@/components/getting-started/import-modal/tip";
import { GettingStartedIconBadge } from "@/assets/getting-started/getting-started-icon-badge";

interface LinkedInImportEmailStepProps {
  onDownloaded: () => void;
  onBack: () => void;
}

export function LinkedInImportEmailStep({
  onDownloaded,
  onBack,
}: LinkedInImportEmailStepProps) {
  return (
    <>
      <ImportModalDots activeIndex={1} total={4} />
      <ImportModalHero
        variant="neutral"
        icon={<GettingStartedIconBadge name="mail" size="hero" bare />}
        title="Check your email"
        description={
          <>
            LinkedIn will send you a download link. This usually takes{" "}
            <strong>under 10 minutes</strong>.
          </>
        }
      />
      <ImportModalActionCard
        visual={<GettingStartedIconBadge name="download" size="hero" />}
        label="When you get the email"
        title="Download the ZIP file"
        description={
          <>
            Click the download link in LinkedIn&apos;s email. Save the ZIP file
            somewhere easy to find (like your Desktop).
          </>
        }
      />
      <ImportModalTip icon={<GettingStartedIconBadge name="clock" size="sm" />}>
        You can close this popup and come back later — we&apos;ll save your
        progress.
      </ImportModalTip>
      <ImportModalPrimaryCta type="button" onClick={onDownloaded}>
        I Downloaded It →
      </ImportModalPrimaryCta>
      <ImportModalTextButton type="button" onClick={onBack}>
        ← Go back
      </ImportModalTextButton>
    </>
  );
}
