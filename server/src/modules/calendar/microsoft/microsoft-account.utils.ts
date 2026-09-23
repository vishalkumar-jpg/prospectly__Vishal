import { PERSONAL_ACCOUNT_DOMAINS } from "constants/microsoft-account.constants";
import { isMicrosoftTeamsMeetingLink } from "./microsoft-graph-datetime.utils";

export function isPersonalMicrosoftAccount(
  email: string | null | undefined
): boolean {
  if (!email) return false;
  const emailDomain = email.toLowerCase().split("@")[1];
  if (!emailDomain) return false;
  return PERSONAL_ACCOUNT_DOMAINS.some(
    (domain) => emailDomain === domain || emailDomain.endsWith(`.${domain}`)
  );
}

export function extractTeamsMeetingLink(
  event: AnyType | null | undefined
): string | null {
  if (!event) return null;

  const candidates = [
    event.onlineMeeting?.joinUrl,
    event.onlineMeetingUrl,
    event.location?.locationUri,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      isMicrosoftTeamsMeetingLink(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}

export const MICROSOFT_EVENT_LINK_SELECT =
  "onlineMeeting,onlineMeetingUrl,location";
