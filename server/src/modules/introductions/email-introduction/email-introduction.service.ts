import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { ContactsService } from "modules/contacts/contacts.service";
import { EmailsService } from "modules/emails/emails.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import { MaskingService } from "shared/masking.service";
import { toUTC, utcDayjs } from "utils/dayjs";
import crypto from "node:crypto";
import { SendIntroductionEmailDto } from "./email-introduction.dto";
import { IntroductionsService } from "../introductions.service";
import {
  INTRODUCTIONS_MESSAGES,
  IntroductionStatus,
  DEFAULT_EMAIL_CONFIG,
} from "../introductions.constants";
import { IntroductionNotificationsDispatchService } from "../notifications/introduction-notifications-dispatch.service";
import { INTRODUCTION_NOTIFICATION_TYPE } from "../notifications/introduction-notifications.constants";

@Injectable()
export class EmailIntroductionService {
  private readonly logger = new Logger(EmailIntroductionService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(IntroductionsService)
    private readonly introductionsService: IntroductionsService,
    private readonly emailsService: EmailsService,
    private readonly contactsService: ContactsService,
    private readonly profilesService: ProfilesService,
    private readonly configService: ConfigService,
    private readonly maskingService: MaskingService,
    private readonly introductionNotificationsDispatch: IntroductionNotificationsDispatchService
  ) {}

  async sendIntroductionEmail(
    userId: string,
    requestId: string,
    emailData: SendIntroductionEmailDto
  ) {
    // Get the introduction request
    const request = await this.introductionsService.getIntroductionRequestById(
      userId,
      requestId
    );

    // Verify user is the connector who accepted this request
    // In the multi-connector model, "owner" of a specific introduction = acceptedBy
    if (request.acceptedBy !== userId) {
      throw new ForbiddenException(
        INTRODUCTIONS_MESSAGES.ERROR.ONLY_ACCEPTED_CONNECTOR_CAN_SEND_EMAIL
      );
    }

    // Get requester and contact details
    const requester = await this.profilesService.getProfileById(
      request.requesterId
    );
    const contact = request.contactId
      ? await this.contactsService.getContactById(userId, request.contactId)
      : null;

    if (!requester) {
      throw new NotFoundException(
        INTRODUCTIONS_MESSAGES.ERROR.REQUESTER_PROFILE_NOT_FOUND
      );
    }

    if (!contact) {
      throw new NotFoundException(
        INTRODUCTIONS_MESSAGES.ERROR.CONTACT_NOT_FOUND
      );
    }

    // Get DECRYPTED contact email from contact_sensitive_data table
    const contactDecryptedEmail =
      await this.contactsService.getContactDecryptedEmail(contact.id);
    if (!contactDecryptedEmail) {
      throw new BadRequestException(
        INTRODUCTIONS_MESSAGES.ERROR.CONTACT_EMAIL_NOT_FOUND
      );
    }

    this.logger.log(INTRODUCTIONS_MESSAGES.LOG.SENDING_EMAIL(contact.id));

    // Get connector profile
    const connector = await this.profilesService.getProfileById(userId);
    if (!connector) {
      throw new NotFoundException(
        INTRODUCTIONS_MESSAGES.ERROR.CONNECTOR_PROFILE_NOT_FOUND
      );
    }

    // Generate secure booking token
    const bookingToken = crypto.randomUUID();
    const expiresAt = utcDayjs().add(30, "day").toDate();

    // Generate booking link for the target contact to schedule the meeting
    const frontendUrl = this.configService?.get<string>("FRONTEND_URL");

    const baseUrl = frontendUrl;
    const bookingLink = `${baseUrl}/book-meeting/${requestId}/${bookingToken}`;

    // Convert requester profile photo URL from S3 key to full URL (CloudFront or presigned)
    await this.profilesService.convertProfilePhotoUrlToFullUrl(requester);
    const requesterPhotoUrl = requester.profilePhotoUrl || null;

    // Send the introduction email
    try {
      const emailResult = await this.emailsService.sendIntroductionEmail({
        to: contactDecryptedEmail,
        cc: connector.email, // Always CC the connector
        subject: emailData.emailSubject,
        body: emailData.emailBody,
        requesterName:
          requester.fullName || requester.email || DEFAULT_EMAIL_CONFIG.NAME,
        targetName:
          `${contact.firstName} ${contact.lastName}`.trim() ||
          contact.email ||
          DEFAULT_EMAIL_CONFIG.NAME,
        connectorName:
          connector.fullName || connector.email || DEFAULT_EMAIL_CONFIG.NAME,
        bookingLink,
        requesterPhotoUrl,
        customHtml: emailData.customHtml,
      });

      if (emailResult.ccFailed && emailResult.ccSend) {
        this.logger.error(
          `INTRODUCTION_EMAIL_SERVICE :: sendIntroductionEmail :: CC_FAILED :: requestId=${requestId} :: ${emailResult.ccSend.error ?? "unknown"}`
        );
      }

      // Create or update email log entry for tracking via Resend webhooks
      if (emailResult.emailId) {
        // Check if an email log already exists for this introduction
        const existingLogs = await this.getEmailLogsByRequestId(requestId);

        if (existingLogs && existingLogs.length > 0) {
          // Update the most recent email log (this is a retry)
          const [latestLog] = existingLogs; // Already sorted by createdAt desc
          await this.updateEmailLog(latestLog.id, {
            resendEmailId: emailResult.emailId,
            recipientEmail:
              this.maskingService.maskEmail(contactDecryptedEmail) ||
              contactDecryptedEmail,
            subject: emailData.emailSubject,
            emailBody: emailData.emailBody,
            status: "pending",
            sentAt: toUTC(),
            // Reset tracking fields for the retry
            opened: false,
            clicked: false,
            bounced: false,
            complained: false,
            openedAt: null,
            clickedAt: null,
            bouncedAt: null,
            deliveredAt: null,
            openCount: 0,
            clickCount: 0,
            bounceReason: null,
            bounceType: null,
          });
          this.logger.log(
            INTRODUCTIONS_MESSAGES.LOG.EMAIL_LOG_UPDATED(
              requestId,
              emailResult.emailId
            )
          );
        } else {
          // Create new email log (first attempt)
          await this.createEmailLog({
            introductionRequestId: requestId,
            resendEmailId: emailResult.emailId,
            recipientEmail:
              this.maskingService.maskEmail(contactDecryptedEmail) ||
              contactDecryptedEmail,
            subject: emailData.emailSubject,
            emailBody: emailData.emailBody,
            status: "pending",
            connectorId: userId,
          });
          this.logger.log(
            INTRODUCTIONS_MESSAGES.LOG.EMAIL_LOG_CREATED(
              requestId,
              emailResult.emailId
            )
          );
        }
      }

      // Update the introduction request status with booking token (use snake_case for DB fields)
      await this.introductionsService.updateIntroductionRequestInDb(requestId, {
        status: IntroductionStatus.INTRO_SENT,
        introductionSentAt: toUTC(),
        bookingToken, // Drizzle will convert to booking_token
        bookingTokenExpiresAt: expiresAt, // Drizzle will convert to booking_token_expires_at
        proposedMeetingDate: emailData.proposedMeetingDate,
        proposedMeetingTime: emailData.proposedMeetingTime,
        meetingDuration: emailData.meetingDuration,
      });

      void this.introductionNotificationsDispatch.dispatch({
        requestId,
        type: INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_INTRO_SENT,
      });

      return {
        success: emailResult.success,
        message: INTRODUCTIONS_MESSAGES.INFO.EMAIL_SENT,
        ...(emailResult.ccFailed ? { ccFailed: true as const } : {}),
      };
    } catch (error) {
      this.logger.error(INTRODUCTIONS_MESSAGES.LOG.ERROR_SENDING_EMAIL, error);
      throw new BadRequestException(
        INTRODUCTIONS_MESSAGES.ERROR.FAILED_TO_SEND_EMAIL
      );
    }
  }

  async getEmailLogs(userId: string, requestId: string) {
    // Verify user has access to this request
    await this.introductionsService.getIntroductionRequestById(
      userId,
      requestId
    );
    // Fetch email logs for this introduction request
    return this.getEmailLogsByRequestId(requestId);
  }

  private async getEmailLogsByRequestId(requestId: string) {
    return await this.db.query.introductionEmailLogs.findMany({
      columns: {
        id: true,
        recipientEmail: true,
        subject: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        clicked: true,
        clickedAt: true,
        clickCount: true,
        bounced: true,
        bouncedAt: true,
        bounceType: true,
        bounceReason: true,
        lastEventType: true,
        lastEventAt: true,
        rawEvents: true,
        createdAt: true,
      },
      where: eq(schema.introductionEmailLogs.introductionRequestId, requestId),
      orderBy: (logs, { desc: descFn }) => [descFn(logs.createdAt)],
    });
  }

  private async createEmailLog(data: AnyType) {
    const [log] = await this.db
      .insert(schema.introductionEmailLogs)
      .values(data)
      .returning();
    return log;
  }

  async updateEmailLog(id: string, data: AnyType) {
    const [log] = await this.db
      .update(schema.introductionEmailLogs)
      .set({ ...data, updatedAt: toUTC() })
      .where(eq(schema.introductionEmailLogs.id, id))
      .returning();
    return log;
  }
}
