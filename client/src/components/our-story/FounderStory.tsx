import {
  Award,
  DollarSign,
  Globe,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";

const STATS = [
  {
    value: "25+",
    label: "Years Building & Scaling Businesses",
    icon: TrendingUp,
    tone: "text-home-trust-green",
    bg: "bg-home-trust-green/10",
  },
  {
    value: "4+",
    label: "Countries of Global Operations",
    icon: Globe,
    tone: "text-home-sky",
    bg: "bg-home-sky/10",
  },
  {
    value: "1000+",
    label: "Employees Managed Globally",
    icon: Users,
    tone: "text-home-amethyst",
    bg: "bg-home-amethyst/10",
  },
  {
    value: "$M+",
    label: "Multi-Million Revenue Enterprise",
    icon: DollarSign,
    tone: "text-home-trust-green",
    bg: "bg-home-trust-green/10",
  },
];

export function OurStoryFounderStory() {
  return (
    <StaticSection ariaLabelledBy="our-story-founder-title">
      <StaticSectionHeading
        id="our-story-founder-title"
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3 w-3" aria-hidden />
            Founder Story
          </span>
        }
        title="Meet Pranav Dalal"
        description="From helping thousands of businesses scale globally to revolutionizing how companies connect and grow."
      />

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14">
        {/* LEFT SIDE */}
        <div className="space-y-6 text-[15px] leading-relaxed text-home-muted">
          <div className="space-y-5">
            <h3 className="text-xl font-extrabold tracking-tight text-home-fg">
              Global Business Leader & Builder
            </h3>

            <p>
              Pranav Dalal is the Founder and CEO of Prospectly and Office
              Beacon, a global business process outsourcing company with over 25
              years of operating history and thousands of employees across
              India, the Philippines, South Africa, and Mexico.
            </p>

            <p>
              With a career spanning more than two decades, Pranav has built,
              scaled, and operated global organizations serving mid-market and
              enterprise clients across industries including financial services,
              insurance, eCommerce, and technology.
            </p>

            <p>
              He is an alum of the University of Toronto (BA Economics),
              Schulich School of Business (MBA), and Harvard Business School’s
              Owner President Management Program.
            </p>

            <p>
              Pranav’s expertise lies in global scaling, operational execution,
              revenue growth, and building high-performance teams across
              geographies. Under his leadership, Office Beacon has grown into a
              multi-million-dollar enterprise serving clients worldwide.
            </p>
          </div>

          {/* DIVIDER */}
          <div className="border-t border-home-border pt-8">
            <h3 className="text-xl font-extrabold tracking-tight text-home-fg">
              Operator First. Not a Consultant.
            </h3>

            <div className="mt-5 space-y-5">
              <p>
                Unlike traditional consultants, Pranav is a hands-on operator
                who has spent decades building real businesses, not advising
                from the sidelines.
              </p>

              <p>
                He has led global delivery teams, built sales engines,
                structured international entities, and driven long-term client
                partnerships at scale. His work focuses on execution,
                accountability, and measurable outcomes—not theory.
              </p>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="flex h-full flex-col rounded-2xl border border-home-border bg-home-bg-elevated p-4"
              >
                <span
                  className={`mb-3 grid h-9 w-9 place-items-center rounded-full ${s.bg}`}
                  aria-hidden
                >
                  <s.icon className={`h-4 w-4 ${s.tone}`} />
                </span>

                <div
                  className={`text-2xl font-extrabold leading-tight ${s.tone}`}
                >
                  {s.value}
                </div>

                <div className="mt-1 text-xs leading-snug text-home-muted">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-8">
          {/* QUOTE CARD */}
          <figure className="relative rounded-[24px] border border-home-amethyst/20 bg-home-bg-elevated p-6 sm:p-7">
            <span
              className="absolute -top-4 left-6 grid h-10 w-10 place-items-center rounded-full bg-home-bg text-home-amethyst shadow-home-bridge"
              aria-hidden
            >
              <Award className="h-5 w-5" />
            </span>

            <blockquote className="mt-5 text-[15px] leading-relaxed text-home-muted">
              “Relationships are the foundation of every meaningful business
              opportunity. Prospectly was built to transform trust into scalable
              infrastructure.”
            </blockquote>

            <figcaption className="mt-4 text-sm font-semibold text-home-amethyst">
              — Pranav Dalal, Founder & CEO
            </figcaption>
          </figure>

          {/* TRUST SECTION */}
          <div className="rounded-[24px] border border-home-border bg-home-bg-elevated p-6 sm:p-7">
            <h3 className="text-xl font-extrabold tracking-tight text-home-fg">
              The Missing Link: Trust at Scale
            </h3>

            <div className="mt-6 space-y-5">
              <blockquote className="text-[15px] leading-relaxed text-home-muted">
                “Over decades of building businesses, one thing became clear:
                the companies that grow fastest are not the ones with the best
                products — they are the ones with the strongest, most trusted
                networks.”
              </blockquote>

              <blockquote className="text-[15px] leading-relaxed text-home-muted">
                “Warm introductions consistently outperform cold outreach. The
                problem was never effectiveness — it was scalability.”
              </blockquote>
            </div>
          </div>

          {/* BIRTH OF PROSPECTLY */}
          <div className="space-y-4 text-[15px] leading-relaxed text-home-muted">
            <h4 className="text-xl font-extrabold tracking-tight text-home-fg">
              The Birth of Prospectly
            </h4>

            <p>
              Prospectly was built to solve a fundamental problem: how to
              systematically scale trust.
            </p>

            <p>
              Drawing from real-world experience in sales, recruiting, and
              partnerships, Pranav recognized that referrals and introductions
              drive significantly higher conversion rates—but remain fragmented,
              manual, and impossible to scale globally.
            </p>

            <p>
              Prospectly transforms this into a structured, AI-powered platform
              where:
            </p>

            <ul className="list-disc space-y-2 pl-5">
              <li>Trusted introductions are systemized</li>
              <li>Incentives are aligned through referral economics</li>
              <li>Networks become scalable growth engines</li>
            </ul>

            <p>
              The result is a new category of growth infrastructure — where
              relationships, not cold outreach, drive opportunity.
            </p>
          </div>
        </div>
      </div>
    </StaticSection>
  );
}
