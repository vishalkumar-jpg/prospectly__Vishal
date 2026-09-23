import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Users, Sparkles } from "lucide-react";

interface PostWelcomePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originJobId: string;
  originJobTitle?: string;
}

// Shown once after the existing welcome popup closes for users who signed
// up via "I Have a Candidate" on a public job page (i.e. a marketplace-split
// origin row exists for them and the origin job is still active).
//
// Two CTAs:
//   - Primary:  Upload Resume for this Job  → marketplace upload modal
//   - Secondary: Upload Contacts            → getting-started page
//
// Navigation is handled here directly — there is no returnTo redirect from
// the signin flow, so this popup is the single point where the user is
// nudged toward the high-intent next step.
export function PostWelcomePopup({
  open,
  onOpenChange,
  originJobId,
  originJobTitle,
}: PostWelcomePopupProps) {
  const navigate = useNavigate();

  const handleUploadResume = () => {
    onOpenChange(false);
    // Existing URL contract on /recruiting/job-marketplace auto-opens the
    // ConnectorResumeUploadModal pre-targeted to this job — see
    // .planning/features/recruitment-connector-resume-upload.md
    navigate(
      `/recruiting/job-marketplace?job=${encodeURIComponent(originJobId)}&action=upload`
    );
  };

  const handleUploadContacts = () => {
    onOpenChange(false);
    navigate("/recruiting/getting-started");
  };

  const handleDismiss = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center mb-2">
            <Sparkles className="h-6 w-6 text-teal-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            Ready to bring in your first candidate?
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {originJobTitle ? (
              <>
                You came here for{" "}
                <span className="font-semibold text-foreground">
                  {originJobTitle}
                </span>
                . Pick how you'd like to get started — both paths can earn you
                a referral payout.
              </>
            ) : (
              <>
                Pick how you'd like to get started — both paths can earn you a
                referral payout.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            onClick={handleUploadResume}
            className="w-full bg-teal-600 hover:bg-teal-700 gap-2"
          >
            <Upload className="h-5 w-5" />
            Upload Resume for this Job
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handleUploadContacts}
            className="w-full gap-2"
          >
            <Users className="h-5 w-5" />
            Upload Contacts
          </Button>
        </div>

        <DialogFooter className="sm:justify-center pt-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
