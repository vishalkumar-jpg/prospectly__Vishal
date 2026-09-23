import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { apiRequest } from "@/lib/api";
import { bountyAmountSchema } from "@/utils/validation";
import {
  formatIntegerWithCommas,
  parseFormattedInteger,
} from "@/lib/formatted-integer";
import { analytics } from "@/lib/analytics";

import {
  CalendarIcon,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Briefcase,
  Shield,
  Lock,
  Info,
  ArrowRight,
  Send,
  Star,
  Sparkles,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddPaymentMethodModal } from "./AddPaymentMethodModal";
import { ActiveRequestLimitModal } from "./ActiveRequestLimitModal";
import { MoveToMarketplaceDialog } from "./MoveToMarketplaceDialog";
import { PendingFeedbackWarningModal } from "./PendingFeedbackWarningModal";
import { PrivacySummarySection } from "./PrivacySummarySection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCalendarRequirement } from "@/hooks/useCalendarRequirement";
import { usePrimaryPaymentMethod } from "@/hooks/usePrimaryPaymentMethod";
import { api } from "@/lib/api";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntroductionPaymentFees } from "@/hooks/useIntroductionPaymentFees";
import { RequesterFeeBreakdown } from "./RequesterFeeBreakdown";
import { formatEscrowAuthorizationAmount } from "./introductionHelpers";

interface IntroductionFormContact {
  id?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company?: string;
  bounty_amount?: string | number;
  bountyAmount?: string | number;
  user_id?: string;
  quality_score?: number;
  profile_photo_url?: string | null;
  source?: "contacts" | "apollo";
}

interface IntroductionFormProps {
  contact: IntroductionFormContact | null;
  defaultBountyAmount: number;
  connectorCount?: number;
  onClose: () => void;
}

export interface CreateIntroductionRequestPayload {
  contactName: string;
  bountyAmount: number;
  meetingDescription: string;
  meetingTitle: string;
  additionalContext?: string | null;
  contactId?: string;
  contactOwnerId?: string;
  isUrgent: boolean;
  selectedPrivacyRuleIds?: string[];
}

type SuccessStatusColor = "emerald" | "blue" | "amber" | "rose";

function fireAndForgetAsync({
  action,
}: {
  action: () => void | Promise<void>;
}): void {
  Promise.resolve(action()).catch(() => undefined);
}

export type IntroductionSubmitValidationBlock =
  | { action: "toast"; title: string; description: string }
  | { action: "open_payment_modal" }
  | { action: "bounty_error"; message: string };

export type BountyAmountValidationResult = {
  nextBountyAmount: string | null;
  validationError: string;
};

function getContactFullName(contact: IntroductionFormContact): string {
  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
}

export function getSuccessStatusColor(pct: number): SuccessStatusColor {
  if (pct >= 75) return "emerald";
  if (pct >= 50) return "blue";
  if (pct >= 25) return "amber";
  return "rose";
}

export function computeSuccessPercentage(
  connectorEstimates: number[],
  bountyAmount: string
): number {
  if (!connectorEstimates.length) return 0;
  const currentBounty = parseFloat(bountyAmount) || 0;
  const count = connectorEstimates.filter((est) => est <= currentBounty).length;
  return Math.round((count / connectorEstimates.length) * 100);
}

function getBountySchemaErrorMessage(value: string, fallback: string): string {
  const result = bountyAmountSchema.safeParse(value);
  if (result.success) return "";
  return result.error.issues[0]?.message || fallback;
}

export function validateBountyAmountInput(
  value: string
): BountyAmountValidationResult {
  if (value === "" || value.replace(/,/g, "").trim() === "") {
    return {
      nextBountyAmount: "",
      validationError: getBountySchemaErrorMessage(
        "",
        "Please enter a referral payout amount."
      ),
    };
  }

  if (value.includes(".")) {
    return {
      nextBountyAmount: null,
      validationError:
        "Referral payout amount must be a whole number (no decimals allowed).",
    };
  }

  const numValue = parseFormattedInteger(value);
  if (numValue === null) {
    return {
      nextBountyAmount: null,
      validationError: "Please enter a valid number.",
    };
  }

  const next = String(numValue);

  if (numValue > 999999) {
    return {
      nextBountyAmount: null,
      validationError: "Referral payout amount cannot exceed $999,999.",
    };
  }

  return {
    nextBountyAmount: next,
    validationError: getBountySchemaErrorMessage(
      next,
      "Invalid referral payout amount"
    ),
  };
}

interface IntroductionSubmitValidationParams {
  currentUser: { id: number } | null | undefined;
  hasPendingFeedback: boolean;
  pendingFeedbackCount: number;
  hasReachedLimit: boolean;
  activeRequestCount: number;
  activeRequestLimit: number;
  hasCalendar: boolean;
  hasPaymentMethods: boolean;
  meetingTitle: string;
  meetingDescription: string;
  bountyAmount: string;
}

export function getIntroductionSubmitValidationError(
  params: IntroductionSubmitValidationParams
): IntroductionSubmitValidationBlock | null {
  if (!params.currentUser) {
    return {
      action: "toast",
      title: "Authentication Required",
      description: "Please sign in to request introductions.",
    };
  }

  if (params.hasPendingFeedback) {
    const suffix = params.pendingFeedbackCount > 1 ? "s" : "";
    return {
      action: "toast",
      title: "Complete Pending Feedback",
      description: `You have ${params.pendingFeedbackCount} pending feedback request${suffix} that must be completed before making new introduction requests.`,
    };
  }

  if (params.hasReachedLimit) {
    return {
      action: "toast",
      title: "Active Request Limit Reached",
      description: `You've reached your active introduction requests limit (${params.activeRequestCount}/${params.activeRequestLimit}). Please upgrade your subscription plan to create more active introduction requests.`,
    };
  }

  if (!params.hasCalendar) {
    return {
      action: "toast",
      title: "Calendar Connection Required",
      description:
        "Please connect your calendar before sending introduction requests.",
    };
  }

  if (!params.hasPaymentMethods) {
    return { action: "open_payment_modal" };
  }

  if (!params.meetingTitle.trim()) {
    return {
      action: "toast",
      title: "Missing Information",
      description: "Please enter a meeting title.",
    };
  }

  if (!params.meetingDescription.trim()) {
    return {
      action: "toast",
      title: "Missing Information",
      description: "Please enter a meeting description.",
    };
  }

  const bountyValidation = bountyAmountSchema.safeParse(params.bountyAmount);
  if (!bountyValidation.success) {
    const firstError = bountyValidation.error.issues[0];
    return {
      action: "bounty_error",
      message: firstError?.message || "Invalid referral payout amount",
    };
  }

  return null;
}

interface BuildCreateIntroductionPayloadParams {
  contact: IntroductionFormContact;
  bountyAmount: string;
  meetingTitle: string;
  meetingDescription: string;
  notes: string;
  isUrgent: boolean;
  selectedPrivacyRuleIds: string[];
}

export function buildCreateIntroductionPayload(
  params: BuildCreateIntroductionPayloadParams
): CreateIntroductionRequestPayload {
  const contactOwnerId = params.contact.user_id || null;
  const requestPayload: CreateIntroductionRequestPayload = {
    contactName: getContactFullName(params.contact),
    bountyAmount: parseFloat(params.bountyAmount) || 0,
    meetingDescription: params.meetingDescription,
    meetingTitle: params.meetingTitle.trim(),
    additionalContext: params.notes.trim() || null,
    contactId: params.contact.id ? String(params.contact.id) : undefined,
    contactOwnerId: contactOwnerId || undefined,
    isUrgent: params.isUrgent,
  };

  if (params.selectedPrivacyRuleIds.length > 0) {
    requestPayload.selectedPrivacyRuleIds = params.selectedPrivacyRuleIds;
  }

  return requestPayload;
}

export function applyIntroductionSubmitValidationBlock(
  block: IntroductionSubmitValidationBlock,
  handlers: {
    toast: ReturnType<typeof useToast>["toast"];
    setShowPaymentMethodModal: (open: boolean) => void;
    setBountyValidationError: (error: string) => void;
  }
): void {
  if (block.action === "toast") {
    handlers.toast({
      title: block.title,
      description: block.description,
      variant: "destructive",
    });
    return;
  }
  if (block.action === "open_payment_modal") {
    handlers.setShowPaymentMethodModal(true);
    return;
  }
  handlers.setBountyValidationError(block.message);
}

interface SubmitIntroductionRequestParams {
  contact: IntroductionFormContact;
  bountyAmount: string;
  meetingTitle: string;
  meetingDescription: string;
  notes: string;
  isUrgent: boolean;
  selectedPrivacyRuleIds: string[];
  onClose: () => void;
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>["toast"];
}

export async function submitIntroductionRequest(
  params: SubmitIntroductionRequestParams
): Promise<void> {
  const fullName = getContactFullName(params.contact);
  const contactOwnerId = params.contact.user_id || null;

  if (!params.contact.id && !contactOwnerId) {
    params.toast({
      title: "Cannot Send Request",
      description:
        "This contact doesn't have an owner assigned yet. You can't request an introduction until an owner is set.",
      variant: "destructive",
    });
    return;
  }

  const requestPayload = buildCreateIntroductionPayload({
    contact: params.contact,
    bountyAmount: params.bountyAmount,
    meetingTitle: params.meetingTitle,
    meetingDescription: params.meetingDescription,
    notes: params.notes,
    isUrgent: params.isUrgent,
    selectedPrivacyRuleIds: params.selectedPrivacyRuleIds,
  });

  await apiRequest("/introduction-requests/create-with-payment", {
    method: "POST",
    body: JSON.stringify(requestPayload),
  });

  analytics.trackIntroRequested({
    bountyId: params.contact.id ? String(params.contact.id) : "",
    requestType: "direct",
    targetType: "contact",
    hasReward: (parseFloat(params.bountyAmount) || 0) > 0,
  });

  params.toast({
    title: "Request Sent!",
    description: `Your introduction request to ${fullName} has been sent to the contact owner. Payment has been authorized and will be held in escrow.`,
  });

  params.onClose();
  params.navigate("/prospecting/my-prospects");
}

export async function handleIntroductionSubmitError(
  error: unknown,
  handlers: {
    toast: ReturnType<typeof useToast>["toast"];
    setActiveRequestCount: (count: number) => void;
    setActiveRequestLimit: (limit: number) => void;
    setHasReachedLimit: (reached: boolean) => void;
    setShowLimitModal: (open: boolean) => void;
  }
): Promise<void> {
  const errorMessage =
    error instanceof Error
      ? error.message
      : "Failed to submit request. Please try again.";

  handlers.toast({
    title: "Error",
    description: errorMessage,
    variant: "destructive",
  });

  const isLimitError =
    errorMessage.toLowerCase().includes("active introduction limit") ||
    errorMessage.toLowerCase().includes("reached your active");

  if (!isLimitError) return;

  try {
    const limitData = await api.introductions.getActiveCount();
    handlers.setActiveRequestCount(limitData.current);
    handlers.setActiveRequestLimit(limitData.limit);
    handlers.setHasReachedLimit(true);
    handlers.setShowLimitModal(true);
  } catch {
    // Toast already shown above
  }
}

function useIntroductionFormState({
  contact,
  defaultBountyAmount,
  connectorCount = 0,
  onClose,
}: IntroductionFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bountyAmount, setBountyAmount] = useState(
    defaultBountyAmount.toString()
  );
  const paymentFees = useIntroductionPaymentFees(bountyAmount);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedPrivacyRuleIds, setSelectedPrivacyRuleIds] = useState<
    string[]
  >([]);
  const [bountyValidationError, setBountyValidationError] =
    useState<string>("");

  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showPendingFeedbackModal, setShowPendingFeedbackModal] =
    useState(false);
  const [showMarketplaceConfirmation, setShowMarketplaceConfirmation] =
    useState(false);

  const [hasPendingFeedback, setHasPendingFeedback] = useState(false);
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);
  const [isCheckingFeedback, setIsCheckingFeedback] = useState(true);

  const [activeRequestCount, setActiveRequestCount] = useState(0);
  const [activeRequestLimit, setActiveRequestLimit] = useState(1);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const [isCheckingLimit, setIsCheckingLimit] = useState(true);

  const [connectorEstimates, setConnectorEstimates] = useState<number[]>([]);
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);

  const { hasCalendar, loading: calendarLoading } = useCalendarRequirement();

  const {
    primaryPaymentMethod,
    hasPaymentMethods,
    loading: paymentLoading,
    fetchPrimaryPaymentMethod: fetchPaymentMethods,
  } = usePrimaryPaymentMethod();

  useEffect(() => {
    setBountyAmount(defaultBountyAmount.toString());
    setMeetingTitle("");
    setMeetingDescription("");
    setNotes("");
    setIsUrgent(false);
    setBountyValidationError("");
  }, [defaultBountyAmount]);

  useEffect(() => {
    async function checkPendingFeedback() {
      if (!currentUser?.id) {
        setIsCheckingFeedback(false);
        return;
      }

      setIsCheckingFeedback(true);

      try {
        const data = await apiRequest<
          Array<{ pending_count: number; pending_request_ids: string[] }>
        >("/introduction-requests/check-pending-feedback");

        if (data && Array.isArray(data) && data.length > 0) {
          const feedbackData = data[0] as { pending_count: number };
          const hasPending = feedbackData.pending_count > 0;
          setHasPendingFeedback(hasPending);
          setPendingFeedbackCount(feedbackData.pending_count);
          if (hasPending) {
            setShowPendingFeedbackModal(true);
          }
        } else {
          setHasPendingFeedback(false);
          setPendingFeedbackCount(0);
          setShowPendingFeedbackModal(false);
        }
      } catch {
        setHasPendingFeedback(false);
        setPendingFeedbackCount(0);
      } finally {
        setIsCheckingFeedback(false);
      }
    }

    checkPendingFeedback();
  }, [currentUser?.id]);

  useEffect(() => {
    async function checkActiveLimit() {
      if (!currentUser?.id) {
        return;
      }

      setIsCheckingLimit(true);

      try {
        const data = await api.introductions.getActiveCount();
        setActiveRequestCount(data.current);
        setActiveRequestLimit(data.limit);
        const reachedLimit = data.current >= data.limit;
        setHasReachedLimit(reachedLimit);
        if (reachedLimit) {
          setShowLimitModal(true);
        }
      } catch {
        setHasReachedLimit(false);
        setActiveRequestCount(0);
        setActiveRequestLimit(1);
      } finally {
        setIsCheckingLimit(false);
      }
    }

    checkActiveLimit();
  }, [currentUser?.id]);

  useEffect(() => {
    async function fetchEstimates() {
      if (!contact?.id || !connectorCount) {
        setConnectorEstimates([]);
        return;
      }

      setIsLoadingEstimates(true);
      try {
        const response = await apiRequest(
          `/introduction-potential-connectors/${contact.id}/estimates`
        );
        if (
          response &&
          response.successPercentage &&
          Array.isArray(response.successPercentage)
        ) {
          setConnectorEstimates(response.successPercentage);
        } else {
          setConnectorEstimates([]);
        }
      } catch {
        setConnectorEstimates([]);
        toast({
          title: "Couldn't load connector estimates",
          description:
            "Estimate data is unavailable right now. You can still submit your request.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingEstimates(false);
      }
    }

    fetchEstimates();
  }, [contact?.id, connectorCount]);

  const successPercentage = useMemo(
    () => computeSuccessPercentage(connectorEstimates, bountyAmount),
    [connectorEstimates, bountyAmount]
  );

  const statusColor = getSuccessStatusColor(successPercentage);

  const handleBountyAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { nextBountyAmount, validationError } = validateBountyAmountInput(
      e.target.value
    );
    if (nextBountyAmount !== null) {
      setBountyAmount(nextBountyAmount);
    }
    setBountyValidationError(validationError);
  };

  const handleSubmit = async () => {
    const validationBlock = getIntroductionSubmitValidationError({
      currentUser,
      hasPendingFeedback,
      pendingFeedbackCount,
      hasReachedLimit,
      activeRequestCount,
      activeRequestLimit,
      hasCalendar,
      hasPaymentMethods,
      meetingTitle,
      meetingDescription,
      bountyAmount,
    });

    if (validationBlock) {
      applyIntroductionSubmitValidationBlock(validationBlock, {
        toast,
        setShowPaymentMethodModal,
        setBountyValidationError,
      });
      return;
    }

    setBountyValidationError("");
    setIsSubmitting(true);

    try {
      if (!contact) return;
      await submitIntroductionRequest({
        contact,
        bountyAmount,
        meetingTitle,
        meetingDescription,
        notes,
        isUrgent,
        selectedPrivacyRuleIds,
        onClose,
        navigate,
        toast,
      });
    } catch (error: unknown) {
      await handleIntroductionSubmitError(error, {
        toast,
        setActiveRequestCount,
        setActiveRequestLimit,
        setHasReachedLimit,
        setShowLimitModal,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrimaryActionClick = () => {
    if (!hasCalendar) {
      onClose();
      navigate("/getting-started?step=2");
      return;
    }
    if (!hasPaymentMethods) {
      setShowPaymentMethodModal(true);
      return;
    }
    if (connectorEstimates?.length === 0) {
      setShowMarketplaceConfirmation(true);
      return;
    }
    fireAndForgetAsync({ action: handleSubmit });
  };

  return {
    navigate,
    currentUser,
    onClose,
    connectorCount,
    isSubmitting,
    bountyAmount,
    paymentFees,
    meetingTitle,
    setMeetingTitle,
    meetingDescription,
    setMeetingDescription,
    notes,
    setNotes,
    isUrgent,
    setIsUrgent,
    selectedPrivacyRuleIds,
    setSelectedPrivacyRuleIds,
    bountyValidationError,
    showPaymentMethodModal,
    setShowPaymentMethodModal,
    showLimitModal,
    setShowLimitModal,
    showPendingFeedbackModal,
    setShowPendingFeedbackModal,
    showMarketplaceConfirmation,
    setShowMarketplaceConfirmation,
    hasPendingFeedback,
    pendingFeedbackCount,
    isCheckingFeedback,
    activeRequestCount,
    activeRequestLimit,
    hasReachedLimit,
    isCheckingLimit,
    connectorEstimates,
    isLoadingEstimates,
    hasCalendar,
    calendarLoading,
    primaryPaymentMethod,
    hasPaymentMethods,
    paymentLoading,
    fetchPaymentMethods,
    successPercentage,
    statusColor,
    handleBountyAmountChange,
    handleSubmit,
    handlePrimaryActionClick,
  };
}

type IntroductionFormBodyProps = {
  contact: IntroductionFormContact;
} & ReturnType<typeof useIntroductionFormState>;

type IntroductionFormBodyView =
  | "loading"
  | "calendar"
  | "status-loading"
  | "form";

function getIntroductionFormBodyView({
  isCheckingLimit,
  isCheckingFeedback,
  hasReachedLimit,
  hasCalendar,
  calendarLoading,
  hasPendingFeedback,
}: {
  isCheckingLimit: boolean;
  isCheckingFeedback: boolean;
  hasReachedLimit: boolean;
  hasCalendar: boolean;
  calendarLoading: boolean;
  hasPendingFeedback: boolean;
}): IntroductionFormBodyView {
  if ((isCheckingLimit || isCheckingFeedback) && !hasReachedLimit) {
    return "loading";
  }
  if (
    !hasCalendar &&
    !calendarLoading &&
    !hasPendingFeedback &&
    !hasReachedLimit
  ) {
    return "calendar";
  }
  if (calendarLoading || hasReachedLimit) {
    return "status-loading";
  }
  return "form";
}

function IntroductionFormSubmitButtonLabel({
  hasCalendar,
  calendarLoading,
  hasPaymentMethods,
  hasReachedLimit,
  activeRequestCount,
  activeRequestLimit,
  isSubmitting,
}: {
  hasCalendar: boolean;
  calendarLoading: boolean;
  hasPaymentMethods: boolean;
  hasReachedLimit: boolean;
  activeRequestCount: number;
  activeRequestLimit: number;
  isSubmitting: boolean;
}) {
  if (!hasCalendar && !calendarLoading) {
    return (
      <>
        <Lock className="h-4 w-4 mr-2" />
        Connect Calendar First
      </>
    );
  }
  if (!hasPaymentMethods) {
    return (
      <>
        <CreditCard className="h-4 w-4 mr-2" />
        Add Payment & Seek Intro
      </>
    );
  }
  if (hasReachedLimit) {
    return (
      <>
        <AlertCircle className="h-4 w-4 mr-2" />
        Limit Reached ({activeRequestCount}/{activeRequestLimit})
      </>
    );
  }
  if (isSubmitting) {
    return (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Sending Request...
      </>
    );
  }
  return (
    <>
      <Send className="h-4 w-4 mr-2" />
      Send Introduction Request
      <ArrowRight className="h-4 w-4 ml-2" />
    </>
  );
}

function IntroductionFormCalendarWarning({
  fullName,
  contactPhotoUrl,
  contact,
  onClose,
  navigate,
}: {
  fullName: string;
  contactPhotoUrl: string | null;
  contact: IntroductionFormContact;
  onClose: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="space-y-4 py-4">
      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <CalendarIcon className="h-5 w-5 text-amber-600" />
        <AlertDescription className="text-amber-900 dark:text-amber-100">
          <div className="space-y-3">
            <p className="font-semibold text-lg">
              Calendar Connection Required
            </p>
            <p className="text-sm">
              Before sending introduction requests, you need to connect your
              calendar so prospects can easily book meetings with you. This only
              takes 2 minutes.
            </p>

            <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
                You're requesting introduction to:
              </p>
              <div className="flex items-center gap-3">
                <PremiumAvatar
                  name={fullName}
                  size="sm"
                  imageUrl={contactPhotoUrl}
                />
                <div>
                  <p className="font-bold text-foreground">{fullName}</p>
                  {contact.title && (
                    <p className="text-sm text-muted-foreground">
                      {contact.title}
                    </p>
                  )}
                  {contact.company && (
                    <p className="text-sm text-muted-foreground">
                      {contact.company}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                variant="default"
                size="lg"
                onClick={() => {
                  navigate("/getting-started?step=2");
                }}
                className="gap-2 flex-1"
              >
                <CalendarIcon className="h-4 w-4" />
                Connect Calendar Now (2 min)
              </Button>
              <Button variant="outline" size="lg" onClick={onClose}>
                Cancel
              </Button>
            </div>

            <p className="text-xs text-center text-amber-700 dark:text-amber-300 mt-2">
              After connecting your calendar, you can return here to complete
              your request
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function IntroductionFormBody({
  contact,
  onClose,
  connectorCount,
  isSubmitting,
  bountyAmount,
  paymentFees,
  meetingTitle,
  setMeetingTitle,
  meetingDescription,
  setMeetingDescription,
  notes,
  setNotes,
  isUrgent,
  setIsUrgent,
  setSelectedPrivacyRuleIds,
  bountyValidationError,
  showPaymentMethodModal,
  setShowPaymentMethodModal,
  showLimitModal,
  setShowLimitModal,
  showPendingFeedbackModal,
  setShowPendingFeedbackModal,
  showMarketplaceConfirmation,
  setShowMarketplaceConfirmation,
  hasPendingFeedback,
  pendingFeedbackCount,
  isCheckingFeedback,
  activeRequestCount,
  activeRequestLimit,
  hasReachedLimit,
  isCheckingLimit,
  connectorEstimates,
  isLoadingEstimates,
  hasCalendar,
  calendarLoading,
  primaryPaymentMethod,
  hasPaymentMethods,
  paymentLoading,
  fetchPaymentMethods,
  successPercentage,
  statusColor,
  handleBountyAmountChange,
  handleSubmit,
  handlePrimaryActionClick,
  currentUser,
  navigate,
}: IntroductionFormBodyProps) {
  const fullName = getContactFullName(contact);

  const contactPhotoUrl = contact?.profile_photo_url || null;

  const bodyView = getIntroductionFormBodyView({
    isCheckingLimit,
    isCheckingFeedback,
    hasReachedLimit,
    hasCalendar,
    calendarLoading,
    hasPendingFeedback,
  });

  const statusLoadingMessage = hasReachedLimit
    ? "Checking availability..."
    : "Checking calendar status...";

  return (
    <>
      <div className="px-6 pb-6 pt-0">
        {bodyView === "loading" ? (
          <Loader message="Loading..." className="py-8" />
        ) : null}
        {bodyView === "calendar" ? (
          <IntroductionFormCalendarWarning
            fullName={fullName}
            contactPhotoUrl={contactPhotoUrl}
            contact={contact}
            onClose={onClose}
            navigate={navigate}
          />
        ) : null}
        {bodyView === "status-loading" ? (
          <Loader message={statusLoadingMessage} className="py-8" />
        ) : null}
        {bodyView === "form" ? (
          <div className="space-y-2.5">
            {/* Marketplace Visibility Disclosure */}
            {!connectorCount && (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <Eye className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                  This request will be visible to all marketplace users who can
                  view the details you enter below.
                </AlertDescription>
              </Alert>
            )}

            {/* Minimal Profile Header - matches Step 1 hero style */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 px-4 py-2.5 rounded-lg">
              <div className="flex items-center gap-3">
                <PremiumAvatar
                  size="sm"
                  imageUrl={contactPhotoUrl}
                  name={fullName}
                  showPurpleRing={false}
                  fallbackBgColor="bg-violet-100"
                  fallbackTextColor="text-violet-700"
                />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                    {fullName}
                  </h3>
                  {(contact?.title || contact?.company) && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <span className="truncate">
                        {contact.title}
                        {contact.title && contact.company ? " at " : ""}
                        {contact.company}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <div className="bg-violet-100 dark:bg-violet-900/30 rounded-lg px-3 py-1.5 text-center border border-violet-200 dark:border-violet-800 min-w-[100px]">
                    {paymentFees.recalculating ? (
                      <Skeleton className="h-7 w-16 mx-auto" />
                    ) : (
                      <p className="text-xl font-extrabold text-violet-700 dark:text-violet-300">
                        $
                        {Number(bountyAmount || 0).toLocaleString(undefined, {
                          minimumFractionDigits:
                            Number(bountyAmount || 0) % 1 === 0 ? 0 : 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                    <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-0.5">
                      Referral Payout
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 1: Bounty + Acceptance Probability side by side */}
            <div className="grid md:grid-cols-2 gap-3">
              <div
                className={cn(!connectorEstimates?.length && "md:col-span-2")}
              >
                {/* Referral Payout Input */}
                <Card
                  className={cn(
                    "border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-md"
                  )}
                >
                  <CardContent className="p-3 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-foreground">
                                Set Referral Payout
                              </h4>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="p-0.5 hover:bg-muted rounded-full cursor-help transition-colors">
                                      <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-xs p-3"
                                  >
                                    <div className="space-y-2 text-xs">
                                      <p className="font-bold border-b pb-1">
                                        Escrow Protection
                                      </p>
                                      <ul className="list-disc pl-4 space-y-1 opacity-90">
                                        <li>
                                          Funds are released only as milestones
                                          are met
                                        </li>
                                        <li>
                                          Full protection for both parties
                                          involved
                                        </li>
                                        <li>
                                          No transaction occurs until intro is
                                          accepted
                                        </li>
                                      </ul>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                              Amount held in escrow
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div className="space-y-2 mb-3">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-focus-within:opacity-20 transition-opacity duration-500" />
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 group-focus-within:text-primary transition-colors" />
                            <Input
                              id="bounty-amount"
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              value={
                                bountyAmount === ""
                                  ? ""
                                  : formatIntegerWithCommas(
                                      Number(bountyAmount) || 0
                                    )
                              }
                              onChange={handleBountyAmountChange}
                              onKeyDown={(e) => {
                                if (["-", "e", "E", "+", "."].includes(e.key))
                                  e.preventDefault();
                              }}
                              className={cn(
                                "pl-11 h-10 text-base font-bold border focus-visible:ring-offset-0 transition-all shadow-sm",
                                bountyValidationError
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : "hover:border-primary/40 focus:border-primary shadow-sm"
                              )}
                              data-testid="input-bounty-amount"
                            />
                          </div>
                        </div>
                        {bountyValidationError && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive px-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {bountyValidationError}
                          </div>
                        )}
                      </div>

                      <RequesterFeeBreakdown
                        referralPayout={paymentFees.bountyAmount}
                        providerFee={paymentFees.providerFee}
                        processingFee={paymentFees.processingFee}
                        totalAmount={paymentFees.totalAmount}
                        initialChargeAmount={paymentFees.initialChargeAmount}
                        remainingChargeAmount={
                          paymentFees.remainingChargeAmount
                        }
                        recalculating={paymentFees.recalculating}
                      />
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 opacity-60">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        SECURE ESCROW PAYMENT
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Acceptance Probability */}
              {connectorCount > 0 && (
                <Card
                  className={cn(
                    "border-2 transition-all duration-500 shadow-md",
                    statusColor === "emerald"
                      ? "border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 via-background to-background dark:from-emerald-950/20"
                      : statusColor === "blue"
                        ? "border-blue-500/20 bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/20"
                        : statusColor === "amber"
                          ? "border-amber-500/20 bg-gradient-to-br from-amber-50/50 via-background to-background dark:from-amber-950/20"
                          : "border-rose-500/20 bg-gradient-to-br from-rose-50/50 via-background to-background dark:from-rose-950/20"
                  )}
                >
                  <CardContent className="p-3 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "p-1 rounded-lg transition-colors duration-500",
                              statusColor === "emerald"
                                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-emerald-50 dark:text-emerald-400"
                                : statusColor === "blue"
                                  ? "bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-blue-50 dark:text-blue-400"
                                  : statusColor === "amber"
                                    ? "bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-amber-50 dark:text-amber-400"
                                    : "bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-rose-50 dark:text-rose-400"
                            )}
                          >
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-foreground">
                                Intro Acceptance Probability
                              </h4>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-foreground cursor-help transition-colors" />
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-[240px] p-3"
                                  >
                                    <p className="text-xs leading-relaxed">
                                      This calculates the likelihood of your
                                      request being accepted by comparing your
                                      referral payout to the benchmarks set by
                                      available connectors.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                              Matching with connector expectations
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        {isLoadingEstimates ? (
                          <Loader
                            message="Analyzing connectors..."
                            size="sm"
                            className="py-3"
                          />
                        ) : (
                          <div className="relative group cursor-default">
                            {/* Glow Effect */}
                            <div
                              className={cn(
                                "absolute inset-0 blur-2xl opacity-20 transition-all duration-700",
                                statusColor === "emerald"
                                  ? "bg-emerald-500"
                                  : statusColor === "blue"
                                    ? "bg-blue-500"
                                    : statusColor === "amber"
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                              )}
                            />

                            <div className="relative flex items-center justify-center">
                              <svg className="w-[72px] h-[72px] transform -rotate-90">
                                {/* Track */}
                                <circle
                                  cx="36"
                                  cy="36"
                                  r="30"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="transparent"
                                  className="text-slate-100 dark:text-slate-800/50"
                                />
                                {/* Progress */}
                                <circle
                                  cx="36"
                                  cy="36"
                                  r="30"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="transparent"
                                  strokeDasharray={2 * Math.PI * 30}
                                  strokeDashoffset={
                                    2 *
                                    Math.PI *
                                    30 *
                                    (1 - successPercentage / 100)
                                  }
                                  strokeLinecap="round"
                                  className={cn(
                                    "transition-all duration-1000 ease-out",
                                    statusColor === "emerald"
                                      ? "text-emerald-500"
                                      : statusColor === "blue"
                                        ? "text-blue-500"
                                        : statusColor === "amber"
                                          ? "text-amber-500"
                                          : "text-rose-500"
                                  )}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center flex-col gap-0.5">
                                <span
                                  className={cn(
                                    "text-sm font-black leading-none transition-colors duration-500",
                                    statusColor === "emerald"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : statusColor === "blue"
                                        ? "text-blue-600 dark:text-blue-400"
                                        : statusColor === "amber"
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-rose-600 dark:text-rose-400"
                                  )}
                                >
                                  {successPercentage}%
                                </span>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase leading-none">
                                  {successPercentage >= 75
                                    ? "Optimal"
                                    : successPercentage >= 50
                                      ? "Good"
                                      : successPercentage >= 25
                                        ? "Fair"
                                        : "Low"}
                                </span>
                              </div>
                            </div>
                            <p className="text-center text-[11px] font-semibold text-muted-foreground mt-1">
                              Matches{" "}
                              <span className="text-foreground">
                                {connectorEstimates.length > 0
                                  ? connectorEstimates.filter(
                                      (est) =>
                                        est <= (parseFloat(bountyAmount) || 0)
                                    ).length
                                  : 0}
                              </span>{" "}
                              of{" "}
                              <span className="text-foreground">
                                {connectorEstimates.length}
                              </span>{" "}
                              connector
                              {connectorEstimates.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isLoadingEstimates &&
                      (parseFloat(bountyAmount) || 0) > 0 &&
                      connectorEstimates.length > 0 && (
                        <div
                          className={cn(
                            "mt-2 p-2 rounded-xl border flex gap-2 items-start transition-all duration-500",
                            statusColor === "emerald"
                              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-800 hover:bg-emerald-800 hover:text-emerald-50 dark:text-emerald-300"
                              : statusColor === "blue"
                                ? "bg-blue-500/5 border-blue-500/20 text-blue-800 hover:bg-blue-800 hover:text-blue-50 dark:text-blue-300"
                                : statusColor === "amber"
                                  ? "bg-amber-500/5 border-amber-500/20 text-amber-800 hover:bg-amber-800 hover:text-amber-50 dark:text-amber-300"
                                  : "bg-rose-500/5 border-rose-500/20 text-rose-800 hover:bg-rose-800 hover:text-rose-50 dark:text-rose-300"
                          )}
                        >
                          {statusColor === "emerald" ||
                          statusColor === "blue" ? (
                            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 opacity-80" />
                          ) : (
                            <Info className="h-4 w-4 mt-0.5 shrink-0 opacity-80" />
                          )}
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold leading-none">
                              {successPercentage >= 75
                                ? "Optimal Match"
                                : successPercentage >= 50
                                  ? "Strong Choice"
                                  : successPercentage >= 25
                                    ? "Fair Match"
                                    : "Low Visibility"}
                            </p>
                            <p className="text-[11px] leading-relaxed opacity-90 font-medium">
                              {successPercentage === 100
                                ? "Your payout meets top expectations — maximum priority and interest."
                                : successPercentage >= 75
                                  ? "Well above average — highly attractive to active connectors."
                                  : successPercentage >= 50
                                    ? "Aligns with expectations — healthy response rate expected."
                                    : successPercentage >= 25
                                      ? "Below benchmark — responses may take longer."
                                      : "Consider increasing to attract reliable connectors."}
                            </p>
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Urgent Request Checkbox */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="is-urgent"
                checked={isUrgent}
                onCheckedChange={(checked) => setIsUrgent(checked === true)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="is-urgent"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Is this request urgent?
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                          onClick={(e) => e.preventDefault()}
                        >
                          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          Marking this as urgent will highlight the request to
                          connectors, helping them prioritize and respond faster
                          to time-sensitive opportunities.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connectors will see this request highlighted and prioritized
                  in their inbox
                </p>
              </div>
            </div>

            {/* Meeting Details - Full Width */}
            <Card className="border-2 border-border bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold">Meeting Details</h4>
                </div>

                {/* Meeting Title */}
                <div className="space-y-2">
                  <Label
                    htmlFor="meeting-title"
                    className="text-sm font-medium"
                  >
                    Meeting Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="meeting-title"
                    placeholder="e.g., Partnership Discussion, Product Demo"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    className="h-9 border-2"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific about the meeting purpose
                  </p>
                </div>

                {/* Meeting Description */}
                <div className="space-y-2">
                  <Label
                    htmlFor="meeting-description"
                    className="text-sm font-medium"
                  >
                    Meeting Description{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="meeting-description"
                    placeholder="Describe the purpose and agenda of the meeting..."
                    value={meetingDescription}
                    onChange={(e) => setMeetingDescription(e.target.value)}
                    className="min-h-20 resize-none border-2"
                    maxLength={1000}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      Include key topics and expected outcomes
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {meetingDescription.length}/1000
                    </p>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Additional Context{" "}
                    <Badge variant="outline" className="ml-2 text-xs">
                      Optional
                    </Badge>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="e.g., 'We met at TechCrunch 2023' or 'Both alumni of Stanford GSB'..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-16 resize-none border-2"
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      Mutual connections or relevant background
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {notes.length}/500
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Full width below: Payment + Privacy */}
            {/* Two-column layout: Payment Protection & Payment Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* Payment Protection - Compact */}
              <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-50 via-blue-50/50 to-background dark:from-blue-950/30 dark:via-blue-950/20 dark:to-background shadow-md">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg">
                      <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 flex items-center gap-1.5">
                        Payment Protection Guarantee
                        <Lock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-[11px] text-blue-900 dark:text-blue-100">
                        <span className="font-semibold">No charge now</span> —
                        authorization only
                      </p>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-[11px] text-blue-900 dark:text-blue-100">
                        <span className="font-semibold">
                          Charged when accepted
                        </span>{" "}
                        by owner
                      </p>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-[11px] text-blue-900 dark:text-blue-100">
                        <span className="font-semibold">Secure escrow</span>{" "}
                        protection
                      </p>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-[11px] text-blue-900 dark:text-blue-100">
                        <span className="font-semibold">Milestone-based</span>{" "}
                        payment capture
                      </p>
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="flex items-center justify-center gap-3 mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-white dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                    >
                      <Lock className="h-2.5 w-2.5 mr-1" />
                      256-bit Encryption
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-white dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                    >
                      <Shield className="h-2.5 w-2.5 mr-1" />
                      PCI Compliant
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card className="border-2 border-primary/20 overflow-hidden bg-gradient-to-br from-background to-muted/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <CreditCard className="h-4 w-4 text-primary" />
                      </div>
                      <Label className="text-sm font-semibold">
                        Payment Method
                      </Label>
                    </div>
                  </div>

                  {paymentLoading ? (
                    <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg border-2 border-dashed">
                      <Loader message="Loading payment method..." size="sm" />
                    </div>
                  ) : primaryPaymentMethod ? (
                    <div className="space-y-2">
                      {/* Compact Payment Card */}
                      <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30">
                        {/* Brand color square */}
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg text-white flex-shrink-0",
                            primaryPaymentMethod.brand.toLowerCase() ===
                              "visa" && "bg-blue-600",
                            primaryPaymentMethod.brand.toLowerCase() ===
                              "mastercard" && "bg-orange-500",
                            primaryPaymentMethod.brand.toLowerCase() ===
                              "amex" && "bg-teal-600",
                            primaryPaymentMethod.brand.toLowerCase() ===
                              "discover" && "bg-amber-600",
                            ![
                              "visa",
                              "mastercard",
                              "amex",
                              "discover",
                            ].includes(
                              primaryPaymentMethod.brand.toLowerCase()
                            ) && "bg-gray-600"
                          )}
                        >
                          <CreditCard className="h-5 w-5" />
                        </div>
                        {/* Card details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {primaryPaymentMethod.brand} ••••{" "}
                            {primaryPaymentMethod.last4}
                          </p>
                          <p
                            className={cn(
                              "text-xs text-muted-foreground",
                              primaryPaymentMethod.isExpired && "text-red-500"
                            )}
                          >
                            Expires{" "}
                            {String(primaryPaymentMethod.expMonth).padStart(
                              2,
                              "0"
                            )}
                            /{primaryPaymentMethod.expYear}
                          </p>
                        </div>
                        {/* Primary badge */}
                        {primaryPaymentMethod.isPrimary && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20"
                          >
                            <Star className="h-2.5 w-2.5 mr-1 fill-amber-500" />
                            Primary
                          </Badge>
                        )}
                      </div>

                      {/* Escrow Protection Notice */}
                      <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          <span className="font-semibold">
                            {formatEscrowAuthorizationAmount(
                              paymentFees?.totalAmount,
                              {
                                recalculating: paymentFees?.recalculating,
                              }
                            )}
                          </span>{" "}
                          will be authorized and held in escrow. Released in
                          stages as milestones are achieved.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Alert
                      variant="default"
                      className="border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                    >
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800 dark:text-amber-200">
                        No payment method on file. You'll be prompted to add
                        one.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Privacy Summary Section */}
            {currentUser?.id && (
              <div className="mt-2">
                <PrivacySummarySection
                  onSelectedRulesChange={(selectedIds) => {
                    setSelectedPrivacyRuleIds(selectedIds);
                  }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 border-t mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePrimaryActionClick}
                disabled={
                  isSubmitting ||
                  paymentLoading ||
                  calendarLoading ||
                  isCheckingLimit ||
                  isCheckingFeedback ||
                  hasReachedLimit ||
                  hasPendingFeedback ||
                  paymentFees.recalculating ||
                  !paymentFees.totalAmount ||
                  !!bountyValidationError ||
                  (!hasCalendar || !hasPaymentMethods
                    ? false
                    : !meetingTitle.trim() || !meetingDescription.trim())
                }
                className="flex-1 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                data-testid="button-send-introduction-request"
              >
                <IntroductionFormSubmitButtonLabel
                  hasCalendar={hasCalendar}
                  calendarLoading={calendarLoading}
                  hasPaymentMethods={hasPaymentMethods}
                  hasReachedLimit={hasReachedLimit}
                  activeRequestCount={activeRequestCount}
                  activeRequestLimit={activeRequestLimit}
                  isSubmitting={isSubmitting}
                />
              </Button>
            </div>
          </div>
        ) : null}

        <AddPaymentMethodModal
          isOpen={showPaymentMethodModal}
          onClose={() => setShowPaymentMethodModal(false)}
          onSuccess={() => {
            fetchPaymentMethods();
            setShowPaymentMethodModal(false);
          }}
          hasExistingCards={hasPaymentMethods}
        />
      </div>

      {/* Active Request Limit Modal - Separate Popup */}
      <ActiveRequestLimitModal
        isOpen={showLimitModal}
        onClose={() => {
          setShowLimitModal(false);
          onClose(); // Close the main dialog when limit modal closes
        }}
        currentCount={activeRequestCount}
        limit={activeRequestLimit}
      />

      {/* Pending Feedback Warning Modal - Separate Popup */}
      <PendingFeedbackWarningModal
        isOpen={showPendingFeedbackModal}
        onClose={() => {
          setShowPendingFeedbackModal(false);
          onClose(); // Close the main dialog when warning modal closes
        }}
        pendingFeedbackCount={pendingFeedbackCount}
        contact={contact}
      />

      <MoveToMarketplaceDialog
        isOpen={showMarketplaceConfirmation}
        onClose={() => setShowMarketplaceConfirmation(false)}
        onConfirm={handleSubmit}
        isSubmitting={isSubmitting}
        confirmButtonLabel="I Understand, Send Request"
      />
    </>
  );
}

export function IntroductionForm(props: IntroductionFormProps) {
  const formState = useIntroductionFormState(props);

  if (!props.contact) {
    return null;
  }

  return <IntroductionFormBody contact={props.contact} {...formState} />;
}
