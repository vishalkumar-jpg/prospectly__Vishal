import { Button } from "@/components/ui/button";
import { CheckCircle, Mail } from "lucide-react";
// import { MessageCircle } from "lucide-react";
import { StaticPageHero } from "@/components/static/StaticPageHero";
import { StaticTrustPill } from "@/components/static/StaticTrustPill";
import { cn } from "@/lib/utils";

interface ContactHeroProps {
  supportEmail: string;
  // Live chat is disabled — email is the only support path for now.
  // onStartChat: () => void;
}

export function ContactHero({ supportEmail }: ContactHeroProps) {
  return (
    <StaticPageHero
      titleId="contact-page-title"
      eyebrow={
        <>
          <span
            className="h-1.5 w-1.5 rounded-full bg-home-trust-green animate-home-blink"
            aria-hidden
          />
          Team online · &lt; 2 min response
        </>
      }
      eyebrowDotTone="trust-green"
      titleLine1={<>Need help?</>}
      titleLine2={<>Let&apos;s chat.</>}
      description={
        <>
          Get answers from our expert support team. Reach us by email and
          we&apos;ll get back to you{" "}
          <span className="font-semibold text-home-fg">
            as soon as possible
          </span>
          .
        </>
      }
      actions={[
        // <Button
        //   key="chat"
        //   size="lg"
        //   onClick={onStartChat}
        //   className={cn(
        //     "home-brand-gradient border-0 text-white shadow-home-cta",
        //     "hover:-translate-y-0.5 hover:brightness-[1.03] hover:shadow-home-cta-lg",
        //     "transition-transform",
        //   )}
        // >
        //   <MessageCircle className="mr-2 h-5 w-5" aria-hidden />
        //   Start live chat now
        // </Button>,
        <Button
          key="email"
          asChild
          size="lg"
          className={cn(
            "home-brand-gradient border-0 text-white shadow-home-cta",
            "hover:-translate-y-0.5 hover:brightness-[1.03] hover:shadow-home-cta-lg",
            "transition-transform"
          )}
        >
          <a href={`mailto:${supportEmail}`}>
            <Mail className="mr-2 h-5 w-5" aria-hidden />
            Email us
          </a>
        </Button>,
      ]}
      pills={[
        <StaticTrustPill key="24" tone="amethyst" icon={CheckCircle}>
          Available 24 / 7
        </StaticTrustPill>,
        <StaticTrustPill key="exp" tone="trust-green" icon={CheckCircle}>
          Expert team
        </StaticTrustPill>,
        <StaticTrustPill key="nowait" tone="sky" icon={CheckCircle}>
          No waiting
        </StaticTrustPill>,
      ]}
    />
  );
}
