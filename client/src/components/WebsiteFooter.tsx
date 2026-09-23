import { Link } from "react-router-dom";
import { toUTC } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { FooterBgSvg } from "@/components/home/FooterBgSvg";

const WebsiteFooter = () => {
  const currentYear = toUTC().getFullYear();

  const quickLinks = [
    { title: "Our Story", href: "/our-story" },
    { title: "How It Works", href: "/how-it-works" },
    { title: "Community Pledge", href: "/community-pledge" },
    { title: "Contact", href: "/contact" },
  ];

  const legalLinks = [
    { title: "Privacy Policy", href: "/privacy" },
    { title: "Terms of Service", href: "/terms" },
  ];

  const companyValues = [
    { title: "Security", href: "/security" },
    { title: "Confidentiality", href: "/confidentiality" },
    { title: "Transparency", href: "/transparency" },
  ];

  const bottomBadges = [
    "SOC 2 Type II",
    "256-Bit Encryption",
    "GDPR & CCPA",
    "Zero Spam",
  ];

  const linkClass =
    "block text-xs text-home-muted transition-colors hover:text-home-fg";

  return (
    <footer
      className={cn(
        "relative overflow-hidden bg-home-footer px-6 pb-6 pt-12 max-[900px]:px-5",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[1] before:h-px",
        "before:bg-[linear-gradient(90deg,transparent,hsl(var(--home-amethyst)/0.2),hsl(var(--home-rose)/0.15),transparent)]"
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <FooterBgSvg />
      </div>
      <div className="relative z-[1] mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 gap-7 max-[900px]:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)] max-[600px]:grid-cols-1">
          <div className="space-y-3">
            <img
              src="/prospectly-logo.png"
              alt="Prospectly"
              className="mb-2 h-6"
            />
            <p className="max-w-[220px] text-xs leading-relaxed text-home-muted">
              The future of professional networking and referrals. Built with
              trust, powered by warm introductions.
            </p>
            <p className="text-xs leading-relaxed text-home-muted">
              © {currentYear} Prospectly LLC. All Rights Reserved. • Patent
              Pending US Application • Prospectly™ and the Prospectly logo are
              registered trademarks • Protected by intellectual property laws •
              Proprietary AI-powered networking platform
            </p>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-bold text-home-fg">Quick Links</h4>
            <div className="space-y-1">
              {quickLinks.map((link) => (
                <Link
                  key={link.title}
                  to={link.href}
                  onClick={() => window.scrollTo(0, 0)}
                  className={linkClass}
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-bold text-home-fg">Governance</h4>
            <div className="space-y-1">
              {companyValues.map((link) => (
                <Link
                  key={link.title}
                  to={link.href}
                  onClick={() => window.scrollTo(0, 0)}
                  className={linkClass}
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-bold text-home-fg">Legal</h4>
            <div className="space-y-1">
              {legalLinks.map((link) => (
                <Link
                  key={link.title}
                  to={link.href}
                  onClick={() => window.scrollTo(0, 0)}
                  className={linkClass}
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-home-border pt-4 text-[11px] text-home-muted max-[900px]:gap-3 md:flex-row md:flex-wrap md:items-center md:justify-end">
          <div className="flex flex-wrap gap-2">
            {bottomBadges.map((label) => (
              <span
                key={label}
                className="rounded-md border border-home-border bg-home-bg px-2 py-0.5 text-[10px] font-semibold text-home-muted"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default WebsiteFooter;
