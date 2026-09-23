import { appConfig } from "config/app.config";

export const FEEDBACK_EMAIL_QUERY = {
  open: "feedback",
  myFeedback: "myFeedback",
} as const;

export function buildUserFeedbackPanelUrl(): string {
  const base = appConfig.frontendUrl?.replace(/\/$/, "") ?? "";
  if (!base) return "";

  const params = new URLSearchParams({
    [FEEDBACK_EMAIL_QUERY.open]: "open",
    [FEEDBACK_EMAIL_QUERY.myFeedback]: "1",
  });

  return `${base}/dashboard?${params.toString()}`;
}
