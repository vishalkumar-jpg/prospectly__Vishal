interface CardBountySectionProps {
  bountyAmount: number;
}

export function CardBountySection({ bountyAmount }: CardBountySectionProps) {
  return (
    <div className="mx-4 mb-4 mt-auto rounded-xl border border-brand-amethyst/15 bg-brand-amethyst/5 px-4 py-3 sm:mx-5 lg:mx-6">
      <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
        Referral Payout
      </p>
      <p className="text-xl font-extrabold leading-none text-brand-amethyst">
        ${bountyAmount.toLocaleString()}
      </p>
    </div>
  );
}
