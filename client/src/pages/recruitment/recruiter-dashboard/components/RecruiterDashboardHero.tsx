import { useNavigate } from "react-router-dom";
import { Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { POST_A_JOB_PATH } from "@/constants/recruitment-routes";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";

type RecruiterDashboardHeroProps = {
  userName: string;
};

export function RecruiterDashboardHero({
  userName,
}: RecruiterDashboardHeroProps) {
  const navigate = useNavigate();
  const displayName = userName.trim() || "there";

  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {displayName}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s your hiring overview. Keep up the great work!
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-[10px] border-border bg-card px-4 font-semibold"
          onClick={() => navigate(`${TAB_ROUTE_BASES.myJobPosts}/active`)}
        >
          <UserRound className="mr-2 h-4 w-4" />
          Review Candidates
        </Button>
        <Button
          size="sm"
          className="h-9 rounded-[10px] bg-brand-gradient px-4 font-semibold text-brand-foreground shadow-brand-cta hover:shadow-brand-cta-lg"
          onClick={() => navigate(POST_A_JOB_PATH)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Post New Job
        </Button>
      </div>
    </section>
  );
}
