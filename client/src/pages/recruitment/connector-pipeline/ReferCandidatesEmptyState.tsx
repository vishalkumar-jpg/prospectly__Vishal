import { useNavigate } from "react-router-dom";
import { Briefcase, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ReferCandidatesEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  showMarketplaceCta?: boolean;
};

export function ReferCandidatesEmptyState({
  icon: Icon,
  title,
  description,
  showMarketplaceCta = true,
}: ReferCandidatesEmptyStateProps) {
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-foreground">{title}</h3>
      <p className="mx-auto mb-6 max-w-md text-muted-foreground">{description}</p>
      {showMarketplaceCta ? (
        <Button
          className="bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
          onClick={() => navigate("/recruiting/job-marketplace")}
        >
          <Briefcase className="mr-2 h-4 w-4" />
          Browse Job Marketplace
        </Button>
      ) : null}
    </Card>
  );
}
