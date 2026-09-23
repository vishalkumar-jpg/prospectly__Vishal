import { appConfig } from "config/app.config";
import { CreatePayoutAccountDto } from "./payout-onboarding.dto";

const PAYOUTS_PATH = "/prospecting/transactions/payouts";

/** Only allow same-origin redirect URLs back into the app. */
export function isAllowedPayoutRedirectUrl(url: string): boolean {
  try {
    const target = new URL(url);
    const frontend = new URL(appConfig.frontendUrl);
    if (target.origin !== frontend.origin) return false;
    return target.pathname.startsWith("/");
  } catch {
    return false;
  }
}

export function getDefaultPayoutOnboardingUrls() {
  const base = `${appConfig.frontendUrl}${PAYOUTS_PATH}`;
  return {
    refreshUrl: base,
    returnUrl: `${base}?status=success`,
  };
}

export function resolvePayoutOnboardingUrls(body?: CreatePayoutAccountDto) {
  const defaults = getDefaultPayoutOnboardingUrls();

  return {
    refreshUrl:
      body?.refreshUrl && isAllowedPayoutRedirectUrl(body.refreshUrl)
        ? body.refreshUrl
        : defaults.refreshUrl,
    returnUrl:
      body?.returnUrl && isAllowedPayoutRedirectUrl(body.returnUrl)
        ? body.returnUrl
        : defaults.returnUrl,
  };
}
