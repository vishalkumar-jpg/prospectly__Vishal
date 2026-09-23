import type { DeepLinkAction } from "@/constants/introduction-messages";
import type { IntroductionEmailLinkParams } from "@/types/introduction-deep-link";

export function isReviewDeepLink(
  emailLinkParams: IntroductionEmailLinkParams | null
): boolean {
  if (!emailLinkParams) {
    return false;
  }
  return (
    emailLinkParams.action === "review" || emailLinkParams.action === null
  );
}

export function deepLinkMatchesAction(
  emailLinkParams: IntroductionEmailLinkParams | null,
  action: DeepLinkAction
): boolean {
  if (!emailLinkParams) {
    return false;
  }
  if (action === "review") {
    return isReviewDeepLink(emailLinkParams);
  }
  return emailLinkParams.action === action;
}

export function getActionableDeepLinkStatus(action: DeepLinkAction): string {
  switch (action) {
    case "review":
      return "available";
    case "acknowledge":
      return "ready";
    case "feedback":
      return "feedback_ready";
    default:
      return "available";
  }
}
