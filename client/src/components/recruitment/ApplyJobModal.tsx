import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSuppressProfileGate } from "@/contexts/profile-gate-suppression";
import { useApplyToJob } from "@/hooks/useApplyToJob";
import { useCheckApplication } from "@/hooks/useCheckApplication";
import { usePublicJob } from "@/hooks/usePublicJob";
import { useS3Upload } from "@/hooks/useS3Upload";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getApplyJobLinkedinFieldError } from "@/schemas/recruitment-apply-job";
import {
  areRequiredAnswersComplete,
  toAssessmentResponsesPayload,
  type AssessmentAnswerState,
} from "@/schemas/recruitment-assessment-answer";
import { ApplySubmissionErrorAlert } from "./ApplySubmissionErrorAlert";
import { LinkedInField } from "./LinkedInField";
import { ResumeUploadField } from "./ResumeUploadField";
import { AssessmentAnswerStep } from "./assessment-answer/AssessmentAnswerStep";
import { AssessmentReviewSummary } from "./assessment-answer/AssessmentReviewSummary";
import { PayoutCountryField } from "./PayoutCountryField";
import { PAYOUT_COUNTRIES } from "@/lib/stripe-connect";

const PAYOUT_COUNTRY_VALUES = new Set(
  PAYOUT_COUNTRIES.map((c) => c.value as string)
);

function getCountryFieldError(country: string): string | null {
  const trimmed = country.trim();
  if (!trimmed) return "Country is required";
  if (!PAYOUT_COUNTRY_VALUES.has(trimmed)) {
    return "Please select a valid country";
  }
  return null;
}

interface ApplyJobModalProps {
  jobId: string;
  sharerCode: string;
  isOpen: boolean;
  onClose: () => void;
}

type StepId = "resume" | "assessment" | "review";

export function ApplyJobModal({
  jobId,
  sharerCode,
  isOpen,
  onClose,
}: ApplyJobModalProps) {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // This modal collects the country itself, so the completion gate must not
  // ask for it at the same time.
  useSuppressProfileGate();

  const { job, loading: jobLoading } = usePublicJob(jobId);
  const applyMutation = useApplyToJob();
  const { upload, isUploading: s3Uploading } = useS3Upload({
    folder: "resumes",
  });

  const { data: applicationCheck } = useCheckApplication(jobId, isOpen);

  const userHasLinkedIn = !!user?.linkedinUrl;
  const userHasCountry = !!user?.country?.trim();
  const contactSuggestedLinkedin =
    applicationCheck?.suggestedLinkedinUrl?.trim() || "";
  const isPending = applyMutation.isPending || s3Uploading;

  const assessmentQuestions = useMemo(
    () => job?.assessmentQuestions ?? [],
    [job?.assessmentQuestions]
  );
  const hasAssessment = assessmentQuestions.length > 0;

  const steps = useMemo<StepId[]>(
    () =>
      hasAssessment ? ["resume", "assessment", "review"] : ["resume", "review"],
    [hasAssessment]
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [country, setCountry] = useState("");
  const [countryError, setCountryError] = useState<string | undefined>(
    undefined
  );
  const [resumeFile, setResumeFile] = useState<File | undefined>(undefined);
  const [answers, setAnswers] = useState<AssessmentAnswerState>({});
  const [linkedinError, setLinkedinError] = useState<string | undefined>(
    undefined
  );
  const [resumeError, setResumeError] = useState<string | undefined>(undefined);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  // Pull latest profile LinkedIn (may have been filled async after a prior
  // resume extract) before painting the field.
  useEffect(() => {
    if (!isOpen) return;
    void refreshUser();
    // refreshUser is not stable in AuthContext; only re-run when modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [isOpen]);

  // Reset on open only: refreshUser() above resolves user.country a tick later,
  // so depending on it here would wipe resume/answers mid-flow. Country prefill
  // lives in its own effect below.
  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(0);
    setLinkedinUrl("");
    setCountry("");
    setCountryError(undefined);
    setResumeFile(undefined);
    setAnswers({});
    setLinkedinError(undefined);
    setResumeError(undefined);
    setSubmitError(undefined);
  }, [isOpen]);

  // Prefill: profile first (read-only UI), else contact suggestion into input.
  useEffect(() => {
    if (!isOpen) return;
    if (userHasLinkedIn) {
      setLinkedinUrl(user?.linkedinUrl?.trim() ?? "");
      return;
    }
    if (!contactSuggestedLinkedin) return;
    setLinkedinUrl((prev) => (prev.trim() ? prev : contactSuggestedLinkedin));
  }, [isOpen, userHasLinkedIn, user?.linkedinUrl, contactSuggestedLinkedin]);

  useEffect(() => {
    if (!isOpen || !user?.country) return;
    setCountry((prev) => (prev.trim() ? prev : user.country!.trim()));
  }, [isOpen, user?.country]);

  // usePublicJob can refetch while the modal is open, flipping the assessment
  // step in/out and changing steps.length. Clamp so stepIndex never points past
  // the last step (which would desync the body from isLastStep).
  useEffect(() => {
    setStepIndex((i) => Math.min(i, steps.length - 1));
  }, [steps.length]);

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const validateLinkedin = (value: string): string | undefined => {
    if (userHasLinkedIn || !value.trim()) return undefined;
    return getApplyJobLinkedinFieldError(value) ?? undefined;
  };

  const handleLinkedinChange = (value: string) => {
    setLinkedinUrl(value);
    setLinkedinError(validateLinkedin(value));
  };

  const handleLinkedinBlur = () => {
    setLinkedinError(validateLinkedin(linkedinUrl));
  };

  const handleResumeChange = (file: File | undefined) => {
    setResumeFile(file);
    setResumeError(undefined);
  };

  const resumeStepValid =
    !validateLinkedin(linkedinUrl) &&
    !!resumeFile &&
    (userHasCountry || !getCountryFieldError(country));
  const assessmentStepValid = areRequiredAnswersComplete(
    assessmentQuestions,
    answers
  );

  const canAdvance =
    currentStep === "resume"
      ? resumeStepValid
      : currentStep === "assessment"
        ? assessmentStepValid
        : true;

  const handleNext = () => {
    if (currentStep === "resume") {
      const linkedinErr = validateLinkedin(linkedinUrl);
      const resumeErr = resumeFile ? undefined : "Resume is required";
      const countryErr = userHasCountry
        ? undefined
        : (getCountryFieldError(country) ?? undefined);
      setLinkedinError(linkedinErr);
      setResumeError(resumeErr);
      setCountryError(countryErr);
      if (linkedinErr || resumeErr || countryErr) return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const handleBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleSubmit = async () => {
    setSubmitError(undefined);
    if (!(resumeFile instanceof File)) {
      setResumeError("Resume is required");
      return;
    }
    const resolvedCountry = (user?.country || country).trim();
    if (!userHasCountry) {
      const countryErr = getCountryFieldError(resolvedCountry);
      if (countryErr) {
        setCountryError(countryErr);
        setStepIndex(0);
        return;
      }
    }
    if (hasAssessment && !assessmentStepValid) return;

    try {
      const uploadResult = await upload(resumeFile);
      if (!uploadResult) {
        toast({
          title: "Upload failed",
          description: "Resume upload failed, please try again.",
          variant: "destructive",
        });
        return;
      }

      const resumeData = {
        fileName: uploadResult.fileName,
        filePath: uploadResult.filePath,
        mimeType: uploadResult.mimeType,
        fileType: uploadResult.fileType,
        size: uploadResult.size,
        module: "candidate_resume" as const,
      };

      const resolvedLinkedin = userHasLinkedIn
        ? user?.linkedinUrl?.trim()
        : linkedinUrl.trim();

      const assessmentResponses = hasAssessment
        ? toAssessmentResponsesPayload(assessmentQuestions, answers)
        : [];

      await applyMutation.mutateAsync({
        jobId,
        sharerCode,
        country: resolvedCountry,
        ...(resolvedLinkedin ? { linkedinUrl: resolvedLinkedin } : {}),
        resume: resumeData,
        ...(assessmentResponses.length > 0 ? { assessmentResponses } : {}),
      });

      toast({
        title: "Application submitted!",
        description: job
          ? `Your application for ${job.title} at ${job.companyName} has been received.`
          : "Your application has been received.",
      });
      onClose();
      navigate("/recruiting/my-applications");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast({
          title: "Already applied",
          description: "You've already applied to this job.",
          variant: "destructive",
        });
        onClose();
        navigate("/recruiting/my-applications");
        return;
      }
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Please try again.";
      setSubmitError(errorMessage);
      toast({
        title: "Application failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "w-full overflow-hidden box-border",
          currentStep === "resume" ? "max-w-lg" : "max-w-2xl"
        )}
        mobileFullscreen
      >
        <DialogHeader className="min-w-0 pr-6">
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-brand-amethyst flex-shrink-0" />
            Apply for Position
          </DialogTitle>
          <DialogDescription
            className="line-clamp-2 break-words leading-5"
            title={
              jobLoading ? "" : job ? `${job.title} at ${job.companyName}` : ""
            }
          >
            {jobLoading
              ? "Loading job details..."
              : job
                ? `${job.title} at ${job.companyName}`
                : "Submit your application"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 pr-2 space-y-4 max-h-[60vh] overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
          {steps.length > 1 && (
            <p className="text-xs font-medium text-muted-foreground">
              Step {stepIndex + 1} of {steps.length}
              {currentStep === "assessment" && " — Screening questions"}
              {currentStep === "review" && " — Review & submit"}
            </p>
          )}

          {submitError && <ApplySubmissionErrorAlert message={submitError} />}

          {currentStep === "resume" && (
            <>
              <LinkedInField
                value={linkedinUrl}
                onChange={handleLinkedinChange}
                onBlur={handleLinkedinBlur}
                error={linkedinError}
                userLinkedInUrl={user?.linkedinUrl}
              />
              <ResumeUploadField
                file={resumeFile}
                onChange={handleResumeChange}
                error={resumeError}
              />
              {!userHasCountry ? (
                <PayoutCountryField
                  value={country}
                  onChange={(value) => {
                    setCountry(value);
                    setCountryError(getCountryFieldError(value) ?? undefined);
                  }}
                  error={countryError}
                />
              ) : null}
            </>
          )}

          {currentStep === "assessment" && (
            <AssessmentAnswerStep
              questions={assessmentQuestions}
              answers={answers}
              onChange={setAnswers}
            />
          )}

          {currentStep === "review" && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Resume</p>
                <p className="text-muted-foreground break-words">
                  {resumeFile?.name ?? "—"}
                </p>
              </div>
              {!userHasCountry ? (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Country</p>
                  <p className="text-muted-foreground">
                    {PAYOUT_COUNTRIES.find((c) => c.value === country)?.label ||
                      country ||
                      "—"}
                  </p>
                </div>
              ) : null}
              {hasAssessment && (
                <AssessmentReviewSummary
                  questions={assessmentQuestions}
                  answers={answers}
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={stepIndex === 0 ? onClose : handleBack}
            disabled={isPending}
            className="flex-1 sm:flex-none"
          >
            {stepIndex === 0 ? "Cancel" : "Back"}
          </Button>
          {isLastStep ? (
            <Button
              type="button"
              variant="brand"
              onClick={handleSubmit}
              disabled={
                isPending ||
                !resumeFile ||
                (!userHasCountry && !!getCountryFieldError(country))
              }
              className="flex-1 sm:flex-initial"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {s3Uploading ? "Uploading Resume..." : "Submitting..."}
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="brand"
              onClick={handleNext}
              disabled={!canAdvance}
              className="flex-1 sm:flex-initial"
            >
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
