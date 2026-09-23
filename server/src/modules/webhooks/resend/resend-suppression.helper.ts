import { Logger } from "@nestjs/common";
import {
  SUPPRESSION_REASONS,
  SUPPRESSION_SOURCES,
} from "modules/notification-preferences/notification-preferences.constants";
import type { NotificationSendGateService } from "modules/notification-preferences/notification-send-gate.service";
import { RESEND_WEBHOOKS_EVENT_TYPES } from "./resend-webhooks.constants";

export function extractRecipientEmailFromWebhook(data: AnyType): string | null {
  const to = data?.to;
  if (typeof to === "string" && to.trim()) return to.trim();
  if (Array.isArray(to) && typeof to[0] === "string" && to[0].trim()) {
    return to[0].trim();
  }
  if (typeof data?.email === "string" && data.email.trim()) {
    return data.email.trim();
  }
  return null;
}

export async function maybeSuppressFromResendEvent(
  sendGate: NotificationSendGateService,
  logger: Logger,
  eventType: string,
  recipientEmail: string | null | undefined,
  bounceType?: string
): Promise<void> {
  if (!recipientEmail?.trim()) return;

  if (eventType === RESEND_WEBHOOKS_EVENT_TYPES.EMAIL_COMPLAINED) {
    await sendGate.upsertSuppression(
      recipientEmail,
      SUPPRESSION_REASONS.COMPLAINT,
      SUPPRESSION_SOURCES.PROVIDER_WEBHOOK
    );
    return;
  }

  if (eventType === RESEND_WEBHOOKS_EVENT_TYPES.EMAIL_BOUNCED) {
    const normalizedType = (bounceType ?? "").toLowerCase();
    if (normalizedType && normalizedType !== "hard") {
      return;
    }
    await sendGate.upsertSuppression(
      recipientEmail,
      SUPPRESSION_REASONS.HARD_BOUNCE,
      SUPPRESSION_SOURCES.PROVIDER_WEBHOOK
    );
  }
}
