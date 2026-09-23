import { appConfig } from "config/app.config";
import { AnyType } from "types/common";
import { utcDayjs } from "utils/dayjs";

const IF_OPEN = "{{#if";
const IF_CLOSE = "{{/if}}";
const IF_OPEN_REGEX = /\{\{#if\s+([\w.-]+)\}\}/;

/**
 * Escapes characters for use in HTML
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape user text for HTML email body nodes (not attributes).
 * Only escapes & < > — apostrophes/quotes stay as UTF-8 so clients don't show
 * literal entity codes like &#39; / &#039;. Newlines become <br />.
 */
export function escapeHtmlEmailText(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n|\r|\n/g, "<br />");
}

export function isTemplateConditionTruthy(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return false;
  if (value === 0 || value === "") return false;
  return true;
}

function resolveConditionalBlock(
  block: string,
  variables: Record<string, AnyType>,
  key: string
): string {
  const elseMarker = "{{else}}";
  const elseIndex = block.indexOf(elseMarker);
  const ifBlock = elseIndex === -1 ? block : block.slice(0, elseIndex);
  const elseBlock =
    elseIndex === -1 ? "" : block.slice(elseIndex + elseMarker.length);
  return isTemplateConditionTruthy(variables[key]) ? ifBlock : elseBlock;
}

function findMatchingIfClose(content: string, innerStart: number): number {
  let depth = 1;
  let pos = innerStart;

  while (pos < content.length && depth > 0) {
    const nextOpen = content.indexOf(IF_OPEN, pos);
    const nextClose = content.indexOf(IF_CLOSE, pos);

    if (nextClose === -1) {
      return -1;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + IF_OPEN.length;
      continue;
    }

    depth -= 1;
    if (depth === 0) {
      return nextClose;
    }
    pos = nextClose + IF_CLOSE.length;
  }

  return -1;
}

export function validateTemplateConditionals(content: string): boolean {
  let depth = 0;
  let pos = 0;

  while (pos < content.length) {
    const nextOpen = content.indexOf(IF_OPEN, pos);
    const nextClose = content.indexOf(IF_CLOSE, pos);

    if (nextOpen === -1 && nextClose === -1) {
      break;
    }

    if (nextClose !== -1 && (nextOpen === -1 || nextClose < nextOpen)) {
      depth -= 1;
      if (depth < 0) {
        return false;
      }
      pos = nextClose + IF_CLOSE.length;
      continue;
    }

    depth += 1;
    pos = nextOpen + IF_OPEN.length;
  }

  return depth === 0;
}

function processConditionals(
  content: string,
  variables: Record<string, AnyType>
): string {
  let result = content;

  while (true) {
    const match = IF_OPEN_REGEX.exec(result);
    if (!match || match.index === undefined) {
      break;
    }

    const key = match[1];
    const innerStart = match.index + match[0].length;
    const closeIndex = findMatchingIfClose(result, innerStart);

    if (closeIndex === -1) {
      break;
    }

    const block = result.slice(innerStart, closeIndex);
    const resolved = resolveConditionalBlock(block, variables, key);
    const closeEnd = closeIndex + IF_CLOSE.length;
    result = result.slice(0, match.index) + resolved + result.slice(closeEnd);
  }

  return result;
}

export function processContent(
  content: string,
  variables: Record<string, AnyType>
): string {
  let result = processConditionals(content, variables);

  const varRegex = /{{\s*([\w.-]+)\s*}}/g;
  result = result.replace(varRegex, (_, key) => {
    const value = variables[key];
    return value !== undefined && value !== null ? String(value) : "";
  });

  return result;
}

export const getEmailTemplateCommonVariables = (): Record<
  string,
  string | number
> => ({
  currentYear: utcDayjs().year(),
  url: appConfig.frontendUrl,
});

/** Capitalizes subscription billing interval for email display (e.g. "month" → "Month"). */
export function capitalizeSubscriptionInterval(interval: string): string {
  const trimmed = interval.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export const mergeEmailTemplateVariables = (
  variables: Record<string, AnyType>
): Record<string, AnyType> => ({
  ...variables,
  ...getEmailTemplateCommonVariables(),
});

export function renderBodyWithVariables(
  templateContent: string,
  variables: Record<string, AnyType>
) {
  return processContent(
    templateContent,
    mergeEmailTemplateVariables(variables)
  );
}

export function renderTemplateWithVariables(
  template: { subject: string; htmlContent: string },
  variables: Record<string, AnyType>
) {
  const merged = mergeEmailTemplateVariables(variables);
  const html = processContent(template.htmlContent, merged);
  const rawSubject = processContent(template.subject, merged);
  const sanitizedSubject = rawSubject.replace(/[\r\n]/g, " ").trim();

  return {
    subject: sanitizedSubject,
    html,
  };
}

/**
 * Generate PremiumAvatar-style HTML for email templates
 */
export function generatePremiumAvatarHTML(
  name: string,
  photoUrl: string | null | undefined,
  size = 56
): string {
  const initial = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const ringSize = size + 8;
  const primaryColor = "#1AB1CE";
  const backgroundColor = "#FFFFFF";

  let validatedPhotoUrl: string | null = null;
  try {
    if (photoUrl && typeof photoUrl === "string") {
      const url = new URL(photoUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        validatedPhotoUrl = url.href;
      }
    }
  } catch {
    validatedPhotoUrl = null;
  }

  const safeInitial = escapeHtml(initial);
  const fontSize = Math.round(size * 0.43);

  if (validatedPhotoUrl) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="width:${ringSize}px;height:${ringSize}px;">
      <tr>
        <td align="center" valign="middle" width="${ringSize}" height="${ringSize}" bgcolor="${primaryColor}" style="width:${ringSize}px;height:${ringSize}px;background-color:${primaryColor};border-radius:50%;padding:4px;text-align:center;vertical-align:middle;">
          <img src="${validatedPhotoUrl}" alt="${safeInitial}" width="${size}" height="${size}" style="display:block;width:${size}px;height:${size}px;border:0;border-radius:50%;margin:0 auto;" />
        </td>
      </tr>
    </table>`;
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="width:${ringSize}px;height:${ringSize}px;">
    <tr>
      <td align="center" valign="middle" width="${ringSize}" height="${ringSize}" bgcolor="${primaryColor}" style="width:${ringSize}px;height:${ringSize}px;background-color:${primaryColor};border-radius:50%;text-align:center;vertical-align:middle;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
          <tr>
            <td align="center" valign="middle" width="${size}" height="${size}" bgcolor="${backgroundColor}" style="width:${size}px;height:${size}px;background-color:${backgroundColor};border-radius:50%;font-size:${fontSize}px;font-weight:700;color:${primaryColor};font-family:Arial,sans-serif;line-height:${size}px;text-align:center;vertical-align:middle;">
              ${safeInitial}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

export function prepareMeetingConfirmationVariables(params: {
  otherPartyName: string;
  isRequester: boolean;
  isConnector?: boolean;
}) {
  const { otherPartyName, isRequester, isConnector } = params;
  const safeName = escapeHtml(otherPartyName);
  let roleDescription: string;

  if (isConnector) {
    roleDescription = `The introduction meeting between <strong style="color: #1AB1CE;">${safeName}</strong> has been confirmed!`;
  } else {
    roleDescription = isRequester
      ? `Your meeting with <strong style="color: #1AB1CE;">${safeName}</strong> has been confirmed!`
      : `Your meeting with <strong style="color: #1AB1CE;">${safeName}</strong> is all set!`;
  }

  return { roleDescription };
}

export function prepareIntroductionVariables(params: {
  targetName: string;
  requesterName: string;
  body: string;
  bookingLink?: string;
  connectorName: string;
  requesterPhotoUrl?: string | null;
  isTarget: boolean;
}) {
  const {
    targetName,
    requesterName,
    body,
    bookingLink,
    connectorName,
    requesterPhotoUrl,
    isTarget,
  } = params;

  const safeTargetName = escapeHtml(targetName);
  const safeRequesterName = escapeHtml(requesterName);
  const safeConnectorName = escapeHtml(connectorName);

  const defaultBookingLink = "https://prospectly.officebeacon.net";
  let validatedBookingLink = defaultBookingLink;

  try {
    if (bookingLink) {
      const url = new URL(bookingLink);
      if (url.protocol === "http:" || url.protocol === "https:") {
        validatedBookingLink = url.href;
      }
    }
  } catch {
    validatedBookingLink = defaultBookingLink;
  }

  const requesterAvatar = generatePremiumAvatarHTML(
    requesterName,
    requesterPhotoUrl,
    56
  );
  const greetingName = escapeHtml(isTarget ? targetName : connectorName);

  return {
    targetName: safeTargetName,
    requesterName: safeRequesterName,
    greetingName,
    emailBody: escapeHtml(body.trim()),
    bookingLink: validatedBookingLink,
    connectorName: safeConnectorName,
    requesterAvatar,
    isTarget,
  };
}
