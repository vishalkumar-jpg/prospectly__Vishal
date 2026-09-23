import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import { dayjs } from "utils/dayjs";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { ContactsService } from "modules/contacts/contacts.service";
import { CalendarService } from "modules/calendar/calendar.service";
import { EmailsService } from "modules/emails/emails.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import { eq, desc } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { AnyType } from "types/common";
import * as crypto from "node:crypto";
import { IntroductionsService } from "../introductions.service";
import {
  INTRODUCTIONS_MESSAGES,
  IntroductionStatus,
} from "../introductions.constants";

@Injectable()
export class RescheduleMeetingService {
  private readonly logger = new Logger(RescheduleMeetingService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(IntroductionsService)
    private readonly introductionsService: IntroductionsService,
    private readonly calendarService: CalendarService,
    private readonly contactsService: ContactsService,
    private readonly profilesService: ProfilesService,
    private readonly emailsService: EmailsService
  ) {}

  /**
   * Reschedule a meeting by resending the original introduction email
   * This allows the prospect to book a new meeting time
   */
  async rescheduleMeeting(userId: string, requestId: string) {
    // Get the introduction request
    const requestData =
      await this.introductionsService.getIntroductionRequest(requestId);

    if (!requestData) {
      throw new NotFoundException(
        INTRODUCTIONS_MESSAGES.ERROR.REQUEST_NOT_FOUND
      );
    }
    const request = requestData as AnyType;

    // Verify user is the connector who accepted this request
    if (request.acceptedBy !== userId) {
      throw new ForbiddenException(
        "Only the connector who accepted this request can reschedule the meeting"
      );
    }

    // Verify meeting is in meeting_booked status
    if (request.status !== IntroductionStatus.MEETING_BOOKED) {
      throw new BadRequestException(
        "Can only reschedule meetings that are in booked status"
      );
    }

    // Get scheduled meeting to check if time has passed
    const scheduledMeeting =
      await this.calendarService.getScheduledMeetingByIntroductionRequestId(
        requestId
      );

    if (!scheduledMeeting) {
      throw new NotFoundException("No scheduled meeting found");
    }

    // Check if meeting time has passed
    const meetingTime = dayjs(scheduledMeeting.meetingDate);
    const now = dayjs();

    if (meetingTime.isAfter(now)) {
      throw new BadRequestException(
        "Cannot reschedule a meeting that hasn't occurred yet. The scheduled meeting is still in the future."
      );
    }

    // Retrieve original email from introduction_email_logs
    const emailLogs = await this.db.query.introductionEmailLogs.findMany({
      where: (logs) => eq(logs.introductionRequestId, requestId),
      orderBy: (logs) => [desc(logs.createdAt)],
      limit: 1,
    });

    if (!emailLogs || emailLogs.length === 0) {
      throw new NotFoundException(
        "Original introduction email not found. Cannot reschedule."
      );
    }

    const [originalEmail] = emailLogs;

    // Get requester and contact details for resending email
    const requester = await this.profilesService.getProfileById(
      request.requesterId
    );
    const contact = request.contactId
      ? await this.contactsService.getContactByIdMinimal(request.contactId)
      : null;

    if (!requester || !contact) {
      throw new NotFoundException("Required user details not found");
    }

    // Get decrypted contact email
    const contactRealEmail =
      await this.contactsService.getContactDecryptedEmail(request.contactId);

    if (!contactRealEmail) {
      throw new BadRequestException("Contact email not found");
    }

    // Get connector details
    const connector = await this.profilesService.getProfileById(userId);
    if (!connector) {
      throw new NotFoundException("Connector profile not found");
    }

    // Generate new booking token
    const bookingToken = crypto.randomUUID();
    const expiresAt = toUTC();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

    // Generate new booking link
    const frontendUrl = process.env.FRONTEND_URL;
    const bookingLink = `${frontendUrl}/book-meeting/${requestId}/${bookingToken}`;

    // Convert requester profile photo URL
    await this.profilesService.convertProfilePhotoUrlToFullUrl(requester);
    const requesterPhotoUrl = requester.profilePhotoUrl || null;

    // Resend the introduction email with original content
    try {
      const emailResult = await this.emailsService.sendIntroductionEmail({
        to: contactRealEmail,
        cc: connector.email,
        subject: originalEmail.subject,
        body: originalEmail.emailBody || "",
        requesterName: requester.fullName || requester.email || "Requester",
        targetName:
          `${contact.firstName} ${contact.lastName}`.trim() || "Prospect",
        connectorName: connector.fullName || connector.email || "Connector",
        bookingLink,
        requesterPhotoUrl,
      });

      if (emailResult.ccFailed && emailResult.ccSend) {
        this.logger.error(
          `RESCHEDULE_MEETING_SERVICE :: sendIntroductionEmail :: CC_FAILED :: requestId=${requestId} :: ${emailResult.ccSend.error ?? "unknown"}`
        );
      }

      if (!emailResult.emailId) {
        this.logger.warn(
          `Missing emailId for rescheduled meeting. RequestID: ${requestId}, Recipient: ${originalEmail.recipientEmail}, UserID: ${userId}`
        );
      }

      await this.db.transaction(async (tx) => {
        // Create new email log entry for the rescheduled email
        await tx.insert(schema.introductionEmailLogs).values({
          introductionRequestId: requestId,
          resendEmailId: emailResult.emailId || null,
          recipientEmail: originalEmail.recipientEmail,
          subject: originalEmail.subject,
          emailBody: originalEmail.emailBody,
          status: "pending",
          connectorId: userId,
        });

        // Update the scheduled meeting status to 'meeting_rescheduled' instead of deleting
        await tx
          .update(schema.scheduledMeetings)
          .set({
            status: "meeting_rescheduled",
            metadata: {
              ...((scheduledMeeting.metadata as object) || {}),
              rescheduledAt: toUTC().toISOString(),
              originalMeetingDate: scheduledMeeting.meetingDate,
            },
            updatedAt: toUTC(),
          })
          .where(eq(schema.scheduledMeetings.id, scheduledMeeting.id));

        // Update the introduction request with new booking token and 'meeting_rescheduled' status
        // Clear meetingLink to hide old meeting details from UI
        await tx
          .update(schema.introductionRequests)
          .set({
            status: IntroductionStatus.MEETING_RESCHEDULED,
            bookingToken,
            bookingTokenExpiresAt: expiresAt,
            updatedAt: toUTC(),
          })
          .where(eq(schema.introductionRequests.id, requestId));
      });

      return {
        success: true,
        message: emailResult.ccFailed
          ? "Meeting rescheduled successfully. A new booking link was sent to the prospect; the connector copy could not be delivered."
          : "Meeting rescheduled successfully. A new booking link has been sent to the prospect.",
        ...(emailResult.ccFailed ? { ccFailed: true as const } : {}),
      };
    } catch (error) {
      this.logger.error(
        `Failed to reschedule meeting for request ${requestId}: ${error.message}`,
        error
      );
      throw new BadRequestException(
        "Failed to reschedule meeting. Please try again."
      );
    }
  }
}
