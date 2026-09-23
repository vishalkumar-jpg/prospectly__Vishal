import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  validateBountyAmountInput,
  getIntroductionSubmitValidationError,
  applyIntroductionSubmitValidationBlock,
  submitIntroductionRequest,
  handleIntroductionSubmitError,
  computeSuccessPercentage,
  getSuccessStatusColor,
} from "./IntroductionForm";
import { formatIntegerWithCommas } from "@/lib/formatted-integer";

import {
  CalendarIcon,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Building2,
  User,
  Briefcase,
  Shield,
  Lock,
  Info,
  ArrowRight,
  Send,
  Star,
  Mail,
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

interface Contact {
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
  enrichmentStatus?: string | null;
  linkedin?: string | null;
}

interface RequestToMeetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  defaultBountyAmount: number;
  onDialogReady?: () => void;
  onBountyCalculated?: (contactId: string, amount: number) => void;
}

type IntroductionFormContactShape = {
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
};

function toIntroductionFormContact(
  contact: Contact
): IntroductionFormContactShape {
  return {
    id: contact.id,
    first_name: contact.first_name,
    last_name: contact.last_name,
    title: contact.title,
    company: contact.company,
    bounty_amount: contact.bounty_amount,
    bountyAmount: contact.bountyAmount,
    user_id: contact.user_id,
    quality_score: contact.quality_score,
    profile_photo_url: contact.profile_photo_url,
    source: contact.source,
  };
}

function fireAndForgetAsync({
  action,
}: {
  action: () => void | Promise<void>;
}): void {
  Promise.resolve(action()).catch(() => undefined);
}

type RequestToMeetDialogBodyView =
  | "loading"
  | "calendar"
  | "status-loading"
  | "form";

function getRequestToMeetDialogBodyView({
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
}): RequestToMeetDialogBodyView {
  if ((isCheckingLimit || isCheckingFeedback) && !hasReachedLimit) {
    return "loading";
  }
  if (
    !hasCalendar &&
    !calendarLoading &&
    !hasPendingFeedback &&
    !isCheckingLimit &&
    !hasReachedLimit
  ) {
    return "calendar";
  }
  if (calendarLoading || isCheckingLimit || hasReachedLimit) {
    return "status-loading";
  }
  return "form";
}

function getRequestToMeetDialogLoadingMessage(
  isCheckingLimit: boolean
): string {
  return isCheckingLimit
    ? "Checking active request limit..."
    : "Checking past introduction requests feedback status...";
}

function getRequestToMeetDialogStatusLoadingMessage({
  isCheckingLimit,
  hasReachedLimit,
}: {
  isCheckingLimit: boolean;
  hasReachedLimit: boolean;
}): string {
  if (isCheckingLimit) return "Checking active request limit...";
  if (hasReachedLimit) return "Checking availability...";
  return "Checking calendar status...";
}

function RequestToMeetDialogSubmitButtonLabel({
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

function useRequestToMeetDialogState({
  isOpen,
  onClose,
  contact,
  defaultBountyAmount,
  onDialogReady,
  onBountyCalculated,
}: RequestToMeetDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bountyAmount, setBountyAmount] = useState(
    defaultBountyAmount.toString()
  );
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

  // Peer feedback blocking states
  const [hasPendingFeedback, setHasPendingFeedback] = useState(false);
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);
  const [isCheckingFeedback, setIsCheckingFeedback] = useState(true);

  // Active request limit states
  const [activeRequestCount, setActiveRequestCount] = useState(0);
  const [activeRequestLimit, setActiveRequestLimit] = useState(1);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const [isCheckingLimit, setIsCheckingLimit] = useState(true);

  // Bounty calculation state
  const [isBountyCalculating, setIsBountyCalculating] = useState(false);
  const [bountyCalculated, setBountyCalculated] = useState(false);

  // Success Percentage State
  const [connectorEstimates, setConnectorEstimates] = useState<number[]>([]);
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);

  // Check calendar integration status
  const { hasCalendar, loading: calendarLoading } = useCalendarRequirement();

  // Use primary payment method hook - only fetch primary card for Request Introduction popup
  const {
    primaryPaymentMethod,
    hasPaymentMethods,
    loading: paymentLoading,
    fetchPrimaryPaymentMethod: fetchPaymentMethods,
  } = usePrimaryPaymentMethod();

  // Reset form fields when dialog opens
  useEffect(() => {
    if (isOpen) {
      setBountyAmount(defaultBountyAmount.toString());
      setMeetingTitle("");
      setMeetingDescription("");
      setNotes("");
      setIsUrgent(false);
      setBountyValidationError("");
      setIsBountyCalculating(false);
      setBountyCalculated(false);
    }
  }, [isOpen, defaultBountyAmount]);

  // On-demand enrichment + bounty calculation
  useEffect(() => {
    if (!contact?.id || !isOpen) return;

    // Already enriched — use existing data
    if (contact.enrichmentStatus === "completed") {
      const currentBounty = Number(
        contact?.bounty_amount || contact?.bountyAmount || 0
      );
      if (currentBounty > 0) {
        setBountyCalculated(true);
        return;
      }
      // Enriched but bounty=0 — still need bounty calc
      setIsBountyCalculating(true);
      api.contacts
        .calculateBounty({
          id: String(contact.id),
          source: "contacts",
          company: contact.company,
          title: contact.title,
        })
        .then((result) => {
          if (result?.success && result.bountyAmount) {
            setBountyAmount(result.bountyAmount.toString());
            onBountyCalculated?.(String(contact.id), result.bountyAmount);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsBountyCalculating(false);
          setBountyCalculated(true);
        });
      return;
    }

    // Not enriched — enrich first, then bounty calc
    setIsBountyCalculating(true);
    const runEnrichmentAndBounty = async () => {
      try {
        const enrichResult = await api.contacts.enrichContact({
          id: String(contact.id),
          source: contact.source || "contacts",
          linkedin_url: contact.linkedin || undefined,
        });

        const bountyResult = await api.contacts.calculateBounty({
          id: String(enrichResult.id),
          source: "contacts",
          company: enrichResult.company || contact.company,
          title: enrichResult.title || contact.title,
        });

        if (bountyResult?.success && bountyResult.bountyAmount) {
          setBountyAmount(bountyResult.bountyAmount.toString());
          onBountyCalculated?.(
            String(enrichResult.id),
            bountyResult.bountyAmount
          );
        }
      } catch {
        /* silent fallback to manual entry */
      } finally {
        setIsBountyCalculating(false);
        setBountyCalculated(true);
      }
    };
    runEnrichmentAndBounty();
  }, [contact?.id, isOpen]);

  // Check for pending peer feedback on mount
  useEffect(() => {
    async function checkPendingFeedback() {
      if (!currentUser?.id || !isOpen) {
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
          // Show warning modal immediately if there's pending feedback
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
  }, [currentUser?.id, isOpen]);

  // Reset checking state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsCheckingLimit(true);
      setIsCheckingFeedback(true); // Start checking immediately to prevent flash
    } else {
      setIsCheckingLimit(false);
      setIsCheckingFeedback(false);
      setShowLimitModal(false);
      setShowPendingFeedbackModal(false);
      setHasReachedLimit(false);
      setHasPendingFeedback(false);
      setPendingFeedbackCount(0);
    }
  }, [isOpen]);

  // Check active request limit when modal opens
  useEffect(() => {
    async function checkActiveLimit() {
      if (!currentUser?.id || !isOpen) {
        return;
      }

      // isCheckingLimit is already set to true by the previous useEffect

      try {
        const data = await api.introductions.getActiveCount();
        setActiveRequestCount(data.current);
        setActiveRequestLimit(data.limit);
        const reachedLimit = data.current >= data.limit;
        setHasReachedLimit(reachedLimit);
        // Show separate modal if limit is reached
        if (reachedLimit) {
          setShowLimitModal(true);
        }
      } catch {
        // On error, allow creation (backend guard will still block if needed)
        setHasReachedLimit(false);
        setActiveRequestCount(0);
        setActiveRequestLimit(1);
      } finally {
        setIsCheckingLimit(false);
      }
    }

    checkActiveLimit();
  }, [currentUser?.id, isOpen]);

  // Fetch connector estimates
  useEffect(() => {
    async function fetchEstimates() {
      if (!contact?.id || !isOpen || contact?.source === "apollo") {
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
  }, [contact?.id, isOpen]);

  // Notify parent when all initial API calls are complete
  useEffect(() => {
    if (
      isOpen &&
      !isCheckingFeedback &&
      !isCheckingLimit &&
      !isLoadingEstimates &&
      !calendarLoading &&
      !paymentLoading &&
      onDialogReady
    ) {
      onDialogReady();
    }
  }, [
    isOpen,
    isCheckingFeedback,
    isCheckingLimit,
    isLoadingEstimates,
    calendarLoading,
    paymentLoading,
    onDialogReady,
  ]);

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

    if (!contact) return;

    setBountyValidationError("");
    setIsSubmitting(true);

    try {
      await submitIntroductionRequest({
        contact: toIntroductionFormContact(contact),
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
    isSubmitting,
    bountyAmount,
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
    isBountyCalculating,
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

type RequestToMeetDialogBodyProps = RequestToMeetDialogProps &
  ReturnType<typeof useRequestToMeetDialogState>;

function RequestToMeetDialogBody({
  isOpen,
  onClose,
  contact,
  navigate,
  currentUser,
  isSubmitting,
  bountyAmount,
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
  isBountyCalculating,
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
}: RequestToMeetDialogBodyProps) {
  const fullName =
    `${contact?.first_name || ""} ${contact?.last_name || ""}`.trim();

  const contactPhotoUrl = contact?.profile_photo_url || null;

  const bodyView = getRequestToMeetDialogBodyView({
    isCheckingLimit,
    isCheckingFeedback,
    hasReachedLimit,
    hasCalendar,
    calendarLoading,
    hasPendingFeedback,
  });

  const loadingMessage = getRequestToMeetDialogLoadingMessage(isCheckingLimit);
  const statusLoadingMessage = getRequestToMeetDialogStatusLoadingMessage({
    isCheckingLimit,
    hasReachedLimit,
  });

  return (
    <>
      <Dialog
        open={
          isOpen &&
          !showLimitModal &&
          !showPendingFeedbackModal &&
          !isCheckingLimit &&
          !isCheckingFeedback &&
          !hasReachedLimit &&
          !hasPendingFeedback
        }
        onOpenChange={onClose}
      >
        <DialogContent className="max-w-4xl max-h-[75vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold mb-2">
              Request Introduction
            </DialogTitle>
          </DialogHeader>

          {bodyView === "loading" ? (
            <Loader message={loadingMessage} className="py-8" />
          ) : null}

          {bodyView === "calendar" ? (
            <div className="space-y-4 py-4">
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <CalendarIcon className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-900 dark:text-amber-100">
                  <div className="space-y-3">
                    <p className="font-semibold text-lg">
                      📅 Calendar Connection Required
                    </p>
                    <p className="text-sm">
                      Before sending introduction requests, you need to connect
                      your calendar so prospects can easily book meetings with
                      you. This only takes 2 minutes.
                    </p>

                    {/* Show prospect info so context isn't lost */}
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
                          <p className="font-bold text-foreground">
                            {fullName}
                          </p>
                          {contact?.title && (
                            <p className="text-sm text-muted-foreground">
                              {contact.title}
                            </p>
                          )}
                          {contact?.company && (
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
                          // Don't close dialog yet - keep it open so they can return
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
                      💡 After connecting your calendar, you can return here to
                      complete your request
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          {bodyView === "status-loading" ? (
            <Loader message={statusLoadingMessage} className="py-8" />
          ) : null}

          {bodyView === "form" ? (
            <div className="space-y-4 mt-2">
              {/* Marketplace Visibility Disclosure */}
              {connectorEstimates?.length === 0 && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <Eye className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                    This request will be visible to all marketplace users who
                    can view the details you enter below.
                  </AlertDescription>
                </Alert>
              )}

              {/* Enhanced Prospect Card - Redesigned */}
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-[1fr_auto] gap-0">
                    {/* Left Side - Contact Info */}
                    <div className="p-4 space-y-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar with quality score ring */}
                        <PremiumAvatar
                          name={fullName}
                          size="md"
                          qualityScore={contact?.quality_score ?? 8}
                          imageUrl={contactPhotoUrl}
                        />

                        {/* Name & Primary Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-foreground mb-0.5 truncate">
                            {fullName}
                          </h3>
                          {contact?.title && (
                            <p className="text-sm font-medium text-muted-foreground mb-1 truncate">
                              {contact.title}
                            </p>
                          )}
                          {contact?.company && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Building2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              <span className="font-semibold text-foreground truncate">
                                {contact.company}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Detailed Info Grid */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="uppercase tracking-wide font-semibold">
                              Contact
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            Professional
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="uppercase tracking-wide font-semibold">
                              Status
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 hover:bg-green-700 hover:text-green-50 dark:text-green-300 border-green-200 dark:border-green-800"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Available
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Referral Payout Badge */}
                    <div className="bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:via-green-500/5 dark:to-teal-500/5 border-l-2 border-emerald-500/20 p-4 flex items-center justify-center min-w-[200px]">
                      <div className="text-center space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                            Referral Payout
                          </span>
                        </div>
                        {isBountyCalculating ? (
                          <div className="space-y-2 py-2">
                            <div className="h-10 w-28 mx-auto rounded-lg bg-emerald-500/10 animate-pulse" />
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                              Estimating referral payout...
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-baseline justify-center gap-0.5">
                              <span className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                $
                              </span>
                              <span className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {(
                                  parseFloat(bountyAmount) || 0
                                ).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Held in escrow
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Referral Payout Input */}
                <Card
                  className={cn(
                    "border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-md",
                    connectorEstimates.length === 0 ? "md:col-span-2" : ""
                  )}
                >
                  <CardContent className="p-5 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <DollarSign className="h-5 w-5" />
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
                      <div className="space-y-3 mb-6">
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
                                "pl-11 h-12 text-lg font-bold border focus-visible:ring-offset-0 transition-all shadow-sm",
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

                      {/* Breakdown Preview - Updated Payment Flow */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-3 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center group/item">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg">
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              Authorization
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground/80 italic">
                            Card Verification only
                          </span>
                        </div>
                        <div className="flex justify-between items-center group/item">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-amber-500/10 rounded-lg">
                              <Send className="h-3.5 w-3.5 text-amber-500" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              Email Delivery
                            </span>
                          </div>
                          <span className="text-[12px] font-black text-foreground">
                            $
                            {((parseFloat(bountyAmount) || 0) * 0.05).toFixed(
                              0
                            )}{" "}
                            <span className="text-[10px] opacity-40 font-bold">
                              (5%)
                            </span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center group/item">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                              <CalendarIcon className="h-3.5 w-3.5 text-emerald-500" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              Meeting Booked
                            </span>
                          </div>
                          <span className="text-[12px] font-black text-foreground">
                            $
                            {((parseFloat(bountyAmount) || 0) * 0.95).toFixed(
                              0
                            )}{" "}
                            <span className="text-[10px] opacity-40 font-bold">
                              (95%)
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 opacity-60">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        SECURE ESCROW PAYMENT
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {connectorEstimates?.length > 0 && (
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
                    <CardContent className="p-5 h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "p-2 rounded-xl transition-colors duration-500",
                                statusColor === "emerald"
                                  ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-emerald-50 dark:text-emerald-400"
                                  : statusColor === "blue"
                                    ? "bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-blue-50 dark:text-blue-400"
                                    : statusColor === "amber"
                                      ? "bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-amber-50 dark:text-amber-400"
                                      : "bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-rose-50 dark:text-rose-400"
                              )}
                            >
                              <Sparkles className="h-5 w-5" />
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

                        <div className="flex flex-col items-center justify-center py-2">
                          {isLoadingEstimates ? (
                            <Loader
                              message="Analyzing connectors..."
                              size="sm"
                              className="py-6"
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
                                <svg className="w-28 h-28 transform -rotate-90">
                                  {/* Track */}
                                  <circle
                                    cx="56"
                                    cy="56"
                                    r="48"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="transparent"
                                    className="text-slate-100 dark:text-slate-800/50"
                                  />
                                  {/* Progress */}
                                  <circle
                                    cx="56"
                                    cy="56"
                                    r="48"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 48}
                                    strokeDashoffset={
                                      2 *
                                      Math.PI *
                                      48 *
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
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                  <span
                                    className={cn(
                                      "text-xl font-black transition-colors duration-500",
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
                                  <span className="text-[9px] font-bold text-muted-foreground uppercase">
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
                              <p className="text-center text-[11px] font-semibold text-muted-foreground mt-4">
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
                              "mt-4 p-3 rounded-xl border flex gap-3 items-start transition-all duration-500",
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
                                  ? "Brilliant! Your referral payout meets the highest expectations across all connectors. This ensures your request receives immediate priority and maximum interest."
                                  : successPercentage >= 75
                                    ? "Highly Competitive! This amount is well above average benchmarks, making your request extremely attractive to the most active connectors."
                                    : successPercentage >= 50
                                      ? "Solid Market Rate. Your referral payout aligns with general expectations for this contact, which typically results in a healthy response rate."
                                      : successPercentage >= 25
                                        ? "Below Benchmark. While some connectors may still be interested, your request might take longer to respond to compared to higher-paying introductions."
                                        : "Action Required. This referral payout is significantly lower than current market standards. We recommend increasing it to capture the attention of reliable connectors."}
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
                            connectors, helping them prioritize and respond
                            faster to time-sensitive opportunities.
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

              {/* Meeting Details - Grouped */}
              <Card className="border-2 border-border bg-gradient-to-br from-background to-muted/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="text-base font-semibold">Meeting Details</h4>
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
                      className="h-11 border-2"
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
                      className="min-h-28 resize-none border-2"
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
                  <div className="space-y-2 pt-3 border-t">
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
                      className="min-h-20 resize-none border-2"
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

              {/* Two-column layout: Payment Protection & Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Protection - Compact */}
                <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-50 via-blue-50/50 to-background dark:from-blue-950/30 dark:via-blue-950/20 dark:to-background shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 flex items-center gap-1.5">
                          Payment Protection Guarantee
                          <Lock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-start gap-2 p-2.5 bg-white dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-900 dark:text-blue-100">
                          <span className="font-semibold">No charge now</span> —
                          authorization only
                        </p>
                      </div>
                      <div className="flex items-start gap-2 p-2.5 bg-white dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-900 dark:text-blue-100">
                          <span className="font-semibold">
                            Charged when accepted
                          </span>{" "}
                          by owner
                        </p>
                      </div>
                      <div className="flex items-start gap-2 p-2.5 bg-white dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-900 dark:text-blue-100">
                          <span className="font-semibold">Secure escrow</span>{" "}
                          protection
                        </p>
                      </div>
                      <div className="flex items-start gap-2 p-2.5 bg-white dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-900 dark:text-blue-100">
                          <span className="font-semibold">Milestone-based</span>{" "}
                          payment capture
                        </p>
                      </div>
                    </div>

                    {/* Trust Badges */}
                    <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
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
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <Label className="text-base font-semibold">
                          Payment Method
                        </Label>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          if (hasPaymentMethods) {
                            navigate("/prospecting/transactions/payments");
                          } else {
                            setShowPaymentMethodModal(true);
                          }
                        }}
                        className="h-auto p-0 text-xs font-medium"
                      >
                        {hasPaymentMethods ? "Manage Cards" : "Add Card"}
                      </Button>
                    </div>

                    {paymentLoading ? (
                      <div className="flex items-center justify-center p-8 bg-muted/50 rounded-lg border-2 border-dashed">
                        <Loader message="Loading payment method..." size="sm" />
                      </div>
                    ) : primaryPaymentMethod ? (
                      <div className="space-y-3">
                        {/* Premium 3D Credit Card - Compact */}
                        <div
                          className={cn(
                            "relative group overflow-hidden rounded-lg shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5",
                            "max-w-[320px]",
                            primaryPaymentMethod.isPrimary &&
                              "ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background"
                          )}
                        >
                          {/* Card Background with Brand Gradient */}
                          <div
                            className={cn(
                              "relative h-[180px] bg-gradient-to-br text-white p-4",
                              primaryPaymentMethod.brand.toLowerCase() ===
                                "visa" &&
                                "from-blue-600 via-blue-700 to-blue-800",
                              primaryPaymentMethod.brand.toLowerCase() ===
                                "mastercard" &&
                                "from-orange-500 via-red-500 to-red-600",
                              primaryPaymentMethod.brand.toLowerCase() ===
                                "amex" &&
                                "from-green-600 via-teal-600 to-cyan-700",
                              primaryPaymentMethod.brand.toLowerCase() ===
                                "discover" &&
                                "from-orange-600 via-amber-600 to-yellow-600",
                              ![
                                "visa",
                                "mastercard",
                                "amex",
                                "discover",
                              ].includes(
                                primaryPaymentMethod.brand.toLowerCase()
                              ) && "from-gray-600 via-gray-700 to-gray-800"
                            )}
                          >
                            {/* Holographic overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            {/* Background pattern */}
                            <div className="absolute inset-0 opacity-10">
                              <div className="absolute top-0 left-0 w-20 h-20 bg-white rounded-full blur-2xl" />
                              <div className="absolute bottom-0 right-0 w-16 h-16 bg-white rounded-full blur-xl" />
                            </div>

                            {/* Card Content */}
                            <div className="relative h-full flex flex-col justify-between">
                              {/* Top: Brand */}
                              <div className="flex items-end justify-end">
                                {/* Brand */}
                                <div className="flex items-center gap-1.5">
                                  <CreditCard className="h-4 w-4 text-white/80" />
                                  <span className="text-xs font-bold uppercase tracking-wider">
                                    {primaryPaymentMethod.brand}
                                  </span>
                                </div>
                              </div>

                              {/* Middle: Card Number */}
                              <div className="flex gap-2 text-base font-mono tracking-wider">
                                <span>••••</span>
                                <span>••••</span>
                                <span>••••</span>
                                <span className="font-bold">
                                  {primaryPaymentMethod.last4}
                                </span>
                              </div>

                              {/* Bottom: Expiry */}
                              <div className="flex items-end justify-end">
                                <div className="text-right">
                                  <p className="text-[9px] text-white/70 uppercase tracking-wide mb-0.5">
                                    Expires
                                  </p>
                                  <p
                                    className={cn(
                                      "text-xs font-semibold",
                                      primaryPaymentMethod.isExpired &&
                                        "text-red-300"
                                    )}
                                  >
                                    {String(
                                      primaryPaymentMethod.expMonth
                                    ).padStart(2, "0")}
                                    /{primaryPaymentMethod.expYear}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Primary Badge */}
                            {primaryPaymentMethod.isPrimary && (
                              <div className="absolute top-2 left-2 z-10">
                                <div className="relative">
                                  {/* Glow effect */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-full blur-sm opacity-75 animate-pulse"></div>

                                  {/* Badge */}
                                  <Badge className="relative bg-gradient-to-r from-amber-500/95 via-yellow-400/95 to-amber-500/95 text-white backdrop-blur-sm border border-white/50 shadow-lg shadow-amber-500/30 px-2 py-0.5">
                                    <Star className="h-2.5 w-2.5 fill-white mr-1 drop-shadow" />
                                    <span className="font-bold text-[10px] tracking-wide drop-shadow">
                                      PRIMARY
                                    </span>
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Escrow Protection Notice */}
                        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            <span className="font-semibold">
                              $
                              {(parseFloat(bountyAmount) || 0).toLocaleString()}
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
                <div className="mt-4">
                  <PrivacySummarySection
                    onSelectedRulesChange={(selectedIds) => {
                      setSelectedPrivacyRuleIds(selectedIds);
                    }}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t mt-4">
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
                    isBountyCalculating ||
                    !!bountyValidationError ||
                    (!hasCalendar || !hasPaymentMethods
                      ? false
                      : !meetingTitle.trim() || !meetingDescription.trim())
                  }
                  className="flex-1 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                  data-testid="button-send-introduction-request"
                >
                  <RequestToMeetDialogSubmitButtonLabel
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
        </DialogContent>
      </Dialog>

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

export function RequestToMeetDialog(props: RequestToMeetDialogProps) {
  const state = useRequestToMeetDialogState(props);
  return <RequestToMeetDialogBody {...props} {...state} />;
}
