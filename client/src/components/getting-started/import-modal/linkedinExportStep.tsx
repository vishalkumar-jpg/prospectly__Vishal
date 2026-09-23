import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { ImportModalActionCard } from "@/components/getting-started/import-modal/actionCard";
import { ImportModalBrandedButton } from "@/components/getting-started/import-modal/brandedButton";
import { ImportModalHero } from "@/components/getting-started/import-modal/hero";
import { ImportModalPrimaryCta } from "@/components/getting-started/import-modal/primaryCta";
import { ImportModalTextButton } from "@/components/getting-started/import-modal/textButton";
import { ImportModalTip } from "@/components/getting-started/import-modal/tip";
import { GettingStartedIconBadge } from "@/assets/getting-started/getting-started-icon-badge";

const LINKEDIN_DATA_URL =
  "https://www.linkedin.com/mypreferences/d/download-my-data";

function LinkedInGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={28} height={28} aria-hidden>
      <path
        fill="#fff"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  );
}

interface LinkedInImportExportStepProps {
  onRequestedData: () => void;
  onAlreadyHaveZip: () => void;
}

export function LinkedInImportExportStep({
  onRequestedData,
  onAlreadyHaveZip,
}: LinkedInImportExportStepProps) {
  return (
    <>
      <ImportModalDots activeIndex={0} total={4} />
      <ImportModalHero
        variant="linkedin"
        icon={<LinkedInGlyph />}
        title="Let's export your LinkedIn connections"
        description={
          <>
            We&apos;ll walk you through it — just click the button below to
            open LinkedIn&apos;s data page.
          </>
        }
        badge="~ 2 minutes total"
      />
      <ImportModalActionCard
        visual={<GettingStartedIconBadge name="link" size="hero" />}
        label="Your only action"
        title="Open LinkedIn Data Export"
        description={
          <>
            We&apos;ll open LinkedIn&apos;s privacy page. Look for{" "}
            <strong>&quot;Get a copy of your data&quot;</strong> and select{" "}
            <strong>&quot;Connections&quot;</strong> only.
          </>
        }
      >
        <ImportModalBrandedButton
          type="button"
          onClick={() => window.open(LINKEDIN_DATA_URL, "_blank")}
        >
          Open LinkedIn Settings 
        </ImportModalBrandedButton>
      </ImportModalActionCard>
      <ImportModalTip icon={<GettingStartedIconBadge name="bulb" size="sm" />}>
        <strong>Tip:</strong> Select only &quot;Connections&quot; — it downloads
        faster than the full archive.
      </ImportModalTip>
      <ImportModalPrimaryCta type="button" onClick={onRequestedData}>
        Done — I Requested My Data →
      </ImportModalPrimaryCta>
      <ImportModalTextButton type="button" onClick={onAlreadyHaveZip}>
        I already have the ZIP file
      </ImportModalTextButton>
    </>
  );
}
