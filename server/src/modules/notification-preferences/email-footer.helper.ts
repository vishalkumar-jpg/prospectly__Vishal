import {
  NOTIFICATION_CATEGORY_KEYS,
  type NotificationCategoryKey,
} from "./notification-preferences.constants";

const FOOTER_MARKER = "data-prospectly-unsubscribe";
const SUBTLE_FOOTER_TEXT_STYLE =
  "font-size:12px;line-height:1.6;color:#64748B;";
const SUBTLE_UNSUBSCRIBE_LINK_STYLE =
  "color:#0F172A;text-decoration:underline;";

const CATEGORY_UNSUBSCRIBE_TEXT: Partial<
  Record<NotificationCategoryKey, string>
> = {
  [NOTIFICATION_CATEGORY_KEYS.JOB_OPPORTUNITIES]:
    "unsubscribe from job opportunity emails",
  [NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES]:
    "unsubscribe from recruitment pipeline emails",
  [NOTIFICATION_CATEGORY_KEYS.INTRO_ACTIVITY]:
    "unsubscribe from introduction emails",
  [NOTIFICATION_CATEGORY_KEYS.PROSPECT_PIPELINE_UPDATES]:
    "unsubscribe from prospect pipeline emails",
  [NOTIFICATION_CATEGORY_KEYS.SUBSCRIPTION]:
    "unsubscribe from subscription emails",
  [NOTIFICATION_CATEGORY_KEYS.PAYOUTS]: "unsubscribe from payout emails",
  [NOTIFICATION_CATEGORY_KEYS.PRODUCT_REMINDERS]:
    "unsubscribe from product reminder emails",
};

/** Injects a low-profile unsubscribe link below "Visit Prospectly". */
export function injectUnsubscribeFooter(
  html: string,
  unsubscribeUrl: string,
  categoryKey?: NotificationCategoryKey | null
): string {
  if (!html?.trim() || html.includes(FOOTER_MARKER)) {
    return html;
  }

  if (
    !categoryKey ||
    categoryKey === NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY
  ) {
    return html;
  }

  if (!CATEGORY_UNSUBSCRIBE_TEXT[categoryKey]) {
    return html;
  }

  const unsubscribeLink = `<br/><span style="${SUBTLE_FOOTER_TEXT_STYLE}">If you no longer wish to receive these emails, please <a href="${unsubscribeUrl}" ${FOOTER_MARKER}="true" style="${SUBTLE_UNSUBSCRIBE_LINK_STYLE}">unsubscribe</a>.</span>`;
  const visitPattern = /(Visit Prospectly[\s\S]*?<\/a>)/i;

  if (visitPattern.test(html)) {
    return html.replace(visitPattern, `$1${unsubscribeLink}`);
  }

  // Fallback when a template omits "Visit Prospectly" — still surface unsubscribe
  // above the copyright line so compliance copy is never dropped.
  // Match both HTML entity (&copy;) and literal © used across templates.
  const copyrightPattern = /(<p[^>]*>\s*(?:&copy;|©))/i;
  if (copyrightPattern.test(html)) {
    return html.replace(
      copyrightPattern,
      `<p style="margin:0 0 10px 0;"><span style="${SUBTLE_FOOTER_TEXT_STYLE}">If you no longer wish to receive these emails, please <a href="${unsubscribeUrl}" ${FOOTER_MARKER}="true" style="${SUBTLE_UNSUBSCRIBE_LINK_STYLE}">unsubscribe</a>.</span></p>$1`
    );
  }

  return html;
}

export function buildListUnsubscribeHeaders(unsubscribeUrl: string): {
  "List-Unsubscribe": string;
  "List-Unsubscribe-Post": string;
} {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
