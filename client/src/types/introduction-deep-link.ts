export type IntroductionEmailLinkAction =
  | "acknowledge"
  | "feedback"
  | "review"
  | "republish"
  | "marketplace";

export type IntroductionEmailLinkParams = {
  requestId: string;
  action: IntroductionEmailLinkAction | null;
};
