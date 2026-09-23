import { appConfig } from "config/app.config";

export type IntroductionEmailDeepLinkAction =
  | "acknowledge"
  | "review"
  | "feedback"
  | "republish"
  | "marketplace";

const appendAction = (
  url: string,
  action?: IntroductionEmailDeepLinkAction
): string => (action ? `${url}&action=${action}` : url);

export const buildConnectorInboxUrl = (
  requestId: string,
  action?: IntroductionEmailDeepLinkAction
): string => {
  const tab = action === "feedback" ? "pipeline" : "inbox";
  return appendAction(
    `${appConfig.frontendUrl}/prospecting/incoming-requests/${tab}?request=${requestId}`,
    action
  );
};

export const buildRequesterPipelineUrl = (
  requestId: string,
  action?: IntroductionEmailDeepLinkAction
): string =>
  appendAction(
    `${appConfig.frontendUrl}/prospecting/my-prospects/open-request?request=${requestId}`,
    action
  );

export const buildFeedbackUrl = (
  requestId: string,
  role: "requester" | "connector"
): string =>
  role === "connector"
    ? buildConnectorInboxUrl(requestId, "feedback")
    : buildRequesterPipelineUrl(requestId);

export const buildSharerClaimsUrl = (claimId?: string): string => {
  const base = `${appConfig.frontendUrl}/prospecting/opportunities/claims`;
  return claimId ? `${base}?claim=${claimId}` : base;
};
