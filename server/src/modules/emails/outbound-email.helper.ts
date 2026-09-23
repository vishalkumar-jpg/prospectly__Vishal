import { Logger } from "@nestjs/common";
import { NotificationPreferencesService } from "modules/notification-preferences/notification-preferences.service";
import { NotificationSendGateService } from "modules/notification-preferences/notification-send-gate.service";
import { resolveCategoryKeyForSlug } from "modules/notification-preferences/slug-category-map.constants";
import {
  buildListUnsubscribeHeaders,
  injectUnsubscribeFooter,
} from "modules/notification-preferences/email-footer.helper";
import type { SendEmailParams } from "./payload-builder";

export type PreparedOutboundEmail = {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  skipped?: boolean;
  skipReason?: string;
};

export async function prepareOutboundEmail(
  params: SendEmailParams,
  deps: {
    sendGate: NotificationSendGateService;
    preferencesService: NotificationPreferencesService;
    logger: Logger;
  }
): Promise<PreparedOutboundEmail[]> {
  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const categoryKey = resolveCategoryKeyForSlug(params.slug);
  const results: PreparedOutboundEmail[] = [];

  for (const recipient of recipients) {
    const gate = await deps.sendGate.canSendEmail(recipient, categoryKey);
    if (!gate.allowed) {
      deps.logger.log(
        `Skipping email to ${recipient}: ${gate.reason ?? "blocked"}`
      );
      results.push({
        to: [recipient],
        subject: params.subject,
        skipped: true,
        skipReason: gate.reason,
      });
      continue;
    }

    const unsubscribeUrl =
      await deps.preferencesService.buildUnsubscribeUrlForRecipient(
        recipient,
        categoryKey ?? undefined
      );

    const html = params.html
      ? injectUnsubscribeFooter(params.html, unsubscribeUrl, categoryKey)
      : params.html;

    results.push({
      to: [recipient],
      subject: params.subject,
      html,
      text: params.text,
      headers: buildListUnsubscribeHeaders(unsubscribeUrl),
    });
  }

  return results;
}
