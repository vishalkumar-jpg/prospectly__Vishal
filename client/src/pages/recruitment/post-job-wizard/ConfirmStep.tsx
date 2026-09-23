import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Clock, Coins, Wallet, Zap } from "lucide-react";
import { useFlatReferralFee } from "@/hooks/useFlatReferralFee";
import type { JobFormData } from "./types";
import LivePreviewPanel from "./LivePreviewPanel";
import {
  formatMoneyOrDash,
  formatMoneyWithCommas,
} from "@/lib/formatted-decimal";

interface ConfirmStepProps {
  formData: JobFormData;
}

function FlatReferralConfirmSummary({ formData }: { formData: JobFormData }) {
  const { stripeFee, applicationFee, total } = useFlatReferralFee({
    flatAmount: formData.flatReferralAmount,
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-3.5 flex items-center gap-3">
        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-warning/10 text-brand-warning">
          <Coins className="h-[18px] w-[18px]" />
        </div>
        <h2 className="text-lg font-extrabold tracking-tight">
          Flat Referral Fee
        </h2>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Flat Referral Fee</span>
          <span className="font-medium text-foreground">
            ${formatMoneyWithCommas(formData.flatReferralAmount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Stripe Processing Fee</span>
          <span className="font-medium text-foreground">
            {formatMoneyOrDash(
              stripeFee !== null && applicationFee !== null
                ? stripeFee + applicationFee
                : null
            )}
          </span>
        </div>
        <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-bold">
          <span className="text-foreground">Charged when you hire</span>
          <span className="text-brand-warning">{formatMoneyOrDash(total)}</span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Nothing is charged to post this job or to shortlist candidates. The full
        flat referral fee is charged only when you move a candidate to Hired.
      </p>
    </section>
  );
}

function ConnectorPayoutSummary({ formData }: { formData: JobFormData }) {
  const empWaits = formData.intPayoutWaits;
  const outWaits = formData.extPayoutWaits;
  const waitLabelFor = (days: number) =>
    days > 0 ? `${days} days after hire` : "after the waiting period";

  const row = (title: string, waits: boolean, waitLabel: string) => (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{title}</span>
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        {waits ? (
          <>
            <Clock className="h-3.5 w-3.5" /> Payable {waitLabel}
          </>
        ) : (
          <>
            <Zap className="h-3.5 w-3.5" /> Payable on hire
          </>
        )}
      </span>
    </div>
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-3.5 flex items-center gap-3">
        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
          <Wallet className="h-[18px] w-[18px]" />
        </div>
        <h2 className="text-lg font-extrabold tracking-tight">
          Connector Payout Timing
        </h2>
      </div>
      <div className="space-y-2 text-sm">
        {row(
          "Your Employees",
          empWaits,
          waitLabelFor(formData.intConnectorPayoutWaitDays)
        )}
        {row(
          "Outside Connectors",
          outWaits,
          waitLabelFor(formData.extConnectorPayoutWaitDays)
        )}
      </div>
    </section>
  );
}

export default function ConfirmStep({ formData }: ConfirmStepProps) {
  return (
    <div className="space-y-6">
      <div className="mb-4 text-left sm:mb-6 lg:mb-8">
        <h2 className="text-2xl font-extrabold text-foreground">
          Review &amp; Confirm
        </h2>
        <p className="mt-2 text-muted-foreground">
          Review your job posting before publishing
        </p>
      </div>

      {/* Candidate-facing preview (same as the public job page) */}
      <LivePreviewPanel formData={formData} />

      {/* Flat Referral breakdown — recruiter-only */}
      <FlatReferralConfirmSummary formData={formData} />

      {/* Connector payout timing — recruiter-only summary */}
      <ConnectorPayoutSummary formData={formData} />

      {/* Assessment questions — recruiter-only summary */}
      {formData.hasAssessment && formData.assessmentQuestions.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3.5 flex items-center gap-3">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
              <ClipboardList className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-lg font-extrabold tracking-tight">
              Assessment Questions
            </h2>
          </div>
          <ol className="space-y-2.5">
            {formData.assessmentQuestions.map((q, index) => (
              <li key={q.clientId} className="flex items-start gap-2.5 text-sm">
                <span className="text-xs font-semibold text-muted-foreground">
                  Q{index + 1}
                </span>
                <span className="min-w-0 flex-1 text-foreground">
                  {q.questionText.trim() || (
                    <span className="italic text-muted-foreground">
                      (empty question)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Candidates answer these with Yes or No while applying.
          </p>
        </section>
      )}

      {/* What happens next */}
      <Card className="rounded-2xl border border-border bg-card shadow-brand-card">
        <CardHeader>
          <CardTitle className="text-lg">What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-amethyst/10 text-xs font-bold text-brand-amethyst">
              1
            </div>
            <div>
              <p className="font-medium">Candidate Matching Begins</p>
              <p className="text-sm text-muted-foreground">
                Our system searches existing contacts to find matching
                candidates for connectors
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-amethyst/10 text-xs font-bold text-brand-amethyst">
              2
            </div>
            <div>
              <p className="font-medium">Connectors Get Notified</p>
              <p className="text-sm text-muted-foreground">
                Connectors will see matched candidates and can send consent
                requests
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-amethyst/10 text-xs font-bold text-brand-amethyst">
              3
            </div>
            <div>
              <p className="font-medium">Job Goes Live on Marketplace</p>
              <p className="text-sm text-muted-foreground">
                Your job will be visible for connectors to share and refer
                candidates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
