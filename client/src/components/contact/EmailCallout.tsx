import { Clock, Mail } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";

interface EmailCalloutProps {
  supportEmail: string;
  typicalResponse?: string;
}

export function ContactEmailCallout({
  supportEmail,
  typicalResponse = "Typical response time: 4 hours",
}: EmailCalloutProps) {
  return (
    <StaticSection elevated verticalPadding="narrow">
      <div className="mx-auto max-w-2xl rounded-[24px] border border-home-border bg-home-bg p-7 text-center sm:p-9">
        <span
          className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-home-amethyst/10 text-home-amethyst"
          aria-hidden
        >
          <Mail className="h-6 w-6" />
        </span>
        <h3 className="mb-2 text-xl font-extrabold tracking-tight text-home-fg">
          Prefer email?
        </h3>
        <p className="mb-4 text-sm text-home-muted">
          Reach us via email at{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-semibold text-home-amethyst underline-offset-2 hover:underline"
          >
            {supportEmail}
          </a>
        </p>
        <div className="inline-flex items-center justify-center gap-2 text-xs text-home-muted">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          <span>{typicalResponse}</span>
        </div>
      </div>
    </StaticSection>
  );
}
