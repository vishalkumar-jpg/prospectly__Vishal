import {
  INTRODUCTION_MESSAGES,
  type DeepLinkStatus,
} from "@/constants/introduction-messages";

export type DeepLinkNotFoundContext = "inbox" | "pipeline";

export type DeepLinkToastConfig = {
  title: string;
  description: string;
  variant?: "default" | "destructive";
};

export function getDeepLinkStatusToast(
  status: DeepLinkStatus,
  notFoundContext: DeepLinkNotFoundContext
): DeepLinkToastConfig | null {
  switch (status) {
    case "already_accepted":
      return {
        title: INTRODUCTION_MESSAGES.requestAlreadyAccepted.title,
        description: INTRODUCTION_MESSAGES.requestAlreadyAccepted.description,
        variant: "default",
      };
    case "accepted_by_you":
      return {
        title: INTRODUCTION_MESSAGES.requestAcceptedByYou.title,
        description: INTRODUCTION_MESSAGES.requestAcceptedByYou.description,
        variant: "default",
      };
    case "already_acknowledged":
      return {
        title: INTRODUCTION_MESSAGES.meetingAlreadyAcknowledged.title,
        description:
          INTRODUCTION_MESSAGES.meetingAlreadyAcknowledged.description,
        variant: "default",
      };
    case "not_ready":
      return {
        title: INTRODUCTION_MESSAGES.meetingNotReadyForAcknowledge.title,
        description:
          INTRODUCTION_MESSAGES.meetingNotReadyForAcknowledge.description,
        variant: "destructive",
      };
    case "already_feedback_given":
      return {
        title: INTRODUCTION_MESSAGES.feedbackAlreadyGiven.title,
        description: INTRODUCTION_MESSAGES.feedbackAlreadyGiven.description,
        variant: "default",
      };
    case "feedback_not_ready":
      return {
        title: INTRODUCTION_MESSAGES.feedbackNotReady.title,
        description: INTRODUCTION_MESSAGES.feedbackNotReady.description,
        variant: "destructive",
      };
    case "available":
    case "ready":
    case "feedback_ready":
      return null;
    case "not_found":
    case "unavailable":
    default:
      return notFoundContext === "inbox"
        ? {
            title: INTRODUCTION_MESSAGES.requestNotFoundInbox.title,
            description: INTRODUCTION_MESSAGES.requestNotFoundInbox.description,
            variant: "destructive",
          }
        : {
            title: INTRODUCTION_MESSAGES.requestNotFoundPipeline.title,
            description:
              INTRODUCTION_MESSAGES.requestNotFoundPipeline.description,
            variant: "destructive",
          };
  }
}

export function getDeepLinkNotFoundToast(
  notFoundContext: DeepLinkNotFoundContext
): DeepLinkToastConfig {
  return notFoundContext === "inbox"
    ? {
        title: INTRODUCTION_MESSAGES.requestNotFoundInbox.title,
        description: INTRODUCTION_MESSAGES.requestNotFoundInbox.description,
        variant: "destructive",
      }
    : {
        title: INTRODUCTION_MESSAGES.requestNotFoundPipeline.title,
        description: INTRODUCTION_MESSAGES.requestNotFoundPipeline.description,
        variant: "destructive",
      };
}
