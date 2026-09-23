import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { normalizeSalaryCurrency } from "@/lib/salary-currency";
import { Loader2, CheckCircle, RotateCcw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCalendarRequirement } from "@/hooks/useCalendarRequirement";
import { consumeCalendarConnectReopenModal } from "@/utils/calendar-connect-return";
import { PostJobCalendarConnectModal } from "@/components/recruitment/PostJobCalendarConnectModal";
import { api } from "@/lib/api";
import type {
  RecruitmentJobDetail,
  JobAssessmentQuestionPayload,
} from "@/lib/api/recruitment";
import {
  useRecruitmentJob,
  useUpdateRecruitmentJob,
} from "@/hooks/useRecruitmentJobs";
import {
  useIndustries,
  useDepartments,
} from "@/hooks/useRecruitmentMasterData";

import {
  type JobFormData,
  type WizardAssessmentQuestion,
  initialFormData,
} from "./post-job-wizard/types";
import {
  RECRUITMENT_PERMISSIONS,
  hasPermission,
} from "@/lib/recruitment-permissions";
import { richTextLength, toEditorHtml } from "@/lib/rich-text";
import { validateStep, type StepErrors } from "./post-job-wizard/validation";
import {
  getSteps,
  getLogicalStep,
  getStepId,
  getEditSteps,
  getEditLogicalStep,
  getEditStepId,
} from "./post-job-wizard/constants";
import MethodStep from "./post-job-wizard/MethodStep";
// AIPreviewStep removed — PDF extraction now auto-fills form directly
import DetailsStep from "./post-job-wizard/DetailsStep";
import SkillsStep from "./post-job-wizard/SkillsStep";
import DescriptionStep from "./post-job-wizard/DescriptionStep";
import AssessmentStep from "./post-job-wizard/AssessmentStep";
import BudgetStep from "./post-job-wizard/BudgetStep";
import ConnectorPayoutStep from "./post-job-wizard/ConnectorPayoutStep";
import SuccessFeesStep from "./post-job-wizard/SuccessFeesStep";
import PaymentStep from "./post-job-wizard/PaymentStep";
import NotifyStep from "./post-job-wizard/NotifyStep";
import ConfirmStep from "./post-job-wizard/ConfirmStep";
import WizardStepRail from "./post-job-wizard/components/WizardStepRail";
import WizardPreviewDrawer from "./post-job-wizard/components/WizardPreviewDrawer";

const STORAGE_KEY = "prospectly_job_wizard_draft";

/** Mapping of logical steps to their associated form fields */
const STEP_FIELDS: Record<string, (keyof JobFormData)[]> = {
  method: ["creationMethod", "sourceUrl"],
  details: [
    "title",
    "companyName",
    "companyWebsite",
    "location",
    "countries",
    "workType",
    "employmentType",
    "experienceLevel",
    "industry",
    "department",
  ],
  skills: ["requiredSkills", "preferredSkills"],
  description: ["description", "requirements", "responsibilities", "benefits"],
  assessment: ["hasAssessment", "assessmentQuestions"],
  budget: [
    "salaryCurrency",
    "salaryRangeMin",
    "salaryRangeMax",
    "salaryPeriod",
    "flatReferralAmount",
    "salaryRangeNotes",
  ],
  connectorPayout: [
    "intPayoutWaits",
    "extPayoutWaits",
    "intConnectorPayoutWaitDays",
    "extConnectorPayoutWaitDays",
  ],
  successFees: ["hasSuccessFee", "successFeeAmount", "probationPeriodDays"],
  payment: ["hasPaymentMethod"],
  notify: ["notifyUsers", "organisationIds"],
  confirm: [], // No fields to reset in confirm step
};

/** Logical steps that have Zod schemas — create flow (order matters for first error navigation). */
const CREATE_WIZARD_VALIDATE_STEPS: string[] = [
  "method",
  "details",
  "skills",
  "description",
  "assessment",
  "budget",
  "connectorPayout",
  "successFees",
  "notify",
];

/**
 * Edit flow: only steps that are validated on save (order matters). Connector
 * Payout is editable on open jobs, so it is validated; on a closed job the step
 * is locked and its prefilled values still pass.
 */
const EDIT_WIZARD_VALIDATE_STEPS: string[] = [
  "details",
  "skills",
  "description",
  "assessment",
  "budget",
  "connectorPayout",
  "successFees",
];

function loadDraft(): { formData: JobFormData; step: number } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* localStorage unavailable */
  }
  return null;
}

function saveDraft(formData: JobFormData, step: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, step }));
  } catch {
    /* localStorage unavailable */
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

function getInitialState(): {
  formData: JobFormData;
  step: number;
  hasDraft: boolean;
} {
  const draft = loadDraft();
  if (draft && draft.formData.title) {
    return {
      formData: { ...initialFormData, ...draft.formData },
      step: draft.step,
      hasDraft: true,
    };
  }
  return { formData: initialFormData, step: 1, hasDraft: false };
}

/** Map loaded job questions into wizard-local questions (for the edit flow). */
function buildAssessmentQuestions(
  job: RecruitmentJobDetail
): WizardAssessmentQuestion[] {
  return (job.assessmentQuestions ?? []).map((q) => ({
    clientId: crypto.randomUUID(),
    serverId: q.id,
    sourceBankQuestionId: q.sourceBankQuestionId ?? undefined,
    questionText: q.questionText,
    isRequired: q.isRequired,
    questionType: q.questionType,
    options: q.options ?? undefined,
    correctAnswer: q.correctAnswer ?? undefined,
    points: q.points ?? undefined,
  }));
}

/** Convert wizard-local questions into the create/update job payload shape. */
function toAssessmentPayload(
  questions: WizardAssessmentQuestion[]
): JobAssessmentQuestionPayload[] {
  return questions.map((q, index) => ({
    id: q.serverId,
    sourceBankQuestionId: q.sourceBankQuestionId,
    questionText: q.questionText.trim(),
    questionType: q.questionType ?? "single_choice",
    options: q.options,
    correctAnswer: q.correctAnswer,
    points: q.points,
    orderIndex: index,
    isRequired: q.isRequired,
    saveToBank: q.saveToBank,
  }));
}

function buildFormDataFromRecruitmentJob(
  job: RecruitmentJobDetail
): JobFormData {
  return {
    creationMethod:
      (job.creationMethod as JobFormData["creationMethod"]) || "manual",
    sourceUrl: job.sourceUrl || "",
    industry: String(job.industryId),
    department: String(job.departmentId),
    title: job.title,
    experienceLevel: job.experienceLevel,
    workType: job.workType || "hybrid",
    // No default: unlike workType, an unset employment type means "not stated",
    // and defaulting it would invent terms the posting never carried.
    employmentType: job.employmentType || "",
    location: job.location || "",
    countries: Array.isArray(job.countries) ? job.countries : [],
    companyName: job.companyName,
    companyWebsite: job.companyWebsite || "",
    requiredSkills: job.requiredSkills || [],
    preferredSkills: job.preferredSkills || [],
    description: toEditorHtml(job.description),
    requirements: toEditorHtml(job.requirements),
    responsibilities: toEditorHtml(job.responsibilities || ""),
    benefits: toEditorHtml(job.benefits || ""),
    salaryRangeMin: Number(job.salaryRangeMin),
    salaryRangeMax: Number(job.salaryRangeMax),
    salaryCurrency: normalizeSalaryCurrency(job.salaryCurrency),
    salaryPeriod: (job.salaryPeriod as JobFormData["salaryPeriod"]) || "yearly",
    salaryRangeNotes: job.salaryRangeNotes ?? "",
    flatReferralAmount: job.flatReferralAmount
      ? Number(job.flatReferralAmount)
      : 0,
    hasSuccessFee: job.hasSuccessFee === true,
    successFeeAmount: job.successFeeAmount ? Number(job.successFeeAmount) : 0,
    probationPeriodDays: job.probationPeriodDays ?? 0,
    intPayoutWaits: job.intPayoutWaits === true,
    extPayoutWaits: job.extPayoutWaits === true,
    intConnectorPayoutWaitDays: job.intConnectorPayoutWaitDays ?? 0,
    extConnectorPayoutWaitDays: job.extConnectorPayoutWaitDays ?? 0,
    hasPaymentMethod: true,
    notifyUsers: false,
    organisationIds: [],
    hasAssessment: (job.assessmentQuestions?.length ?? 0) > 0,
    assessmentQuestions: buildAssessmentQuestions(job),
  };
}

/**
 * Phase 1: the Flat Referral Fee is editable only on the edit page, for active
 * jobs. Shared by the step renderer and the save flow so both use the same rule.
 */
function isFlatFeeEditable(
  job: RecruitmentJobDetail | null,
  isEditMode: boolean,
  isViewMode: boolean
): boolean {
  return isEditMode && !isViewMode && !!job && job.status !== "closed";
}

/**
 * Phase 2: the Success Fee is editable on the edit page for any open job — the
 * amount can change and a fee can be added later. Shared by the step renderer
 * and the save flow.
 */
function isSuccessFeeEditable(
  job: RecruitmentJobDetail | null,
  isEditMode: boolean,
  isViewMode: boolean
): boolean {
  return isEditMode && !isViewMode && job?.status !== "closed";
}

/**
 * Connector payout timing is editable on the edit page for any open job.
 * External is always editable; internal is locked to the org admin default when
 * one is set (enforced by ConnectorPayoutStep + the server). Shared by the step
 * renderer and the save flow.
 */
function isConnectorPayoutEditable(
  job: RecruitmentJobDetail | null,
  isEditMode: boolean,
  isViewMode: boolean
): boolean {
  return isEditMode && !isViewMode && job?.status !== "closed";
}

interface RenderPostJobWizardStepParams {
  logicalStep: string;
  formData: JobFormData;
  updateFormData: (
    updates:
      | Partial<JobFormData>
      | ((prev: JobFormData) => Partial<JobFormData>)
  ) => void;
  totalSteps: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setMethodExtractionBusy: (busy: boolean) => void;
  stepErrors: StepErrors;
  clearStepError: (field: string) => void;
  updateStepFieldError: (field: string, message: string | undefined) => void;
  validationNonce: number;
  isEditMode: boolean;
  isViewMode: boolean;
  industries: ReturnType<typeof useIndustries>["industries"];
  departments: ReturnType<typeof useDepartments>["departments"];
  job: RecruitmentJobDetail | null;
}

function renderPostJobWizardStepContent({
  logicalStep,
  formData,
  updateFormData,
  totalSteps,
  setCurrentStep,
  setMethodExtractionBusy,
  stepErrors,
  clearStepError,
  updateStepFieldError,
  validationNonce,
  isEditMode,
  isViewMode,
  industries,
  departments,
  job,
}: RenderPostJobWizardStepParams) {
  const flatFeeEditable = isFlatFeeEditable(job, isEditMode, isViewMode);
  const successFeeEditable = isSuccessFeeEditable(job, isEditMode, isViewMode);
  const connectorPayoutEditable = isConnectorPayoutEditable(
    job,
    isEditMode,
    isViewMode
  );
  switch (logicalStep) {
    case "method":
      return (
        <MethodStep
          formData={formData}
          updateFormData={updateFormData}
          onExtractionComplete={() =>
            setCurrentStep((prev) => Math.min(totalSteps, prev + 1))
          }
          onExtractionBusyChange={setMethodExtractionBusy}
          stepErrors={stepErrors}
          onClearError={clearStepError}
        />
      );
    case "details":
      return (
        <DetailsStep
          formData={formData}
          updateFormData={updateFormData}
          readOnly={isViewMode}
          stepErrors={stepErrors}
          onUpdateStepFieldError={updateStepFieldError}
        />
      );
    case "skills":
      return (
        <SkillsStep
          formData={formData}
          updateFormData={updateFormData}
          isEditMode={isEditMode}
          readOnly={isViewMode}
          stepErrors={stepErrors}
          onUpdateStepFieldError={updateStepFieldError}
        />
      );
    case "description":
      return (
        <DescriptionStep
          formData={formData}
          updateFormData={updateFormData}
          isEditMode={isEditMode}
          readOnly={isViewMode}
          stepErrors={stepErrors}
          onClearError={clearStepError}
          onUpdateStepFieldError={updateStepFieldError}
          validationNonce={validationNonce}
          industries={industries}
          departments={departments}
        />
      );
    case "assessment":
      return (
        <AssessmentStep
          formData={formData}
          updateFormData={updateFormData}
          readOnly={isViewMode}
          stepErrors={stepErrors}
        />
      );
    case "budget":
      return (
        <BudgetStep
          formData={formData}
          updateFormData={updateFormData}
          isEditMode={isEditMode}
          readOnly={isViewMode}
          flatFeeEditable={flatFeeEditable}
          storedProviderFee={job?.providerFee}
          storedProcessingFee={job?.processingFee}
          storedTotalAmount={job?.totalAmount}
          storedFlatReferralAmount={job?.flatReferralAmount}
          stepErrors={stepErrors}
          onUpdateStepFieldError={updateStepFieldError}
        />
      );
    case "connectorPayout":
      return (
        <ConnectorPayoutStep
          formData={formData}
          updateFormData={updateFormData}
          isEditMode={isEditMode}
          readOnly={isViewMode}
          connectorPayoutEditable={connectorPayoutEditable}
          storedIntPayoutWaits={job?.intPayoutWaits}
          storedExtPayoutWaits={job?.extPayoutWaits}
          storedIntConnectorPayoutWaitDays={job?.intConnectorPayoutWaitDays}
          storedExtConnectorPayoutWaitDays={job?.extConnectorPayoutWaitDays}
          stepErrors={stepErrors}
          onUpdateStepFieldError={updateStepFieldError}
        />
      );
    case "successFees":
      return (
        <SuccessFeesStep
          formData={formData}
          updateFormData={updateFormData}
          isEditMode={isEditMode}
          readOnly={isViewMode}
          successFeeEditable={successFeeEditable}
          storedHasSuccessFee={job?.hasSuccessFee}
          storedSuccessFeeAmount={job?.successFeeAmount}
          storedProbationPeriodDays={job?.probationPeriodDays}
          stepErrors={stepErrors}
          onUpdateStepFieldError={updateStepFieldError}
        />
      );
    case "payment":
      return (
        <PaymentStep formData={formData} updateFormData={updateFormData} />
      );
    case "notify":
      return (
        <NotifyStep
          formData={formData}
          updateFormData={updateFormData}
          stepErrors={stepErrors}
          onClearError={clearStepError}
        />
      );
    case "confirm":
      return <ConfirmStep formData={formData} />;
    default:
      return null;
  }
}

type PostJobWizardFooterVariant =
  | "continue"
  | "view_back"
  | "edit_save"
  | "create_publish";

function getPostJobWizardFooterVariant({
  currentStep,
  totalSteps,
  isViewMode,
  isEditMode,
}: {
  currentStep: number;
  totalSteps: number;
  isViewMode: boolean;
  isEditMode: boolean;
}): PostJobWizardFooterVariant | null {
  if (currentStep < totalSteps) return "continue";
  if (isViewMode) return "view_back";
  if (isEditMode) return "edit_save";
  return "create_publish";
}

export default function PostJobWizard() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isViewMode = location.pathname.endsWith("/view");
  const isEditMode = !!id;
  const isCreateMode = !isEditMode && !isViewMode;
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    hasCalendar,
    loading: calendarLoading,
    refreshCalendarStatus,
  } = useCalendarRequirement();

  const { job, loading: jobLoading, error: jobError } = useRecruitmentJob(id);
  const updateJobMutation = useUpdateRecruitmentJob();

  // Fetch industries and departments for AI generation
  const { industries } = useIndustries();
  const { departments } = useDepartments();

  const [initial] = useState(() => (isEditMode ? null : getInitialState()));
  const [currentStep, setCurrentStep] = useState(
    isEditMode ? 1 : initial?.hasDraft ? 1 : (initial?.step ?? 1)
  );
  // Furthest step the user has reached (monotonic). Lets the progress rail allow
  // jumping to any already-reached step even after navigating back.
  const [maxStepReached, setMaxStepReached] = useState(currentStep);
  useEffect(() => {
    setMaxStepReached((prev) => Math.max(prev, currentStep));
  }, [currentStep]);
  const [formData, setFormData] = useState<JobFormData>(
    isEditMode
      ? initialFormData
      : initial?.hasDraft
        ? initialFormData
        : (initial?.formData ?? initialFormData)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(
    !isEditMode && (initial?.hasDraft ?? false)
  );
  const [editDataLoaded, setEditDataLoaded] = useState(false);
  const [methodExtractionBusy, setMethodExtractionBusy] = useState(false);
  const [stepErrors, setStepErrors] = useState<StepErrors>({});
  // Bumped whenever full-step validation fails; lets steps (e.g. the
  // Description accordion) auto-expand the first errored field.
  const [validationNonce, setValidationNonce] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showFeeRaiseWarn, setShowFeeRaiseWarn] = useState(false);
  // The raised fee HR has acknowledged on the Budget step; the warning re-shows
  // only when the current value differs from it. null = not yet acknowledged.
  const [flatFeeAckAmount, setFlatFeeAckAmount] = useState<number | null>(null);
  const [showSuccessFeeWarn, setShowSuccessFeeWarn] = useState(false);
  // The Success Fee HR has acknowledged on the Success Fees step (same mechanic
  // as flatFeeAckAmount). null = not yet acknowledged.
  const [successFeeAckAmount, setSuccessFeeAckAmount] = useState<number | null>(
    null
  );
  // Success Fees is the last edit step, so Save can trigger the warning with no
  // step to leave; this remembers that confirming should then save.
  const [pendingSaveAfterAck, setPendingSaveAfterAck] = useState(false);
  // Where to navigate after HR confirms the fee-raise warning (set when a
  // Budget-step exit is gated).
  const [pendingStepJump, setPendingStepJump] = useState<number | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  useEffect(() => {
    if (!isCreateMode || calendarLoading) return;
    if (!hasCalendar && consumeCalendarConnectReopenModal()) {
      setIsCalendarModalOpen(true);
    }
  }, [isCreateMode, hasCalendar, calendarLoading]);
  const draftResumed = useRef(false);
  const editLoadFailureHandled = useRef(false);

  // Pre-fill form data from job in edit mode
  useEffect(() => {
    if (!isEditMode || !job || editDataLoaded) return;
    setFormData(buildFormDataFromRecruitmentJob(job));
    setEditDataLoaded(true);
  }, [isEditMode, job, editDataLoaded]);

  // Edit mode: fetch finished with no job (missing or error) — avoid infinite spinner
  useEffect(() => {
    if (!isEditMode || jobLoading || editDataLoaded || job) return;
    if (editLoadFailureHandled.current) return;
    editLoadFailureHandled.current = true;
    setEditDataLoaded(true);
    const description =
      jobError instanceof Error
        ? jobError.message
        : "This job could not be loaded. It may have been removed.";
    toast({
      title: "Could not load job",
      description,
      variant: "destructive",
    });
    navigate("/recruiting/my-job-posts", { replace: true });
  }, [isEditMode, job, jobLoading, jobError, editDataLoaded, toast, navigate]);

  // Edit mode: collaborators (who lack job.edit) cannot edit job details. The
  // server enforces this with a 403; here we redirect them to the pipeline so
  // they never see a form that can't be saved.
  useEffect(() => {
    if (!isEditMode || !job || !id) return;
    if (!hasPermission(job.permissions, RECRUITMENT_PERMISSIONS.JOB_EDIT)) {
      toast({
        title: "View only",
        description: "You don't have permission to edit this job's details.",
      });
      navigate(`/recruiting/my-job-posts/${id}`, { replace: true });
    }
  }, [isEditMode, job, id, toast, navigate]);

  useEffect(() => {
    if (isCreateMode) {
      refreshCalendarStatus();
    }
  }, [isCreateMode, refreshCalendarStatus]);

  const resumeDraft = () => {
    if (initial) {
      setFormData(initial.formData);

      // Remap legacy drafts saved when AI Preview was step 2 (8-step wizard).
      // Current wizard has 7 steps with no AI Preview, so steps >= 2 are off by one.
      const currentTotalSteps = getSteps().length;
      let mappedStep = initial.step;
      if (mappedStep >= 2 && mappedStep > currentTotalSteps) {
        // Draft was saved under the old 8-step numbering; shift down by 1.
        mappedStep = mappedStep - 1;
      }
      // Clamp to valid range regardless
      mappedStep = Math.max(1, Math.min(mappedStep, currentTotalSteps));

      setCurrentStep(mappedStep);
      setStepErrors({});
    }
    draftResumed.current = true;
    setShowDraftPrompt(false);
  };

  const resolveLogicalStep = useCallback(
    (stepId: number): string => {
      if (isEditMode) return getEditLogicalStep(stepId);
      return getLogicalStep(stepId);
    },
    [isEditMode]
  );

  const updateFormData = useCallback(
    (
      updates:
        | Partial<JobFormData>
        | ((prev: JobFormData) => Partial<JobFormData>)
    ) => {
      setFormData((prev) => ({
        ...prev,
        ...(typeof updates === "function" ? updates(prev) : updates),
      }));
    },
    []
  );

  const resetCurrentStep = useCallback(() => {
    const logicalStep = resolveLogicalStep(currentStep);
    const fieldsToReset: (keyof JobFormData)[] = STEP_FIELDS[logicalStep] ?? [];

    const resetValues = fieldsToReset.reduce<Partial<JobFormData>>(
      (acc, field) => ({ ...acc, [field]: initialFormData[field] }),
      {}
    );

    updateFormData(resetValues);
    setStepErrors((prev) => {
      const next = { ...prev };
      fieldsToReset.forEach((field) => {
        delete next[field];
      });
      return next;
    });
  }, [currentStep, resolveLogicalStep, updateFormData]);

  const startFresh = () => {
    clearDraft();
    setShowDraftPrompt(false);
  };

  const editSteps = getEditSteps();
  const createSteps = getSteps();
  const steps = isEditMode ? editSteps : createSteps;
  const totalSteps = steps.length;

  // Save draft on form/step changes (skip the first cycle after resume, skip in edit mode)
  useEffect(() => {
    if (isEditMode) return;
    if (showDraftPrompt) return;
    if (draftResumed.current) {
      draftResumed.current = false;
      return;
    }
    saveDraft(formData, currentStep);
  }, [formData, currentStep, showDraftPrompt, isEditMode]);

  /** Clear a single field error (called by child step components on valid input) */
  const clearStepError = useCallback((field: string) => {
    setStepErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /** Set or clear one field's inline error from live Zod checks (instant feedback) */
  const updateStepFieldError = useCallback(
    (field: string, message: string | undefined) => {
      setStepErrors((prev) => {
        if (message === undefined) {
          if (!(field in prev)) return prev;
          const next = { ...prev };
          delete next[field];
          return next;
        }
        if (prev[field] === message) return prev;
        return { ...prev, [field]: message };
      });
    },
    []
  );

  /** Full client-side Zod pass before publish; navigates to first failing step. */
  const runFullCreateValidation = useCallback((): boolean => {
    if (formData.creationMethod !== "manual" && !formData.title.trim()) {
      toast({
        title: "Extract job details first",
        description:
          "Upload a PDF or DOCX, or extract from a public job URL, before continuing.",
      });
      setStepErrors({});
      setCurrentStep(getStepId("method"));
      return false;
    }

    for (const logical of CREATE_WIZARD_VALIDATE_STEPS) {
      const errors = validateStep(logical, formData);
      if (Object.keys(errors).length > 0) {
        setStepErrors(errors);
        setValidationNonce((n) => n + 1);
        setCurrentStep(getStepId(logical));
        toast({
          title: "Please fix the form",
          description: "Some required fields are missing or invalid.",
          variant: "destructive",
        });
        return false;
      }
    }

    if (!formData.hasPaymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please add a payment method before publishing.",
      });
      setStepErrors({});
      setCurrentStep(getStepId("payment"));
      return false;
    }

    setStepErrors({});
    return true;
  }, [formData, toast]);

  /** Full Zod pass before edit save. */
  const runFullEditValidation = useCallback((): boolean => {
    // Connector Payout is only validated when the step is actually editable —
    // on a locked/legacy job its fields aren't in the update payload, so stale
    // prefilled values must not block saving the other steps.
    const editableConnector = isConnectorPayoutEditable(
      job,
      isEditMode,
      isViewMode
    );
    for (const logical of EDIT_WIZARD_VALIDATE_STEPS) {
      if (logical === "connectorPayout" && !editableConnector) continue;
      const errors = validateStep(logical, formData);
      if (Object.keys(errors).length > 0) {
        setStepErrors(errors);
        setValidationNonce((n) => n + 1);
        setCurrentStep(getEditStepId(logical));
        toast({
          title: "Please fix the form",
          description: "Some required fields are missing or invalid.",
          variant: "destructive",
        });
        return false;
      }
    }
    setStepErrors({});
    return true;
  }, [formData, toast, job, isEditMode, isViewMode]);

  const handleNext = () => {
    if (isViewMode) {
      setStepErrors({});
      setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
      return;
    }

    const logicalStep = resolveLogicalStep(currentStep);

    // Special guard: for non-manual methods extraction must complete first
    if (
      !isEditMode &&
      logicalStep === "method" &&
      formData.creationMethod !== "manual" &&
      !formData.title
    ) {
      toast({
        title: "Extract job details first",
        description:
          "Upload a PDF or DOCX, or extract from a public job URL, before continuing.",
      });
      return;
    }

    // Payment step: Continue is disabled until a method is saved (see footer button).
    if (logicalStep === "payment" && !formData.hasPaymentMethod) {
      return;
    }

    // Zod validation for all other steps
    const errors = validateStep(logicalStep, formData);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      setValidationNonce((n) => n + 1);
      return;
    }

    setStepErrors({});
    // Raising the fee here warns before leaving the Budget step (advances on
    // confirm). The fee is still saved with everything else at the final Save.
    if (gateStepLeave(Math.min(totalSteps, currentStep + 1))) return;
    setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const handleBack = () => {
    if (gateStepLeave(Math.max(1, currentStep - 1))) return;
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Phase 1: the Flat Referral Fee is editable on the edit page for active
  // flat_referral jobs. Success Fees stay locked (Phase 2).
  const flatFeeEditable = isFlatFeeEditable(job, isEditMode, isViewMode);
  const flatFeeChanged =
    !!flatFeeEditable &&
    Number(formData.flatReferralAmount) !==
      Number(job?.flatReferralAmount ?? 0);
  // Raising the fee can trigger a top-up charge later (at payout release) for
  // candidates already hired but not yet paid, so warn HR when they leave the
  // Budget step with a raised fee. Lowering never charges, so no warning.
  const flatFeeRaised =
    flatFeeChanged &&
    Number(formData.flatReferralAmount) > Number(job?.flatReferralAmount ?? 0);
  // Warn until HR acknowledges the current raised value; re-prompts if they
  // raise it further, and clears itself if they revert (flatFeeRaised → false).
  const needsFeeRaiseWarn =
    flatFeeRaised && Number(formData.flatReferralAmount) !== flatFeeAckAmount;

  // Phase 2: the Success Fee is editable on the edit page for open jobs. Enabling
  // it or editing the amount is included in the save; a raise/enable can add a
  // charge later at release, so it gets the same acknowledgement warning.
  const successFeeEditable = isSuccessFeeEditable(job, isEditMode, isViewMode);
  // Connector payout timing is saved on edit for any open job. External is taken
  // from the form; internal is re-enforced from the org admin default server-side.
  const connectorPayoutEditable = isConnectorPayoutEditable(
    job,
    isEditMode,
    isViewMode
  );
  const successFeeEnabling =
    successFeeEditable && formData.hasSuccessFee && job?.hasSuccessFee !== true;
  const successFeeAmountChanged =
    successFeeEditable &&
    formData.hasSuccessFee &&
    job?.hasSuccessFee === true &&
    Number(formData.successFeeAmount) !== Number(job?.successFeeAmount ?? 0);
  // Editing only the probation window on an active fee must still be saved.
  const successFeeProbationChanged =
    successFeeEditable &&
    formData.hasSuccessFee &&
    job?.hasSuccessFee === true &&
    Number(formData.probationPeriodDays ?? 0) !==
      Number(job?.probationPeriodDays ?? 0);
  // Disabling an active fee is future-only (no charge) but must still be saved.
  const successFeeDisabling =
    successFeeEditable &&
    !formData.hasSuccessFee &&
    job?.hasSuccessFee === true;
  const successFeeChanged =
    successFeeEnabling ||
    successFeeAmountChanged ||
    successFeeProbationChanged ||
    successFeeDisabling;
  // Only enabling or raising can charge the card later; lowering never does.
  const successFeeRaisedOrEnabled =
    successFeeEnabling ||
    (successFeeAmountChanged &&
      Number(formData.successFeeAmount) > Number(job?.successFeeAmount ?? 0));
  const needsSuccessFeeWarn =
    successFeeRaisedOrEnabled &&
    Number(formData.successFeeAmount) !== successFeeAckAmount;

  // Gate a move OFF a step whose pending change needs acknowledgement (raised
  // Flat Referral Fee on Budget, or enabled/raised Success Fee on Success Fees).
  // Returns true (and opens the modal, remembering the target) when it must wait.
  const gateStepLeave = (target: number): boolean => {
    const logical = resolveLogicalStep(currentStep);
    if (logical === "budget" && needsFeeRaiseWarn) {
      setPendingStepJump(target);
      setShowFeeRaiseWarn(true);
      return true;
    }
    if (logical === "successFees" && needsSuccessFeeWarn) {
      setPendingStepJump(target);
      setShowSuccessFeeWarn(true);
      return true;
    }
    return false;
  };

  // Acknowledge the raised fee and continue to the pending target step. No save
  // here — the fee is persisted with everything else at the final Save.
  const confirmFeeRaiseAndContinue = () => {
    setFlatFeeAckAmount(Number(formData.flatReferralAmount));
    setShowFeeRaiseWarn(false);
    setStepErrors({});
    if (pendingStepJump !== null) setCurrentStep(pendingStepJump);
    setPendingStepJump(null);
  };

  const cancelFeeRaiseWarn = () => {
    setShowFeeRaiseWarn(false);
    setPendingStepJump(null);
  };

  const submitUpdate = async (includeFlatFee: boolean) => {
    if (!id || isViewMode) return;
    setIsSubmitting(true);
    // Optional rich-text fields are "empty" when they have no visible text,
    // even if the editor emitted markup like "<p></p>" — send undefined then.
    const trimmedResponsibilities =
      richTextLength(formData.responsibilities) > 0
        ? formData.responsibilities.trim()
        : "";
    const trimmedBenefits =
      richTextLength(formData.benefits) > 0 ? formData.benefits.trim() : "";

    try {
      await updateJobMutation.mutateAsync({
        jobId: id,
        payload: {
          title: formData.title.trim(),
          companyName: formData.companyName.trim(),
          location: formData.location.trim() || undefined,
          countries: formData.countries,
          workType: formData.workType,
          employmentType: formData.employmentType || undefined,
          experienceLevel: formData.experienceLevel,
          industryId: Number(formData.industry),
          departmentId: Number(formData.department),
          description: formData.description.trim(),
          requirements: formData.requirements.trim(),
          responsibilities: trimmedResponsibilities || undefined,
          benefits: trimmedBenefits || undefined,
          companyWebsite: formData.companyWebsite.trim() || undefined,
          requiredSkills: formData.requiredSkills,
          preferredSkills: formData.preferredSkills,
          salaryRangeMin: formData.salaryRangeMin,
          salaryRangeMax: formData.salaryRangeMax,
          salaryCurrency: formData.salaryCurrency,
          salaryPeriod: formData.salaryPeriod,
          salaryRangeNotes: formData.salaryRangeNotes?.trim() || undefined,
          hasAssessment: formData.hasAssessment,
          assessmentQuestions: formData.hasAssessment
            ? toAssessmentPayload(formData.assessmentQuestions)
            : [],
          ...(includeFlatFee
            ? { flatReferralAmount: formData.flatReferralAmount }
            : {}),
          ...(successFeeChanged
            ? {
                hasSuccessFee: formData.hasSuccessFee,
                // Amount + probation only when the fee is (still) on; disabling
                // sends just hasSuccessFee: false (future-only, no charge). The
                // server no-ops fields that didn't actually change.
                ...(formData.hasSuccessFee
                  ? {
                      successFeeAmount: formData.successFeeAmount,
                      probationPeriodDays: formData.probationPeriodDays,
                    }
                  : {}),
              }
            : {}),
          // Connector payout timing — internal is re-derived from the org config
          // server-side when an admin default is set, regardless of what is sent.
          ...(connectorPayoutEditable
            ? {
                intPayoutWaits: formData.intPayoutWaits,
                extPayoutWaits: formData.extPayoutWaits,
                intConnectorPayoutWaitDays: formData.intPayoutWaits
                  ? formData.intConnectorPayoutWaitDays || undefined
                  : undefined,
                extConnectorPayoutWaitDays: formData.extPayoutWaits
                  ? formData.extConnectorPayoutWaitDays || undefined
                  : undefined,
              }
            : {}),
        },
      });
      toast({
        title: "Job updated successfully!",
        description: "Your changes have been saved.",
      });
      navigate("/recruiting/my-job-posts");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update job";
      toast({
        title: "Error Updating Job",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmSuccessFeeAndContinue = () => {
    setSuccessFeeAckAmount(Number(formData.successFeeAmount));
    setShowSuccessFeeWarn(false);
    setStepErrors({});
    if (pendingStepJump !== null) {
      setCurrentStep(pendingStepJump);
      setPendingStepJump(null);
    }
    if (pendingSaveAfterAck) {
      setPendingSaveAfterAck(false);
      void submitUpdate(flatFeeChanged);
    }
  };

  const cancelSuccessFeeWarn = () => {
    setShowSuccessFeeWarn(false);
    setPendingStepJump(null);
    setPendingSaveAfterAck(false);
  };

  const handleUpdate = async () => {
    if (!id || isViewMode) return;
    if (!runFullEditValidation()) return;

    // The Flat Referral Fee warning is acknowledged when leaving the Budget step.
    // Success Fees is the last edit step, so a still-unacknowledged enable/raise
    // is warned here before saving; confirming both acks and saves.
    if (needsSuccessFeeWarn) {
      setPendingSaveAfterAck(true);
      setShowSuccessFeeWarn(true);
      return;
    }

    await submitUpdate(flatFeeChanged);
  };

  const handleSubmit = async () => {
    if (!runFullCreateValidation()) return;

    if (!hasCalendar) {
      setIsCalendarModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    // Optional rich-text fields are "empty" when they have no visible text,
    // even if the editor emitted markup like "<p></p>" — send undefined then.
    const trimmedResponsibilities =
      richTextLength(formData.responsibilities) > 0
        ? formData.responsibilities.trim()
        : "";
    const trimmedBenefits =
      richTextLength(formData.benefits) > 0 ? formData.benefits.trim() : "";

    try {
      await api.recruitment.createJob({
        title: formData.title.trim(),
        description: formData.description.trim(),
        companyName: formData.companyName.trim(),
        requirements: formData.requirements.trim(),
        experienceLevel: formData.experienceLevel,
        industryId: Number(formData.industry),
        departmentId: Number(formData.department),
        salaryRangeMin: formData.salaryRangeMin,
        salaryRangeMax: formData.salaryRangeMax,
        salaryCurrency: formData.salaryCurrency,
        salaryRangeNotes: formData.salaryRangeNotes?.trim() || undefined,
        flatReferralAmount: formData.flatReferralAmount || undefined,
        requiredSkills: formData.requiredSkills,
        preferredSkills: formData.preferredSkills,
        workType: formData.workType,
        employmentType: formData.employmentType || undefined,
        location: formData.location.trim(),
        countries: formData.countries,
        responsibilities: trimmedResponsibilities || undefined,
        benefits: trimmedBenefits || undefined,
        salaryPeriod: formData.salaryPeriod || undefined,
        creationMethod: formData.creationMethod,
        sourceUrl: formData.sourceUrl || undefined,
        companyWebsite: formData.companyWebsite.trim() || undefined,
        hasSuccessFee: formData.hasSuccessFee,
        ...(formData.hasSuccessFee
          ? {
              successFeeAmount: formData.successFeeAmount,
              probationPeriodDays: formData.probationPeriodDays,
            }
          : {}),
        // Connector payout timing is independent of the success fee — always
        // sent. Internal values are re-derived from the org config server-side
        // when an admin default is set, regardless of what is submitted here.
        intPayoutWaits: formData.intPayoutWaits,
        extPayoutWaits: formData.extPayoutWaits,
        intConnectorPayoutWaitDays: formData.intPayoutWaits
          ? formData.intConnectorPayoutWaitDays || undefined
          : undefined,
        extConnectorPayoutWaitDays: formData.extPayoutWaits
          ? formData.extConnectorPayoutWaitDays || undefined
          : undefined,
        ...(formData.notifyUsers && formData.organisationIds.length > 0
          ? {
              notifyUsers: true,
              organisationIds: formData.organisationIds,
            }
          : {}),
        ...(formData.hasAssessment && formData.assessmentQuestions.length > 0
          ? {
              hasAssessment: true,
              assessmentQuestions: toAssessmentPayload(
                formData.assessmentQuestions
              ),
            }
          : {}),
      });
      clearDraft();
      toast({
        title: "Job posted successfully!",
        description:
          "Your job posting is now live. We're searching for matching candidates.",
      });
      navigate("/recruiting/my-job-posts");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to publish job post";

      toast({
        title: "Error Publishing Job",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepContent = renderPostJobWizardStepContent({
    logicalStep: resolveLogicalStep(currentStep),
    formData,
    updateFormData,
    totalSteps,
    setCurrentStep,
    setMethodExtractionBusy,
    stepErrors,
    clearStepError,
    updateStepFieldError,
    validationNonce,
    isEditMode,
    isViewMode,
    industries,
    departments,
    job,
  });

  const footerVariant = getPostJobWizardFooterVariant({
    currentStep,
    totalSteps,
    isViewMode,
    isEditMode,
  });

  // Loading state for edit mode
  if (isEditMode && (jobLoading || !editDataLoaded)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader message="Loading job details..." />
      </div>
    );
  }

  // Draft resume prompt (only for create mode)
  if (showDraftPrompt) {
    const draft = loadDraft();
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-brand-card">
          <RotateCcw className="mx-auto h-10 w-10 text-brand-amethyst" />
          <h2 className="text-xl font-extrabold text-foreground">
            Resume Draft?
          </h2>
          <p className="text-sm text-muted-foreground">
            You have an unsaved draft
            {draft?.formData.title ? ` for "${draft.formData.title}"` : ""}.
            Would you like to continue where you left off?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={startFresh}>
              Start Fresh
            </Button>
            <Button
              className="flex-1 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
              onClick={resumeDraft}
            >
              Resume Draft
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const logicalStep = resolveLogicalStep(currentStep);
  // In edit mode every step is backed by already-loaded job data, so all steps
  // are freely navigable. In create mode, allow up to the furthest step reached.
  const reachableStep = isEditMode ? totalSteps : maxStepReached;
  const isMethodStep = !isEditMode && logicalStep === "method";
  const isConfirmStep = logicalStep === "confirm";
  const showPreviewPanel = !isMethodStep && !isConfirmStep;
  // Confirm keeps the 3-column grid (preview column left empty) so the form
  // width matches the other steps instead of stretching wider.
  const useThreeColGrid = !isMethodStep;
  const isFirstStep = currentStep === 1;
  const hideContinue =
    isMethodStep &&
    (formData.creationMethod === "pdf" || formData.creationMethod === "url");
  const isPaymentContinueBlocked =
    !isViewMode && logicalStep === "payment" && !formData.hasPaymentMethod;
  const primaryButtonClass =
    "bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg";
  const wizardFooterButtonClass =
    "min-w-[7rem] flex-1 px-6 lg:flex-none lg:min-w-[7rem]";

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden">
      <SEO
        title={
          isViewMode
            ? "View Job | Prospectly"
            : isEditMode
              ? "Edit Job | Prospectly"
              : "Post a Job | Prospectly"
        }
      />

      {/* Scrollable content — internal scroll so the rail + preview can stick */}
      <div className="flex-1 overflow-y-auto max-lg:pb-[env(safe-area-inset-bottom)]">
        <div className="space-y-6 px-2 py-4 pb-6 sm:px-4 md:px-6 max-lg:pb-8">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-brand-gradient sm:text-3xl">
              {isViewMode
                ? "View Job Post"
                : isEditMode
                  ? "Edit Job"
                  : "Post New Job Requirement"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isViewMode
                ? "Review this job posting (read-only)"
                : isEditMode
                  ? "Update the editable fields for this job posting"
                  : "Choose the method that works best for you"}
            </p>
          </div>

          {/* Wizard layout: rail | form + footer | preview panel */}
          <div
            className={cn(
              "grid grid-cols-1 gap-5 lg:items-start",
              useThreeColGrid
                ? "lg:grid-cols-[264px_minmax(0,1fr)_300px]"
                : "lg:grid-cols-[264px_minmax(0,1fr)]"
            )}
          >
            <WizardStepRail
              steps={steps}
              currentStep={currentStep}
              maxStep={reachableStep}
              onStepSelect={(stepId) => {
                if (stepId > reachableStep) return;
                if (stepId !== currentStep && gateStepLeave(stepId)) return;
                setStepErrors({});
                setCurrentStep(stepId);
              }}
            />

            <div className="min-w-0">
              <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-brand-card">
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  {stepContent}
                </CardContent>
              </Card>

              {/* Footer navigation — sticky bottom bar on mobile, inline on desktop */}
              <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/95 px-3 py-3 shadow-brand-card backdrop-blur-xl sm:mt-6 max-lg:mb-[env(safe-area-inset-bottom)] lg:static lg:mb-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none lg:backdrop-blur-none">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFirstStep || methodExtractionBusy}
                  onClick={handleBack}
                  className={cn(
                    wizardFooterButtonClass,
                    isFirstStep && "max-lg:hidden lg:invisible"
                  )}
                >
                  Back
                </Button>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2 max-lg:pr-1 lg:flex-none">
                  {!isEditMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={methodExtractionBusy}
                      onClick={() => setShowResetConfirm(true)}
                      className={wizardFooterButtonClass}
                    >
                      Reset
                    </Button>
                  )}
                  {!hideContinue && footerVariant === "continue" ? (
                    <Button
                      size="sm"
                      onClick={handleNext}
                      disabled={isPaymentContinueBlocked}
                      title={
                        isPaymentContinueBlocked
                          ? "Save a payment method to continue"
                          : undefined
                      }
                      className={cn(
                        wizardFooterButtonClass,
                        primaryButtonClass
                      )}
                    >
                      Continue
                    </Button>
                  ) : null}
                  {!hideContinue && footerVariant === "view_back" ? (
                    <Button
                      size="sm"
                      onClick={() => navigate("/recruiting/my-job-posts")}
                      className={cn(
                        wizardFooterButtonClass,
                        primaryButtonClass
                      )}
                    >
                      Back to My Job Posts
                    </Button>
                  ) : null}
                  {!hideContinue && footerVariant === "edit_save" ? (
                    <Button
                      size="sm"
                      onClick={handleUpdate}
                      disabled={isSubmitting}
                      className={cn(
                        wizardFooterButtonClass,
                        "gap-2",
                        primaryButtonClass
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving
                          Changes...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" /> Save Changes
                        </>
                      )}
                    </Button>
                  ) : null}
                  {!hideContinue && footerVariant === "create_publish" ? (
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className={cn(
                        wizardFooterButtonClass,
                        "gap-2",
                        primaryButtonClass
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Posting
                          Job...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" /> Publish Job Post
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {showPreviewPanel && <WizardPreviewDrawer formData={formData} />}

            {isConfirmStep && (
              <div className="hidden lg:sticky lg:top-2 lg:block">
                <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-brand-card">
                  <div>
                    <h4 className="text-sm font-extrabold text-foreground">
                      Ready to publish?
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Your job goes live on the marketplace and we start
                      matching candidates.
                    </p>
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={cn("w-full gap-2", primaryButtonClass)}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Posting
                        Job...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" /> Publish Job Post
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Current Step?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all information in the current step. You will
              remain on this step to re-enter the data. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={resetCurrentStep}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Step
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fee-raise warning — generic, no live figures. Shown when HR leaves the
          Budget step with a raised Flat Referral Fee, since it may charge the
          card later for candidates already hired but not yet paid. */}
      <AlertDialog
        open={showFeeRaiseWarn}
        onOpenChange={(o) => {
          if (!o) cancelFeeRaiseWarn();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Increasing the referral fee?</AlertDialogTitle>
            <AlertDialogDescription>
              Raising the referral fee can add a charge to your card for
              candidates already hired but not yet paid, so their connector is
              paid at the new fee.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Sibling of the description (not inside its <p>) so the list is
              valid HTML and reads as scannable points. */}
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Only candidates already hired but not yet paid are affected.
            </li>
            <li>
              You&rsquo;re charged the difference when you release that payout —
              not now.
            </li>
            <li>
              You&rsquo;ll see the exact amount before it&rsquo;s charged.
            </li>
            <li>
              For example, raising the fee by $500 adds about $500 (plus
              processing) for each such candidate.
            </li>
          </ul>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelFeeRaiseWarn}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmFeeRaiseAndContinue}
              className="bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success-fee warning — generic, no live figures. Shown when HR enables or
          raises the Success Fee, since it may charge the card later for candidates
          already hired but whose bonus isn't yet released. */}
      <AlertDialog
        open={showSuccessFeeWarn}
        onOpenChange={(o) => {
          if (!o) cancelSuccessFeeWarn();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Updating the success fee?</AlertDialogTitle>
            <AlertDialogDescription>
              Adding or raising the success fee can add a charge to your card
              for candidates already hired but not yet paid, so they receive the
              new amount.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Only candidates already hired but not yet paid are affected.
            </li>
            <li>
              You&rsquo;re charged the difference when you release that bonus —
              not now.
            </li>
            <li>
              You&rsquo;ll see the exact amount before it&rsquo;s charged.
            </li>
            <li>The candidate always receives the latest success fee.</li>
          </ul>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSuccessFeeWarn}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSuccessFeeAndContinue}
              className="bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isCreateMode ? (
        <PostJobCalendarConnectModal
          open={isCalendarModalOpen}
          onOpenChange={setIsCalendarModalOpen}
        />
      ) : null}
    </main>
  );
}
