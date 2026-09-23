import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Linkedin,
  Upload,
  FileText,
  CheckCircle,
  Loader2,
  Briefcase,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSuppressProfileGate } from "@/contexts/profile-gate-suppression";
import { useVerifyConsent, useConsentApply } from "@/hooks/useConsent";
import { useS3Upload } from "@/hooks/useS3Upload";
import { ApiError } from "@/lib/api";
import { getApplyJobLinkedinFieldError } from "@/schemas/recruitment-apply-job";
import {
  areRequiredAnswersComplete,
  toAssessmentResponsesPayload,
  type AssessmentAnswerState,
} from "@/schemas/recruitment-assessment-answer";
import { ApplySubmissionErrorAlert } from "./ApplySubmissionErrorAlert";
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

interface ConsentApplyModalProps {
  consentToken: string;
  isOpen: boolean;
  onClose: () => void;
}

function shouldValidateConsentLinkedin(linkedinUrl: string): boolean {
  return !!linkedinUrl.trim();
}

function getConsentApplyErrorMessage({ error }: { error: unknown }): string {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

function getConsentJobDescription({
  consentLoading,
  jobTitle,
  companyName,
}: {
  consentLoading: boolean;
  jobTitle?: string;
  companyName?: string;
}) {
  if (consentLoading) return "Loading job details...";
  if (jobTitle && companyName) return `${jobTitle} at ${companyName}`;
  return "Submit your application";
}

function isConsentSubmitDisabled({ isPending }: { isPending: boolean }) {
  return isPending;
}

function ConsentApplyJobHeader({
  consentLoading,
  jobTitle,
  companyName,
}: {
  consentLoading: boolean;
  jobTitle?: string;
  companyName?: string;
}) {
  const description = getConsentJobDescription({
    consentLoading,
    jobTitle,
    companyName,
  });
  const titleAttr =
    !consentLoading && jobTitle && companyName
      ? `${jobTitle} at ${companyName}`
      : "";

  return (
    <DialogHeader className="min-w-0 pr-6">
      <DialogTitle className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-brand-amethyst flex-shrink-0" />
        Apply for Position
      </DialogTitle>
      <DialogDescription
        className="line-clamp-2 break-words leading-5"
        title={titleAttr}
      >
        {description}
      </DialogDescription>
    </DialogHeader>
  );
}

function ConsentAutoSubmitStatus({ error }: { error: string | null }) {
  if (error) {
    return <ApplySubmissionErrorAlert message={error} />;
  }

  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-brand-amethyst" />
      <span>Submitting your application...</span>
    </div>
  );
}

function toLinkedInHref(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function ConsentLinkedInOnFile({ linkedinUrl }: { linkedinUrl: string }) {
  const href = toLinkedInHref(linkedinUrl);
  return (
    <div className="rounded-lg border border-brand-amethyst/20 bg-gradient-to-br from-brand-amethyst/5 to-brand-rose/5 p-4 w-full overflow-hidden">
      <div className="flex items-center gap-3 w-full min-w-0">
        <div className="h-10 w-10 rounded-full bg-brand-amethyst/10 flex items-center justify-center flex-shrink-0">
          <Linkedin className="h-5 w-5 text-[#0A66C2]" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-medium text-brand-amethyst truncate">
            LinkedIn Profile
          </p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={href}
            className="text-xs text-[#0A66C2] underline underline-offset-2 hover:text-[#004182] break-all line-clamp-2"
          >
            {href}
          </a>
        </div>
        <CheckCircle className="h-5 w-5 text-brand-amethyst flex-shrink-0" />
      </div>
    </div>
  );
}

function ConsentLinkedInInput({
  linkedinUrl,
  linkedinError,
  onChange,
  onBlur,
  hint,
}: {
  linkedinUrl: string;
  linkedinError: string | null;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  hint?: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="linkedin-consent" className="flex items-center gap-2">
        <Linkedin className="h-4 w-4 text-[#0A66C2]" />
        LinkedIn Profile URL
        <span className="text-xs font-normal text-slate-500">(optional)</span>
      </Label>
      <Input
        id="linkedin-consent"
        placeholder="https://linkedin.com/in/yourprofile"
        value={linkedinUrl}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur(e.currentTarget.value)}
        className={cn(
          "h-11",
          linkedinError &&
            "border-destructive focus-visible:ring-1 focus-visible:ring-destructive focus-visible:ring-offset-0"
        )}
        aria-invalid={!!linkedinError}
      />
      {linkedinError ? (
        <p className="text-sm font-medium text-destructive">{linkedinError}</p>
      ) : (
        <p className="text-xs text-slate-500">
          {hint || "Optional — helps recruiters learn more about you."}
        </p>
      )}
    </div>
  );
}

function ConsentLinkedInSection({
  shouldAutoApply,
  userHasLinkedIn,
  userLinkedinUrl,
  linkedinUrl,
  linkedinError,
  submitError,
  suggestedHint,
  onLinkedinChange,
  onLinkedinBlur,
}: {
  shouldAutoApply: boolean;
  userHasLinkedIn: boolean;
  userLinkedinUrl: string;
  linkedinUrl: string;
  linkedinError: string | null;
  submitError: string | null;
  suggestedHint?: string | null;
  onLinkedinChange: (value: string) => void;
  onLinkedinBlur: (value: string) => void;
}) {
  if (shouldAutoApply && !userHasLinkedIn) {
    return <ConsentAutoSubmitStatus error={submitError} />;
  }
  if (userHasLinkedIn) {
    return <ConsentLinkedInOnFile linkedinUrl={userLinkedinUrl} />;
  }
  return (
    <ConsentLinkedInInput
      linkedinUrl={linkedinUrl}
      linkedinError={linkedinError}
      onChange={onLinkedinChange}
      onBlur={onLinkedinBlur}
      hint={suggestedHint}
    />
  );
}

function ConsentResumeDropzone({
  resumeFile,
  onFileSelect,
  required = false,
  error,
}: {
  resumeFile: File | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  error?: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-500" />
        Resume
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : (
          <span className="text-xs font-normal text-slate-500">(optional)</span>
        )}
      </Label>
      <div className="relative">
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={onFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
            resumeFile
              ? "border-brand-amethyst/30 bg-brand-amethyst/5"
              : error
                ? "border-destructive hover:border-destructive/90"
                : "border-slate-200 hover:border-brand-amethyst/40"
          )}
        >
          {resumeFile ? (
            <div className="flex items-center justify-center gap-2 w-full min-w-0 px-2 overflow-hidden">
              <FileText className="h-5 w-5 text-brand-amethyst flex-shrink-0" />
              <span
                className="text-sm font-medium text-brand-amethyst truncate block max-w-[180px] sm:max-w-[260px]"
                title={resumeFile.name}
              >
                {resumeFile.name}
              </span>
              <CheckCircle className="h-4 w-4 text-brand-amethyst flex-shrink-0" />
            </div>
          ) : (
            <>
              <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
              <p className="text-sm text-slate-600">
                Drop your resume here or click to upload
              </p>
              <p className="text-xs text-slate-400">PDF, DOCX (max 10MB)</p>
            </>
          )}
        </div>
      </div>
      {error ? (
        <p className="text-sm font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

function ConsentApplyFooter({
  isPending,
  s3Uploading,
  submitDisabled,
  hasSubmitError,
  onClose,
  onSubmit,
  stepIndex = 0,
  isLastStep = true,
  canAdvance = true,
  onBack,
  onNext,
}: {
  isPending: boolean;
  s3Uploading: boolean;
  submitDisabled: boolean;
  hasSubmitError: boolean;
  onClose: () => void;
  onSubmit: () => void;
  stepIndex?: number;
  isLastStep?: boolean;
  canAdvance?: boolean;
  onBack?: () => void;
  onNext?: () => void;
}) {
  if (hasSubmitError) {
    return (
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Close
        </Button>
      </DialogFooter>
    );
  }

  return (
    <DialogFooter className="flex-col sm:flex-row gap-2">
      <Button
        variant="outline"
        onClick={stepIndex === 0 ? onClose : onBack}
        disabled={isPending}
        className="flex-1 sm:flex-none"
      >
        {stepIndex === 0 ? "Cancel" : "Back"}
      </Button>
      {isLastStep ? (
        <Button
          variant="brand"
          onClick={onSubmit}
          disabled={submitDisabled}
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
          variant="brand"
          onClick={onNext}
          disabled={!canAdvance || isPending}
          className="flex-1 sm:flex-initial"
        >
          Continue
        </Button>
      )}
    </DialogFooter>
  );
}

async function handleConsentApplyConflict({
  toast,
  onClose,
  navigate,
}: {
  toast: ReturnType<typeof useToast>["toast"];
  onClose: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  toast({
    title: "Already applied",
    description: "You've already applied to this job.",
    variant: "destructive",
  });
  onClose();
  navigate("/recruiting/my-applications");
}

async function uploadConsentResumeIfNeeded({
  isConnectorUploaded,
  resumeFile,
  upload,
  toast,
}: {
  isConnectorUploaded: boolean;
  resumeFile: File | null;
  upload: ReturnType<typeof useS3Upload>["upload"];
  toast: ReturnType<typeof useToast>["toast"];
}): Promise<
  | undefined
  | {
      fileName: string;
      filePath: string;
      mimeType: string;
      fileType: string;
      size: number;
      module: string;
    }
> {
  if (isConnectorUploaded || !resumeFile) {
    return undefined;
  }
  const uploadResult = await upload(resumeFile);
  if (!uploadResult) {
    toast({
      title: "Upload failed",
      description: "Resume upload failed, please try again.",
      variant: "destructive",
    });
    return undefined;
  }
  return {
    fileName: uploadResult.fileName,
    filePath: uploadResult.filePath,
    mimeType: uploadResult.mimeType,
    fileType: uploadResult.fileType,
    size: uploadResult.size,
    module: "candidate_resume",
  };
}

export function ConsentApplyModal({
  consentToken,
  isOpen,
  onClose,
}: ConsentApplyModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // This modal collects the country itself, so the completion gate must not
  // ask for it at the same time.
  useSuppressProfileGate();

  const { data: consentData, isLoading: consentLoading } =
    useVerifyConsent(consentToken);
  const applyMutation = useConsentApply();
  const { upload, isUploading: s3Uploading } = useS3Upload({
    folder: "resumes",
  });

  const isPending = applyMutation.isPending || s3Uploading;

  const userHasLinkedIn = !!user?.linkedinUrl;
  const userHasCountry = !!user?.country?.trim();
  // Connector-uploaded consent-apply: the connector already provided a resume
  // and the server has an AI evaluation for it. We skip the resume upload
  // entirely. Resume-extracted LinkedIn is suggested for confirm — only
  // auto-submit when the candidate already has LinkedIn and country on profile.
  const isConnectorUploaded = consentData?.source === "connector_uploaded";
  const suggestedLinkedinUrl = consentData?.suggestedLinkedinUrl?.trim() || "";
  const assessmentQuestions = consentData?.assessmentQuestions ?? [];
  const hasAssessment = assessmentQuestions.length > 0;
  // Never auto-submit when the job has an assessment — the candidate must
  // answer the screening questions first. Contact-only LinkedIn requires confirm.
  const shouldAutoApply =
    isConnectorUploaded && userHasLinkedIn && userHasCountry && !hasAssessment;

  // Match public share apply: after screening answers, show Review before submit
  // so the candidate can go back and change answers. Connector-uploaded without
  // assessment stays a single LinkedIn confirm page (or auto-submit).
  type StepId = "resume" | "assessment" | "review";
  const useSteppedFlow =
    !!consentData && (!isConnectorUploaded || hasAssessment);
  const steps: StepId[] = !useSteppedFlow
    ? ["resume"]
    : hasAssessment
      ? ["resume", "assessment", "review"]
      : ["resume", "review"];

  const [stepIndex, setStepIndex] = useState(0);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [country, setCountry] = useState("");
  const [countryError, setCountryError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState<AssessmentAnswerState>({});
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [linkedinFieldTouched, setLinkedinFieldTouched] = useState(false);
  const autoAppliedRef = useRef(false);

  // Keep the dialog fully hidden while consent is loading, and while we are
  // silently auto-submitting (LinkedIn already on file). Otherwise the modal
  // flashes for a few ms before navigate — which looks broken on repeat applies.
  const showDialog =
    isOpen && !consentLoading && (!shouldAutoApply || !!submitError);

  // Reset on open only. Depending on user.country here would wipe resume/answers
  // and re-arm autoAppliedRef when the profile refreshes mid-flow. Country
  // prefill lives in its own effect below.
  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
      setLinkedinUrl("");
      setCountry("");
      setCountryError(null);
      setResumeFile(null);
      setAnswers({});
      setLinkedinError(null);
      setResumeError(null);
      setSubmitError(null);
      setLinkedinFieldTouched(false);
      autoAppliedRef.current = false;
    }
  }, [isOpen]);

  // Prefill LinkedIn from resume extraction once consent verify returns.
  useEffect(() => {
    if (!isOpen || consentLoading || userHasLinkedIn) return;
    if (!suggestedLinkedinUrl) return;
    setLinkedinUrl((prev) => (prev.trim() ? prev : suggestedLinkedinUrl));
  }, [isOpen, consentLoading, userHasLinkedIn, suggestedLinkedinUrl]);

  useEffect(() => {
    if (!isOpen || !user?.country) return;
    setCountry((prev) => (prev.trim() ? prev : user.country!.trim()));
  }, [isOpen, user?.country]);

  useEffect(() => {
    setStepIndex((i) => Math.min(i, steps.length - 1));
  }, [steps.length]);

  // Auto-submit for connector-uploaded only when LinkedIn is already on the
  // candidate's user profile. Resume-derived LI is shown for confirm instead.
  // Runs without opening the dialog UI.
  useEffect(() => {
    if (!isOpen || consentLoading || !shouldAutoApply) return;
    if (autoAppliedRef.current) return;
    autoAppliedRef.current = true;
    void handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, consentLoading, shouldAutoApply]);

  const currentStep = steps[stepIndex] ?? "resume";
  const isLastStep = stepIndex === steps.length - 1;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Resume must be under 10MB.",
        variant: "destructive",
      });
      return;
    }

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    setResumeFile(file);
    setResumeError(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!isConnectorUploaded && !resumeFile) {
      setResumeError("Resume is required");
      setStepIndex(0);
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

    if (shouldValidateConsentLinkedin(linkedinUrl)) {
      const err = getApplyJobLinkedinFieldError(linkedinUrl);
      if (err) {
        setLinkedinError(err);
        setStepIndex(0);
        return;
      }
    }

    try {
      const resumeData = await uploadConsentResumeIfNeeded({
        isConnectorUploaded,
        resumeFile,
        upload,
        toast,
      });
      if (!isConnectorUploaded && !resumeData) {
        setResumeError("Resume upload failed, please try again.");
        return;
      }

      const assessmentResponses = hasAssessment
        ? toAssessmentResponsesPayload(assessmentQuestions, answers)
        : [];

      await applyMutation.mutateAsync({
        token: consentToken,
        country: resolvedCountry,
        linkedinUrl: linkedinUrl || undefined,
        resume: resumeData,
        ...(assessmentResponses.length > 0 ? { assessmentResponses } : {}),
      });

      toast({
        title: "Application submitted!",
        description: consentData?.job
          ? `Your application for ${consentData.job.title} at ${consentData.job.companyName} has been received.`
          : "Your application has been received.",
      });
      onClose();
      navigate("/recruiting/my-applications");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await handleConsentApplyConflict({ toast, onClose, navigate });
        return;
      }
      const errorMessage = getConsentApplyErrorMessage({ error });
      setSubmitError(errorMessage);
      toast({
        title: "Application failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleLinkedinChange = (value: string) => {
    setLinkedinUrl(value);
    if (linkedinFieldTouched) {
      setLinkedinError(getApplyJobLinkedinFieldError(value));
    }
  };

  const handleLinkedinBlur = (value: string) => {
    setLinkedinFieldTouched(true);
    setLinkedinError(getApplyJobLinkedinFieldError(value));
  };

  const handleNext = () => {
    if (useSteppedFlow && currentStep === "resume") {
      if (!isConnectorUploaded && !resumeFile) {
        setResumeError("Resume is required");
        return;
      }
      if (!userHasCountry) {
        const countryErr = getCountryFieldError(country);
        if (countryErr) {
          setCountryError(countryErr);
          return;
        }
      }
      if (shouldValidateConsentLinkedin(linkedinUrl)) {
        const err = getApplyJobLinkedinFieldError(linkedinUrl);
        if (err) {
          setLinkedinError(err);
          return;
        }
      }
    }
    if (
      useSteppedFlow &&
      currentStep === "assessment" &&
      !areRequiredAnswersComplete(assessmentQuestions, answers)
    ) {
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const handleBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const jobTitle = consentData?.job?.title;
  const companyName = consentData?.job?.companyName;
  const assessmentComplete =
    !hasAssessment || areRequiredAnswersComplete(assessmentQuestions, answers);

  const resumeStepValid =
    (!!resumeFile || isConnectorUploaded) &&
    (userHasCountry || !getCountryFieldError(country));
  const canAdvanceResume =
    resumeStepValid &&
    (!shouldValidateConsentLinkedin(linkedinUrl) ||
      !getApplyJobLinkedinFieldError(linkedinUrl));
  const canAdvance =
    currentStep === "resume"
      ? canAdvanceResume
      : currentStep === "assessment"
        ? assessmentComplete
        : true;

  const submitDisabled = useSteppedFlow
    ? isConsentSubmitDisabled({ isPending }) ||
      !resumeStepValid ||
      !assessmentComplete
    : isConsentSubmitDisabled({ isPending }) ||
      !assessmentComplete ||
      (!userHasCountry &&
        !!getCountryFieldError(country || user?.country || ""));

  const showResumeStep = !useSteppedFlow || currentStep === "resume";
  const showAssessmentStep =
    hasAssessment && (!useSteppedFlow || currentStep === "assessment");
  const showReviewStep = useSteppedFlow && currentStep === "review";

  // Connector-uploaded + no assessment = LinkedIn-only UI → keep the dialog compact.
  const isLinkedInOnlyModal = isConnectorUploaded && !hasAssessment;

  return (
    <Dialog open={showDialog} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "w-full overflow-hidden box-border",
          isLinkedInOnlyModal
            ? "max-w-md"
            : useSteppedFlow && currentStep === "resume"
              ? "max-w-lg"
              : "max-w-2xl"
        )}
        mobileFullscreen
      >
        <ConsentApplyJobHeader
          consentLoading={consentLoading}
          jobTitle={jobTitle}
          companyName={companyName}
        />

        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4 pr-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
          {useSteppedFlow && steps.length > 1 ? (
            <p className="text-xs font-medium text-muted-foreground">
              Step {stepIndex + 1} of {steps.length}
              {currentStep === "assessment" ? " — Screening questions" : null}
              {currentStep === "review" ? " — Review & submit" : null}
            </p>
          ) : null}

          {submitError && !(shouldAutoApply && !userHasLinkedIn) && (
            <ApplySubmissionErrorAlert message={submitError} />
          )}

          {showResumeStep ? (
            <>
              <ConsentLinkedInSection
                shouldAutoApply={shouldAutoApply}
                userHasLinkedIn={userHasLinkedIn}
                userLinkedinUrl={user?.linkedinUrl ?? ""}
                linkedinUrl={linkedinUrl}
                linkedinError={linkedinError}
                submitError={submitError}
                onLinkedinChange={handleLinkedinChange}
                onLinkedinBlur={handleLinkedinBlur}
              />
              {!isConnectorUploaded ? (
                <ConsentResumeDropzone
                  resumeFile={resumeFile}
                  onFileSelect={handleFileSelect}
                  required
                  error={resumeError}
                />
              ) : null}
              {!userHasCountry && !(shouldAutoApply && !userHasLinkedIn) ? (
                <PayoutCountryField
                  value={country}
                  onChange={(value) => {
                    setCountry(value);
                    setCountryError(getCountryFieldError(value));
                  }}
                  error={countryError}
                />
              ) : null}
            </>
          ) : null}

          {showAssessmentStep ? (
            <div
              className={cn(
                !useSteppedFlow &&
                  "max-h-[45vh] overflow-y-auto pr-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40"
              )}
            >
              <AssessmentAnswerStep
                questions={assessmentQuestions}
                answers={answers}
                onChange={setAnswers}
              />
            </div>
          ) : null}

          {showReviewStep ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Resume</p>
                <p className="break-words text-muted-foreground">
                  {isConnectorUploaded
                    ? "Already on file from your referrer"
                    : (resumeFile?.name ?? "—")}
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
              {hasAssessment ? (
                <AssessmentReviewSummary
                  questions={assessmentQuestions}
                  answers={answers}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <ConsentApplyFooter
          isPending={isPending}
          s3Uploading={s3Uploading}
          submitDisabled={submitDisabled}
          hasSubmitError={!!submitError}
          onClose={onClose}
          onSubmit={() => void handleSubmit()}
          stepIndex={useSteppedFlow ? stepIndex : 0}
          isLastStep={!useSteppedFlow || isLastStep}
          canAdvance={canAdvance}
          onBack={handleBack}
          onNext={handleNext}
        />
      </DialogContent>
    </Dialog>
  );
}
