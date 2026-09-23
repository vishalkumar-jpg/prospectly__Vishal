import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Webhook } from "svix";
import { toUTC } from "utils/dayjs";
import { IntroductionsService } from "modules/introductions/introductions.service";
import { EmailIntroductionService } from "modules/introductions/email-introduction/email-introduction.service";
import { PaymentsService } from "modules/payments/payments.service";
import { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { NotificationSendGateService } from "modules/notification-preferences/notification-send-gate.service";
import {
  STATUS_PRIORITY,
  RESEND_WEBHOOKS_MESSAGES,
  RESEND_WEBHOOKS_EVENT_TYPES,
  RESEND_WEBHOOKS_STATUS,
} from "./resend-webhooks.constants";
import {
  extractRecipientEmailFromWebhook,
  maybeSuppressFromResendEvent,
} from "./resend-suppression.helper";

@Injectable()
export class ResendWebhooksService {
  private readonly logger = new Logger(ResendWebhooksService.name);

  constructor(
    @Inject(IntroductionsService)
    private readonly introductionsService: IntroductionsService,
    @Inject(EmailIntroductionService)
    private readonly emailIntroductionService: EmailIntroductionService,
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    private readonly recruitmentEmailLogsService: RecruitmentEmailLogsService,
    private readonly sendGate: NotificationSendGateService,
    private readonly configService: ConfigService
  ) {}

  private shouldUpdateStatus(
    currentStatus: string | null,
    newStatus: string
  ): boolean {
    const currentPriority =
      STATUS_PRIORITY[currentStatus as keyof typeof STATUS_PRIORITY] ?? 0;
    const newPriority =
      STATUS_PRIORITY[newStatus as keyof typeof STATUS_PRIORITY] ?? 0;

    if (newPriority >= 100) return true;
    return newPriority > currentPriority;
  }

  async handleWebhook(payload: AnyType) {
    const { type, data } = payload;
    const emailId = data?.email_id;

    this.logger.log(`Resend webhook received: ${type} for email: ${emailId}`);

    if (!emailId) {
      this.logger.error("No email_id in webhook data");
      throw new BadRequestException(
        RESEND_WEBHOOKS_MESSAGES.ERROR.MISSING_EMAIL_ID
      );
    }

    const logEntry =
      await this.introductionsService.getEmailLogByResendId(emailId);

    if (!logEntry) {
      const recruitmentHandled =
        await this.recruitmentEmailLogsService.applyWebhookEvent({
          providerId: emailId,
          eventType: type,
          createdAt: data?.created_at,
          detailType:
            data?.bounce?.type ??
            (typeof data?.error === "object" ? data?.error?.name : undefined),
          detailReason:
            data?.bounce?.message ??
            (typeof data?.error === "string"
              ? data.error
              : data?.error?.message),
          rawEvent: payload as Record<string, unknown>,
        });

      if (recruitmentHandled) {
        return {
          success: true,
          message: "Recruitment email webhook processed",
          email_id: emailId,
          event_type: type,
        };
      }

      this.logger.warn(`Email log not found for: ${emailId}`);
      return {
        success: true,
        message: "Webhook received but email log not found",
        email_id: emailId,
        event_type: type,
      };
    }

    const currentEvents = Array.isArray(logEntry.rawEvents)
      ? logEntry.rawEvents
      : [];

    const updateData: AnyType = {
      lastEventType: type,
      lastEventAt: toUTC(),
      rawEvents: [
        ...currentEvents,
        { type, data, timestamp: toUTC().toISOString() },
      ],
    };

    switch (type) {
      case RESEND_WEBHOOKS_EVENT_TYPES.EMAIL_SENT:
        if (
          this.shouldUpdateStatus(logEntry.status, RESEND_WEBHOOKS_STATUS.SENT)
        ) {
          updateData.status = RESEND_WEBHOOKS_STATUS.SENT;
        }
        updateData.sentAt = data.created_at ? toUTC(data.created_at) : toUTC();
        break;

      case RESEND_WEBHOOKS_EVENT_TYPES.EMAIL_DELIVERED:
        if (
          this.shouldUpdateStatus(
            logEntry.status,
            RESEND_WEBHOOKS_STATUS.DELIVERED
          )
        ) {
          updateData.status = RESEND_WEBHOOKS_STATUS.DELIVERED;
        }
        updateData.deliveredAt = data.created_at
          ? toUTC(data.created_at)
          : toUTC();

        // Trigger 5% payment capture on email delivery confirmation
        if (logEntry.introductionRequestId) {
          try {
            const request =
              await this.introductionsService.getIntroductionRequestByIdSlim(
                logEntry.introductionRequestId
              );

            if (request && request.requesterId) {
              this.logger.log(
                `Email delivered for request ${logEntry.introductionRequestId}, triggering 5% payment capture`
              );
              await this.paymentsService.captureIntroSentPayment(
                request.requesterId,
                logEntry.introductionRequestId
              );
              this.logger.log(
                `5% payment capture successful for request ${logEntry.introductionRequestId}`
              );
            } else {
              this.logger.warn(
                `Could not find request or requesterId for ${logEntry.introductionRequestId}`
              );
            }
          } catch (paymentError) {
            this.logger.error(
              `Failed to capture 5% payment for request ${logEntry.introductionRequestId}: ${paymentError.message}`
            );
            // Log payment error but don't fail the webhook - email was still delivered
          }
        }
        break;

      case RESEND_WEBHOOKS_EVENT_TYPES.EMAIL_DELIVERY_DELAYED:
        if (
          this.shouldUpdateStatus(
            logEntry.status,
            RESEND_WEBHOOKS_STATUS.DELIVERY_DELAYED
          )
        ) {
          updateData.status = RESEND_WEBHOOKS_STATUS.DELIVERY_DELAYED;
        }
        break;

      case RESEND_WEBHOOKS_EVENT_TYPES.EMAIL_SCHEDULED:
        if (
          this.shouldUpdateStatus(
            logEntry.status,
            RESEND_WEBHOOKS_STATUS.SCHEDULED
          )
        ) {
          updateData.status = RESEND_WEBHOOKS_STATUS.SCHEDULED;
        }
        break;

      case RESEND_WEBHOOKS_EVENT_TYPES.EMAIL_RECEIVED:
        if (
          this.shouldUpdateStatus(
            logEntry.status,
            RESEND_WEBHOOKS_STATUS.RECEIVED
          )
        ) {
          updateData.status = RESEND_WEBHOOKS_STATUS.RECEIVED;
        }
        break;

      case RESEND_WEBHOOKS_EVENT_TYPES.EMAIL_FAILED:
        updateData.status = RESEND_WEBHOOKS_STATUS.FAILED;
        if (data.error) {
          updateData.bounceReason =
            typeof data.error === "string"
              ? data.error
              : data.error.message || "Email delivery failed";
        } else {
          updateData.bounceReason =
            "Email delivery failed - no specific reason provided";
        }

        if (logEntry.introductionRequestId) {
          await this.introductionsService.updateIntroductionRequestInDb(
            logEntry.introductionRequestId,
            {
              status: "email_failed",
            }
          );
        }
        break;

      case RESEND_WEBHOOKS_EVENT_TYPES.EMAIL_BOUNCED:
        updateData.status = RESEND_WEBHOOKS_STATUS.BOUNCED;
        updateData.bounced = true;
        updateData.bouncedAt = data.created_at
          ? toUTC(data.created_at)
          : toUTC();
        updateData.bounceType = data.bounce?.type || "unknown";
        updateData.bounceReason = data.bounce?.message || "No reason provided";

        if (logEntry.introductionRequestId) {
          await this.introductionsService.updateIntroductionRequestInDb(
            logEntry.introductionRequestId,
            {
              status: "email_failed",
            }
          );
        }
        break;

      case RESEND_WEBHOOKS_EVENT_TYPES.EMAIL_CLICKED:
        updateData.clicked = true;
        if (!logEntry.clickedAt) {
          updateData.clickedAt = data.created_at
            ? toUTC(data.created_at)
            : toUTC();
        }
        updateData.clickCount = (logEntry.clickCount || 0) + 1;
        break;

      case RESEND_WEBHOOKS_EVENT_TYPES.EMAIL_COMPLAINED:
        updateData.status = RESEND_WEBHOOKS_STATUS.COMPLAINED;
        break;

      default:
        this.logger.log(`Unknown event type: ${type}`);
    }

    await this.emailIntroductionService.updateEmailLog(logEntry.id, updateData);

    await maybeSuppressFromResendEvent(
      this.sendGate,
      this.logger,
      type,
      logEntry.recipientEmail ?? extractRecipientEmailFromWebhook(data),
      data?.bounce?.type
    );

    this.logger.log(`Email webhook processed for ${emailId}, event: ${type}`);

    return { success: true, processed: type };
  }

  verifyWebhookSignature(
    payload: string | Buffer,
    headers: {
      "svix-id"?: string;
      "svix-timestamp"?: string;
      "svix-signature"?: string;
    }
  ): Record<string, unknown> {
    const webhookSecret = this.configService.get<string>(
      "RESEND_WEBHOOK_SECRET"
    );

    if (!webhookSecret) {
      this.logger.error("RESEND_WEBHOOK_SECRET is not configured");
      throw new ForbiddenException(
        RESEND_WEBHOOKS_MESSAGES.ERROR.MISSING_WEBHOOK_SECRET
      );
    }

    const {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    } = headers;

    if (!svixId || !svixTimestamp || !svixSignature) {
      this.logger.warn("Missing required signature headers", {
        hasId: !!svixId,
        hasTimestamp: !!svixTimestamp,
        hasSignature: !!svixSignature,
      });
      throw new UnauthorizedException(
        RESEND_WEBHOOKS_MESSAGES.ERROR.MISSING_SIGNATURE_HEADERS
      );
    }

    try {
      const wh = new Webhook(webhookSecret);
      const verifiedPayload = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as Record<string, unknown>;

      this.logger.log("Webhook signature verified successfully");
      return verifiedPayload;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown verification error";
      this.logger.warn(
        `Webhook signature verification failed: ${errorMessage}`
      );
      throw new UnauthorizedException(
        RESEND_WEBHOOKS_MESSAGES.ERROR.INVALID_SIGNATURE
      );
    }
  }
}
