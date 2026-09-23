import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Shown when an authenticated user navigates to a module their organisation
 * has not been granted access to (e.g. Recruitment). Kept friendly and
 * actionable per the UX design system.
 */
export default function ModuleAccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-brand-gradient">
          Access Restricted
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          Your organization does not currently have access to the Recruitment
          module. This feature requires organization permissions. If you believe
          this is an error, please contact your organization&apos;s
          administrator.
        </p>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button variant="brand" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/prospecting/find-prospects")}
          >
            Go to Prospecting
          </Button>
        </div>
      </div>
    </div>
  );
}
