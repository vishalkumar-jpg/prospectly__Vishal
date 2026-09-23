import { useEffect, useRef, useState } from "react";
import { Shield } from "lucide-react";
import SEO from "@/components/SEO";
import { buildPublicRequestSeoMeta, OG_PROSPECTING_IMAGE } from "@/lib/og-meta";
import type { PublicDealData } from "./types";
import { PublicDealHero } from "./PublicDealHero";
import { PublicDealDetail, PublicDealEarnings } from "./PublicDealCard";
import { PublicDealTimeline } from "./PublicDealTimeline";
import { PublicDealFAQ } from "./PublicDealFAQ";
import { PublicDealFooter } from "./PublicDealFooter";
import { DealAlreadyClaimedModal } from "./DealAlreadyClaimedModal";
import { PublicRequestHeader } from "./PublicRequestHeader";
import { PublicRequestStats } from "./PublicRequestStats";
import { PublicRequestMobileClaimBar } from "./PublicRequestMobileClaimBar";

type PublicRequestViewProps = {
  request: PublicDealData;
  requestId: string;
  sharerCode: string;
  claiming: boolean;
  showClaimedModal: boolean;
  onClaimedModalChange: (open: boolean) => void;
  onClaim: () => void;
};

export function PublicRequestView({
  request,
  requestId,
  sharerCode,
  claiming,
  showClaimedModal,
  onClaimedModalChange,
  onClaim,
}: PublicRequestViewProps) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [timelineVisible, setTimelineVisible] = useState(false);
  const timelineRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target === timelineRef.current) {
            setTimelineVisible(true);
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" }
    );
    const timeoutId = setTimeout(() => {
      if (timelineRef.current) observer.observe(timelineRef.current);
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  const requestSeo = buildPublicRequestSeoMeta({
    meetingTitle: request.meetingAgenda.title,
    meetingDescription: request.meetingAgenda.description,
    contactName: request.prospect.name,
    prospectName: request.prospect.name,
  });

  return (
    <>
      <SEO
        title={requestSeo.title}
        description={requestSeo.description}
        canonical={`/request/${requestId}/${sharerCode}`}
        ogImage={OG_PROSPECTING_IMAGE}
      />
      <div className="min-h-screen bg-secondary pb-20 text-foreground md:pb-0">
        <PublicRequestHeader claiming={claiming} onClaim={onClaim} />

        <main className="container mx-auto max-w-[1180px] px-4 pb-20 pt-6 sm:px-7">
          <PublicDealHero deal={request} />

          <PublicRequestStats request={request} />

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
              <PublicDealDetail deal={request} />
            </div>

            <aside className="order-2 flex flex-col gap-4 lg:col-start-2 lg:row-start-1 lg:row-span-2">
              <PublicDealEarnings
                deal={request}
                claiming={claiming}
                onClaim={onClaim}
              />

              <PublicDealTimeline
                ref={timelineRef}
                isVisible={timelineVisible}
              />

              <div className="flex items-start gap-3 rounded-2xl border border-brand-sky/15 bg-brand-sky/5 p-4">
                <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg border border-brand-sky/15 bg-card text-brand-sky">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <div className="text-[12.5px] leading-relaxed">
                  <b className="mb-0.5 block text-[13px] font-extrabold">
                    Your Privacy Matters
                  </b>
                  <span className="text-muted-foreground">
                    Your contacts stay private — we only verify a connection
                    exists, never share your data with anyone.
                  </span>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Powered by{" "}
                <span className="font-semibold text-brand-amethyst">
                  Prospectly
                </span>
              </div>
            </aside>

            <div className="order-3 min-w-0 lg:col-start-1 lg:row-start-2">
              <PublicDealFAQ
                expandedFaq={expandedFaq}
                setExpandedFaq={setExpandedFaq}
              />
            </div>
          </div>
        </main>

        <PublicRequestMobileClaimBar
          claimerShare={request.claimerShare}
          claiming={claiming}
          onClaim={onClaim}
        />

        <PublicDealFooter />

        <DealAlreadyClaimedModal
          open={showClaimedModal}
          onOpenChange={onClaimedModalChange}
        />
      </div>
    </>
  );
}
