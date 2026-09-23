import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { maskEmail } from "utils/maskingUtils";
import { NotificationPreferencesService } from "modules/notification-preferences/notification-preferences.service";
import { NotificationSendGateService } from "modules/notification-preferences/notification-send-gate.service";
import { EMAILS_MESSAGES, EmailTemplateStatus, Slug } from "./emails.constants";
import {
  capitalizeSubscriptionInterval,
  escapeHtml,
  escapeHtmlEmailText,
  renderTemplateWithVariables,
  prepareMeetingConfirmationVariables,
  prepareIntroductionVariables,
} from "./templating";
import { sendWithRetry } from "./retry";
import { buildPayload, SendEmailParams } from "./payload-builder";
import { prepareOutboundEmail } from "./outbound-email.helper";

export type SendEmailResult = {
  success: boolean;
  emailId?: string;
  error?: string;
  skipped?: boolean;
};

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private resend: Resend | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly sendGate: NotificationSendGateService,
    private readonly preferencesService: NotificationPreferencesService
  ) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log("✅ Resend configured with API key");
    } else {
      this.logger.warn(EMAILS_MESSAGES.WARN.RESEND_NOT_CONFIGURED);
    }
  }

  async findTemplateBySlug(slug: Slug | string) {
    const template = await this.db.query.emailTemplateSchema.findFirst({
      where: and(
        eq(schema.emailTemplateSchema.slug, slug),
        eq(schema.emailTemplateSchema.status, EmailTemplateStatus.ACTIVE),
        isNull(schema.emailTemplateSchema.deletedAt)
      ),
    });
    if (!template)
      throw new NotFoundException(EMAILS_MESSAGES.ERROR.TEMPLATE_NOT_FOUND);
    return template;
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.resend) {
      this.logger.error("❌ Cannot send email: Resend not configured");
      return {
        success: false,
        error: EMAILS_MESSAGES.ERROR.CONFIRMATION_SEND_FAILED,
      };
    }

    const preparedList = await prepareOutboundEmail(params, {
      sendGate: this.sendGate,
      preferencesService: this.preferencesService,
      logger: this.logger,
    });

    const sendable = preparedList.filter((item) => !item.skipped);
    if (sendable.length === 0) {
      return { success: true, skipped: true };
    }

    if (sendable.length === 1 && preparedList.length === 1) {
      return this.dispatchSingle(sendable[0], params);
    }

    let lastResult: SendEmailResult = {
      success: true,
    };
    for (const item of sendable) {
      lastResult = await this.dispatchSingle(item, {
        ...params,
        to: item.to[0],
        html: item.html,
        headers: item.headers,
      });
      if (!lastResult.success) return lastResult;
    }
    return lastResult;
  }

  private async dispatchSingle(
    item: {
      to: string[];
      subject: string;
      html?: string;
      text?: string;
      headers?: Record<string, string>;
    },
    params: SendEmailParams
  ): Promise<SendEmailResult> {
    const {to} = item;
    try {
      const payload = buildPayload(
        {
          ...params,
          to,
          subject: item.subject,
          html: item.html,
          text: item.text,
          headers: item.headers,
        },
        to,
        this.configService.get<string>("RESEND_FROM_EMAIL")!
      );
      this.logger.log(
        `📧 Attempting to send email to recipient: ${maskEmail(to[0])}`
      );
      const result = await sendWithRetry(
        () => this.resend!.emails.send(payload),
        `sendEmail to ${to.join(", ")}`,
        this.logger
      );
      if (result.error) {
        this.logger.error(`❌ Resend API error: ${result.error.message}`);
        return { success: false, error: result.error.message };
      }
      this.logger.log(`✅ Email sent successfully. ID: ${result.data?.id}`);
      return { success: true, emailId: result.data?.id };
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMessage = err?.message || "Unknown error";
      this.logger.error(
        EMAILS_MESSAGES.ERROR.SEND_FAILED(to.join(", "), errorMessage)
      );
      return { success: false, error: errorMessage };
    }
  }

  async sendBatch(
    emails: { to: string; subject: string; html: string; slug?: string }[]
  ): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    error?: string;
    results: { to: string; emailId: string | null; skipped?: boolean }[];
  }> {
    if (emails.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0, results: [] };
    }
    if (!this.resend) {
      this.logger.error("❌ Cannot send batch email: Resend not configured");
      return {
        success: false,
        sentCount: 0,
        failedCount: emails.length,
        error: EMAILS_MESSAGES.ERROR.SERVICE_NOT_CONFIGURED,
        results: emails.map((e) => ({ to: e.to, emailId: null })),
      };
    }

    const preparedRows: {
      to: string;
      subject: string;
      html: string;
      headers?: Record<string, string>;
      skipped?: boolean;
    }[] = [];

    for (const email of emails) {
      const prepared = await prepareOutboundEmail(
        {
          to: email.to,
          subject: email.subject,
          html: email.html,
          slug: email.slug,
        },
        {
          sendGate: this.sendGate,
          preferencesService: this.preferencesService,
          logger: this.logger,
        }
      );
      const row = prepared[0];
      preparedRows.push({
        to: email.to,
        subject: email.subject,
        html: row?.html ?? email.html,
        headers: row?.headers,
        skipped: row?.skipped,
      });
    }

    const sendable = preparedRows.filter((r) => !r.skipped);
    const skippedCount = preparedRows.length - sendable.length;

    if (sendable.length === 0) {
      return {
        success: true,
        sentCount: 0,
        failedCount: 0,
        results: preparedRows.map((r) => ({
          to: r.to,
          emailId: null,
          skipped: true,
        })),
      };
    }

    const from = this.configService.get<string>("RESEND_FROM_EMAIL")!;
    try {
      const payloads = sendable.map((email) =>
        buildPayload(
          {
            to: email.to,
            subject: email.subject,
            html: email.html,
            headers: email.headers,
          },
          [email.to],
          from
        )
      );
      const result = await sendWithRetry(
        () => this.resend!.batch.send(payloads),
        `sendBatch (${sendable.length} emails)`,
        this.logger
      );
      if (result.error) {
        this.logger.error(
          `EMAILS_SERVICE :: SEND_BATCH : ERROR : ${result.error.message}`
        );
        return {
          success: false,
          sentCount: 0,
          failedCount: sendable.length,
          error: result.error.message,
          results: preparedRows.map((e) => ({ to: e.to, emailId: null })),
        };
      }
      const batchIds = result.data?.data ?? [];
      let sendIdx = 0;
      const results = preparedRows.map((row) => {
        if (row.skipped) {
          return { to: row.to, emailId: null, skipped: true };
        }
        const emailId = batchIds[sendIdx]?.id ?? null;
        sendIdx += 1;
        return { to: row.to, emailId };
      });
      const sentCount = results.filter((r) => r.emailId !== null).length;
      return {
        success: true,
        sentCount,
        failedCount: sendable.length - sentCount + skippedCount,
        results,
      };
    } catch (error: unknown) {
      const message =
        (error as { message?: string })?.message || "Unknown error";
      this.logger.error(`EMAILS_SERVICE :: SEND_BATCH : ERROR : ${message}`);
      return {
        success: false,
        sentCount: 0,
        failedCount: emails.length,
        error: message,
        results: emails.map((e) => ({ to: e.to, emailId: null })),
      };
    }
  }

  async sendIntroductionRequestEmail(
    to: string,
    requesterName: string,
    contactName: string,
    message: string
  ) {
    const template = await this.findTemplateBySlug(Slug.IntroductionRequest);
    const { subject, html } = renderTemplateWithVariables(template, {
      requesterName,
      contactName,
      message,
    });
    return this.sendEmail({
      to,
      subject,
      html,
      slug: Slug.IntroductionRequest,
    });
  }

  async sendMeetingScheduledEmail(
    to: string,
    meetingDate: string,
    meetingTime: string,
    contactName: string
  ) {
    const template = await this.findTemplateBySlug(Slug.MeetingScheduled);
    const { subject, html } = renderTemplateWithVariables(template, {
      contactName,
      meetingDate,
      meetingTime,
    });
    return this.sendEmail({
      to,
      subject,
      html,
      slug: Slug.MeetingScheduled,
    });
  }

  async sendMeetingConfirmationEmail(params: AnyType) {
    if (!this.resend)
      throw new Error(EMAILS_MESSAGES.ERROR.SERVICE_NOT_CONFIGURED);
    const { roleDescription } = prepareMeetingConfirmationVariables(params);
    const template = await this.findTemplateBySlug(Slug.MeetingConfirmation);
    const trimmedPurpose =
      typeof params.meetingPurpose === "string"
        ? params.meetingPurpose.trim()
        : undefined;
    const rendered = renderTemplateWithVariables(template, {
      ...params,
      roleDescription,
      meetingPurpose: trimmedPurpose ? escapeHtml(trimmedPurpose) : undefined,
      showJoinMeeting: !params.isConnector && !!params.meetingLink,
      showMeetingReminder: !params.isConnector,
    });
    const result = await this.sendEmail({
      to: params.to,
      cc: params.cc,
      subject: rendered.subject,
      html: rendered.html,
      slug: Slug.MeetingConfirmation,
    });
    if (!result.success)
      throw new Error(EMAILS_MESSAGES.ERROR.RESEND_API_ERROR(result.error!));
    return result;
  }

  async sendIntroductionEmail(params: AnyType) {
    if (!this.resend)
      throw new Error(EMAILS_MESSAGES.ERROR.SERVICE_NOT_CONFIGURED);
    const { to, cc, customHtml, subject } = params;
    let templateHtml = customHtml;
    let templateSubject = subject;
    try {
      const dbTemplate = await this.findTemplateBySlug(Slug.IntroductionEmail);
      templateSubject = dbTemplate.subject;
      if (!templateHtml) templateHtml = dbTemplate.htmlContent;
    } catch (e) {
      if (!templateHtml) throw e;
    }
    const prepare = (isTarget: boolean) =>
      renderTemplateWithVariables(
        { subject: templateSubject, htmlContent: templateHtml },
        prepareIntroductionVariables({ ...params, isTarget })
      );
    const target = prepare(true);
    const primarySend = await this.sendEmail({
      to,
      subject: target.subject,
      html: target.html,
      slug: Slug.IntroductionEmail,
    });
    if (!primarySend.success)
      throw new Error(
        EMAILS_MESSAGES.ERROR.RESEND_API_ERROR(primarySend.error!)
      );

    let ccSend:
      | { success: boolean; emailId?: string; error?: string }
      | undefined;
    if (cc) {
      const connectorMail = prepare(false);
      ccSend = await this.sendEmail({
        to: cc,
        subject: connectorMail.subject,
        html: connectorMail.html,
        slug: Slug.IntroductionEmail,
      });
      if (!ccSend.success) {
        const ccMasked = maskEmail(cc) ?? "[redacted]";
        this.logger.error(
          `INTRODUCTION_EMAIL :: CC_SEND_FAILED :: primaryOk=true :: to=${ccMasked} :: ${ccSend.error ?? "unknown"}`
        );
      }
    }

    const { success } = primarySend;
    const ccFailed = Boolean(cc && ccSend && !ccSend.success);
    return {
      success,
      emailId: primarySend.emailId,
      primarySend,
      ccSend,
      ccFailed,
    };
  }

  async sendInviteEmail(
    to: string,
    senderName: string,
    inviteLink: string,
    inviteText?: string,
    customHtml?: string
  ) {
    let templateHtml = customHtml;
    let templateSubject = "Invitation";
    try {
      const dbTemplate = await this.findTemplateBySlug(Slug.InviteEmail);
      templateSubject = dbTemplate.subject;
      if (!templateHtml) templateHtml = dbTemplate.htmlContent;
    } catch {
      if (!templateHtml) templateHtml = "{{inviteText}}";
    }
    const trimmedInviteText = inviteText?.trim();
    const { subject, html } = renderTemplateWithVariables(
      { subject: templateSubject, htmlContent: templateHtml },
      {
        senderName,
        inviteLink,
        inviteText: trimmedInviteText
          ? escapeHtmlEmailText(trimmedInviteText)
          : undefined,
      }
    );
    return this.sendEmail({
      to,
      subject,
      html,
      slug: Slug.InviteEmail,
    });
  }

  private async sendSubNotification(slug: Slug, params: AnyType) {
    const template = await this.findTemplateBySlug(slug);
    const templateParams = { ...params };
    if (typeof templateParams.interval === "string") {
      templateParams.interval = capitalizeSubscriptionInterval(
        templateParams.interval
      );
    }
    const rendered = renderTemplateWithVariables(template, templateParams);
    return this.sendEmail({
      to: params.to,
      subject: rendered.subject,
      html: rendered.html,
      slug,
    });
  }

  async sendSubscriptionPurchaseEmail(p: AnyType) {
    return this.sendSubNotification(Slug.SubscriptionPurchase, p);
  }
  async sendSubscriptionUpgradeEmail(p: AnyType) {
    return this.sendSubNotification(Slug.SubscriptionUpgrade, p);
  }
  async sendSubscriptionDowngradeEmail(p: AnyType) {
    return this.sendSubNotification(Slug.SubscriptionDowngrade, p);
  }
  async sendSubscriptionCancellationEmail(p: AnyType) {
    return this.sendSubNotification(Slug.SubscriptionCancellation, p);
  }
  async sendSubscriptionRenewalEmail(p: AnyType) {
    return this.sendSubNotification(Slug.SubscriptionRenewal, p);
  }
  async sendPayoutStartEmail(to: string, requesterName: string) {
    const template = await this.findTemplateBySlug(Slug.PayoutStart);
    const rendered = renderTemplateWithVariables(template, { requesterName });
    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      slug: Slug.PayoutStart,
    });
  }
  async sendPayoutCompleteEmail(
    to: string,
    amount: string,
    requesterName: string
  ) {
    const template = await this.findTemplateBySlug(Slug.PayoutComplete);
    const rendered = renderTemplateWithVariables(template, {
      amount,
      requesterName,
    });
    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      slug: Slug.PayoutComplete,
    });
  }
}
