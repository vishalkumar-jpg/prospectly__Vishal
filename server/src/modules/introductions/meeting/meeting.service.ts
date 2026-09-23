import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { dayjs, utcDayjs, getTimezoneLabel } from "utils/dayjs";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { ContactsService } from "modules/contacts/contacts.service";
import { CalendarService } from "modules/calendar/calendar.service";
import {
  resolveBookingCalendarTimezone,
  resolveRecipientDisplayTimezone,
  toGoogleCalendarDateTime,
} from "modules/calendar/microsoft/microsoft-graph-datetime.utils";
import { EmailsService } from "modules/emails/emails.service";
import { BountyStagesService } from "modules/bounty-stages/bounty-stages.service";
import { PaymentsService } from "modules/payments/payments.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { AnyType } from "types/common";
import { ConfirmMeetingBookingDto } from "./meeting.dto";
import { IntroductionsService } from "../introductions.service";
import {
  INTRODUCTIONS_MESSAGES,
  IntroductionStatus,
} from "../introductions.constants";

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(IntroductionsService)
    private readonly introductionsService: IntroductionsService,
    private readonly calendarService: CalendarService,
    private readonly contactsService: ContactsService,
    private readonly profilesService: ProfilesService,
    private readonly paymentsService: PaymentsService,
    private readonly emailsService: EmailsService,
    private readonly bountyStagesService: BountyStagesService
  ) {}

  async getBookingAvailability(requestId: string, bookingToken: string) {
    // Get introduction request by ID
    const requestData =
      await this.introductionsService.getIntroductionRequest(requestId);

    if (!requestData) {
      throw new NotFoundException(
        INTRODUCTIONS_MESSAGES.ERROR.REQUEST_NOT_FOUND
      );
    }
    const request = requestData as AnyType;

    // Validate booking token
    if (request.bookingToken !== bookingToken) {
      throw new ForbiddenException(
        INTRODUCTIONS_MESSAGES.ERROR.INVALID_BOOKING_LINK
      );
    }

    // Check if token is expired
    if (
      request.bookingTokenExpiresAt &&
      dayjs(request.bookingTokenExpiresAt).isBefore(dayjs())
    ) {
      throw new ForbiddenException(
        INTRODUCTIONS_MESSAGES.ERROR.BOOKING_LINK_EXPIRED
      );
    }

    // Get requester details
    const requester = await this.profilesService.getProfileById(
      request.requesterId
    );
    // Convert requester profile photo URL
    if (requester) {
      await this.profilesService.convertProfilePhotoUrlToFullUrl(requester);
    }
    const requesterPhotoUrl = requester?.profilePhotoUrl || null;

    // Get contact details (the person who will be booking the meeting)
    const contact = request.contactId
      ? await this.contactsService.getContactByIdMinimal(request.contactId)
      : null;
    // Convert contact profile photo URL if it exists
    let targetContactPhotoUrl = null;
    if (contact && contact.profilePhotoUrl) {
      const contactWithPhoto = { ...contact };
      await this.profilesService.convertProfilePhotoUrlToFullUrl(
        contactWithPhoto
      );
      targetContactPhotoUrl = contactWithPhoto.profilePhotoUrl || null;
    }

    // Get decrypted (real) email for the contact - required for calendar invites
    let contactRealEmail = "";
    if (request.contactId) {
      const decryptedEmail =
        await this.contactsService.getContactDecryptedEmail(request.contactId);
      contactRealEmail = decryptedEmail || "";
      this.logger.log(
        INTRODUCTIONS_MESSAGES.LOG.MASKED_EMAIL_LOG(
          request.contactId,
          contact?.email,
          !!contactRealEmail
        )
      );
    }

    // Attempt to find a user profile for the contact to get their Trust Score
    let prospectUser = null;
    if (contactRealEmail) {
      try {
        prospectUser =
          await this.profilesService.getProfileByEmail(contactRealEmail);
      } catch {
        // Ignore error if profile not found
      }
    }

    // Get connector details (in multi-connector model, connector is the user who accepted the request)
    const connector = request.acceptedBy
      ? await this.profilesService.getProfileById(request.acceptedBy)
      : null;
    // Convert connector profile photo URL
    let connectorPhotoUrl = null;
    if (connector) {
      await this.profilesService.convertProfilePhotoUrlToFullUrl(connector);
      connectorPhotoUrl = connector.profilePhotoUrl || null;
    }

    // Get real calendar availability from requester's connected calendar
    let availableSlots: Array<{ start: string; end: string }> = [];
    let calendarTimezone: string | null = null;
    let hasCalendarConnected = false;

    try {
      // Check if requester has an active calendar integration
      const activeCalendarIntegration =
        await this.calendarService.getActiveCalendarIntegration(
          request.requesterId
        );

      if (activeCalendarIntegration) {
        hasCalendarConnected = true;
        // Fetch real availability from calendar API
        // Need 15 days to cover 24-hour buffer + 14-day booking window
        const slotsResult = await this.calendarService.getAvailableSlots(
          request.requesterId,
          15 // Get slots for next 15 days to cover 24hr buffer + 14-day window
        );
        availableSlots = slotsResult.slots;
        calendarTimezone = slotsResult.timezone;
        this.logger.log(
          INTRODUCTIONS_MESSAGES.LOG.FETCHED_SLOTS(availableSlots.length)
        );
      } else {
        // Fallback to mock slots if no active calendar connected
        hasCalendarConnected = false;
        this.logger.warn(
          INTRODUCTIONS_MESSAGES.LOG.USING_MOCK_SLOTS(request.requesterId)
        );
        availableSlots = [];
      }
    } catch (error) {
      this.logger.error(
        INTRODUCTIONS_MESSAGES.LOG.ERROR_FETCHING_AVAILABILITY,
        error
      );
      // Fallback to mock slots on error
      hasCalendarConnected = false;
      availableSlots = [];
    }

    // CRITICAL FIX: Filter out already-booked time slots using scheduled_meetings
    if (
      request.status === IntroductionStatus.MEETING_BOOKED ||
      request.status === IntroductionStatus.MEETING_RESCHEDULED ||
      request.status === IntroductionStatus.MEETING_COMPLETED
    ) {
      const scheduledMeeting =
        await this.calendarService.getScheduledMeetingByIntroductionRequestId(
          requestId
        );
      // Only filter out slots if status is 'scheduled' or 'completed', not 'meeting_rescheduled'
      if (
        scheduledMeeting?.meetingDate &&
        scheduledMeeting.status !== "meeting_rescheduled"
      ) {
        try {
          const bookedDateTime = dayjs(scheduledMeeting.meetingDate);

          if (!bookedDateTime.isValid()) {
            this.logger.error(INTRODUCTIONS_MESSAGES.ERROR.INVALID_BOOKED_DATE);
            throw new Error(INTRODUCTIONS_MESSAGES.ERROR.INVALID_BOOKED_DATE);
          }

          const durationMinutes = scheduledMeeting.meetingDuration ?? 30;
          const bookedEndTime = bookedDateTime.add(durationMinutes, "minute");

          availableSlots = availableSlots.filter((slot) => {
            const slotStart = dayjs(slot.start);
            const slotEnd = dayjs(slot.end);

            const overlaps =
              (slotStart.isSameOrAfter(bookedDateTime) &&
                slotStart.isBefore(bookedEndTime)) ||
              (slotEnd.isAfter(bookedDateTime) &&
                slotEnd.isSameOrBefore(bookedEndTime)) ||
              (slotStart.isSameOrBefore(bookedDateTime) &&
                slotEnd.isSameOrAfter(bookedEndTime));

            return !overlaps;
          });

          this.logger.log(
            INTRODUCTIONS_MESSAGES.LOG.FILTERED_SLOT(
              bookedDateTime.toISOString(),
              bookedEndTime.toISOString()
            )
          );
        } catch (error) {
          this.logger.error(
            "Error filtering booked slot from scheduled_meetings:",
            error
          );
        }
      }
    }

    // Get scheduled meeting details if already booked
    // MEETING_RESCHEDULED should allow rebooking, so only MEETING_BOOKED and MEETING_COMPLETED count as "already booked"
    const isAlreadyBooked =
      request.status === IntroductionStatus.MEETING_BOOKED ||
      request.status === IntroductionStatus.MEETING_COMPLETED;

    let scheduledMeetingData = undefined;
    if (isAlreadyBooked) {
      const scheduledMeeting =
        await this.calendarService.getScheduledMeetingByIntroductionRequestId(
          requestId
        );
      // Only show meeting details if status is 'scheduled' or 'completed', not 'meeting_rescheduled'
      if (
        scheduledMeeting?.meetingDate &&
        scheduledMeeting.status !== "meeting_rescheduled"
      ) {
        const meetingStart = dayjs(scheduledMeeting.meetingDate);
        const meetingDuration = scheduledMeeting.meetingDuration ?? 30;
        const meetingEnd = meetingStart.add(meetingDuration, "minute");

        scheduledMeetingData = {
          startTime: meetingStart.toISOString(),
          endTime: meetingEnd.toISOString(),
          duration: meetingDuration,
          timezone:
            (scheduledMeeting.metadata as Record<string, AnyType>)?.timezone ||
            calendarTimezone ||
            "UTC",
          meetingUrl:
            scheduledMeeting.meetingLink || request.meetingLink || undefined,
        };
      }
    }

    return {
      success: true,
      requestId: request.id,
      requesterId: request.requesterId,
      requesterName: requester?.fullName || "Unknown",
      requesterEmail: requester?.email || "",
      requesterCompany: requester?.company || "",
      requesterTitle: requester?.jobTitle || "",
      requesterPhotoUrl,
      requesterLinkedInUrl: requester?.linkedinUrl || null,
      requesterTrustScore: requester?.trustScore ?? 0,
      targetContactId: request.contactId || null,
      targetContactName: contact
        ? `${contact.firstName} ${contact.lastName}`.trim()
        : "Unknown",
      targetContactEmail: contactRealEmail || "",
      targetContactPhotoUrl,
      targetContactLinkedInUrl: contact?.linkedin || null,
      targetContactTrustScore: prospectUser?.trustScore ?? 0,
      connectorId: request.acceptedBy || null,
      connectorName: connector?.fullName || "Unknown",
      connectorEmail: connector?.email || "",
      connectorPhotoUrl,
      connectorLinkedInUrl: connector?.linkedinUrl || null,
      connectorTrustScore: connector?.trustScore ?? 0,
      message: request.meetingDescription || "",
      meetingTitle: request.meetingTitle || "",
      bountyAmount: request.bountyAmount || 0,
      status: request.status,
      // For booked/completed meetings, derive meeting date/duration from scheduled_meetings
      proposedMeetingDate: undefined,
      proposedMeetingTime: undefined,
      meetingDuration: "30min",
      meetingPlatform: "virtual",
      requesterTimezone: calendarTimezone || "UTC", // Actual timezone from calendar or default
      availableSlots, // Return filtered slots (excludes booked time)
      hasCalendarConnected, // Flag indicating if requester has calendar connected
      isAlreadyBooked,
      meeting_booked: isAlreadyBooked, // For backward compatibility
      scheduledMeeting: scheduledMeetingData,
      requestCreatedAt: request.createdAt, // For 24-hour buffer calculation on frontend
    };
  }

  async confirmMeetingBooking(
    requestId: string,
    bookingToken: string,
    bookingData: ConfirmMeetingBookingDto
  ) {
    // Get and validate the introduction request
    const requestData =
      await this.introductionsService.getIntroductionRequest(requestId);

    if (!requestData) {
      throw new NotFoundException(
        INTRODUCTIONS_MESSAGES.ERROR.REQUEST_NOT_FOUND
      );
    }
    const request = requestData as AnyType;

    // IDEMPOTENCY CHECK: Prevent duplicate meeting bookings
    // Only MEETING_BOOKED and MEETING_COMPLETED prevent rebooking
    // MEETING_RESCHEDULED should allow rebooking
    if (
      request.status === IntroductionStatus.MEETING_BOOKED ||
      request.status === IntroductionStatus.MEETING_COMPLETED
    ) {
      this.logger.log(
        INTRODUCTIONS_MESSAGES.LOG.MEETING_ALREADY_BOOKED(requestId)
      );
      throw new ConflictException(
        INTRODUCTIONS_MESSAGES.ERROR.MEETING_ALREADY_BOOKED
      );
    }

    // Validate booking token
    if (request.bookingToken !== bookingToken) {
      throw new ForbiddenException(
        INTRODUCTIONS_MESSAGES.ERROR.INVALID_BOOKING_LINK
      );
    }

    // Check if token is expired
    if (
      request.bookingTokenExpiresAt &&
      dayjs(request.bookingTokenExpiresAt).isBefore(dayjs())
    ) {
      throw new ForbiddenException(
        INTRODUCTIONS_MESSAGES.ERROR.BOOKING_LINK_EXPIRED
      );
    }

    // CRITICAL: Capture the 95% payment BEFORE proceeding with meeting booking
    // This ensures we have funds secured before creating the calendar event
    this.logger.log(
      `Attempting to capture 95% payment for request ${requestId} before meeting booking`
    );
    try {
      const captureResult =
        await this.paymentsService.captureMeetingBookedPayment("", requestId);
      this.logger.log(
        `95% payment captured successfully for request ${requestId}: ${JSON.stringify(captureResult)}`
      );
    } catch (paymentError) {
      this.logger.error(
        `Failed to capture 95% payment for request ${requestId}: ${paymentError.message}`
      );
      throw new BadRequestException(
        INTRODUCTIONS_MESSAGES.ERROR.FAILED_CAPTURE_PAYMENT(
          paymentError.message
        )
      );
    }

    // Parse the selected slot time
    dayjs(bookingData.selectedSlot.start);

    // Update the introduction request with status only; meeting details live in scheduled_meetings
    await this.introductionsService.updateIntroductionRequestInDb(requestId, {
      status: IntroductionStatus.MEETING_BOOKED,
    });

    // Get requester and connector details for confirmation email
    const requester = await this.profilesService.getProfileById(
      request.requesterId
    );
    // Connector is now the user who accepted the request (acceptedBy)
    const connector = request.acceptedBy
      ? await this.profilesService.getProfileById(request.acceptedBy)
      : null;

    // Calendar wall clock must match the timezone the prospect used when picking the slot.
    const eventTimezone = resolveBookingCalendarTimezone(
      bookingData.timezone,
      bookingData.requesterTimezone
    );

    // Check if there's an existing scheduled meeting that was rescheduled
    const existingScheduledMeeting =
      await this.calendarService.getScheduledMeetingByIntroductionRequestId(
        requestId
      );
    const wasRescheduled =
      existingScheduledMeeting?.status === "meeting_rescheduled";

    // Create calendar event on requester's connected calendar (Google or Microsoft)
    let meetingLinkForEmails: string | undefined;
    try {
      // Check if requester has a calendar integration connected
      const calendarIntegrations =
        await this.calendarService.getUserCalendarIntegrations(
          request.requesterId
        );

      if (calendarIntegrations && calendarIntegrations.length > 0) {
        // Find the active calendar integration
        const activeIntegration = calendarIntegrations.find(
          (i) => i.isActive === true
        );

        if (!activeIntegration) {
          this.logger.log(
            INTRODUCTIONS_MESSAGES.LOG.SKIPPING_CALENDAR(request.requesterId)
          );
          // Meeting is still booked, but without active calendar integration
        } else if (activeIntegration.provider === "google") {
          // Google Calendar event creation
          // Note: Google Calendar API makes the calendar owner (requester) the organizer
          // We make it clear in the description that the prospect booked this meeting
          const requesterName =
            requester?.fullName ||
            requester?.firstName ||
            requester?.email?.split("@")[0] ||
            "Organizer";
          const googleStart = toGoogleCalendarDateTime(
            bookingData.selectedSlot.start,
            eventTimezone
          );
          const googleEnd = toGoogleCalendarDateTime(
            bookingData.selectedSlot.end,
            eventTimezone
          );
          const calendarEvent = {
            summary:
              request.meetingTitle ||
              `Meeting: ${requesterName} & ${bookingData.targetContactName}`,
            description: `Organized by: ${requesterName}${requester?.email ? ` (${requester.email})` : ""}\n\nBooked by: ${bookingData.targetContactName}\nIntroduced by: ${connector?.fullName || "Connector"}\n\nMeeting Purpose:\n${request.meetingDescription || "Introduction meeting"}\n\n---\nThis meeting was scheduled through Prospectly. ${bookingData.targetContactName} selected this time slot from your available times.`,
            start: {
              dateTime: googleStart.dateTime,
              timeZone: googleStart.timeZone,
            },
            end: {
              dateTime: googleEnd.dateTime,
              timeZone: googleEnd.timeZone,
            },
            attendees: [
              {
                email: bookingData.targetContactEmail,
                displayName: bookingData.targetContactName,
              },
            ],
            conferenceData: {
              createRequest: {
                requestId: `intro-${requestId}`,
                conferenceSolutionKey: { type: "hangoutsMeet" },
              },
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: "email", minutes: 24 * 60 }, // 1 day before
                { method: "popup", minutes: 30 }, // 30 minutes before
              ],
            },
            guestsCanModify: false,
            guestsCanInviteOthers: false,
            guestsCanSeeOtherGuests: true,
          };

          this.logger.log(
            INTRODUCTIONS_MESSAGES.LOG.CREATING_CALENDAR_EVENT(
              request.requesterId
            )
          );
          this.logger.log(
            INTRODUCTIONS_MESSAGES.LOG.CALENDAR_ATTENDEES(
              requester?.email,
              bookingData.targetContactEmail
            )
          );
          const createdEvent = await this.calendarService.createEvent(
            request.requesterId,
            calendarEvent
          );

          this.logger.log(
            INTRODUCTIONS_MESSAGES.LOG.CALENDAR_EVENT_CREATED(createdEvent.id)
          );
          this.logger.log(
            INTRODUCTIONS_MESSAGES.LOG.MEEETING_LINK(
              createdEvent.hangoutLink || "N/A"
            )
          );

          // Extract conference ID from hangoutLink (e.g., "https://meet.google.com/abc-defg-hij")
          let conferenceId: string | undefined;
          if (createdEvent.hangoutLink) {
            const match = createdEvent.hangoutLink.match(
              /meet\.google\.com\/([a-z-]+)/
            );
            conferenceId = match ? match[1] : undefined;
          }

          meetingLinkForEmails = createdEvent.hangoutLink || undefined;

          // Update existing scheduled_meeting if it was rescheduled, otherwise create new
          if (wasRescheduled && existingScheduledMeeting) {
            await this.calendarService.updateScheduledMeeting(
              existingScheduledMeeting.id,
              {
                meetingDate: dayjs(bookingData.selectedSlot.start).toDate(),
                meetingDuration: bookingData.duration,
                meetingLink: meetingLinkForEmails,
                calendarEventId: createdEvent.id,
                status: "scheduled",
                metadata: {
                  conferenceId,
                  timezone: eventTimezone,
                  endTime: bookingData.selectedSlot.end,
                  previousMeetingDate: (
                    existingScheduledMeeting.metadata as AnyType
                  )?.originalMeetingDate,
                  rescheduledFrom: (
                    existingScheduledMeeting.metadata as AnyType
                  )?.rescheduledAt,
                },
              }
            );
          } else {
            // Create entry in scheduled_meetings table for Google Meet API verification
            await this.calendarService.createScheduledMeeting({
              requesterId: request.requesterId,
              introductionRequestId: requestId,
              prospectEmail: bookingData.targetContactEmail,
              prospectName: bookingData.targetContactName,
              meetingDate: dayjs(bookingData.selectedSlot.start).toDate(),
              meetingDuration: bookingData.duration,
              meetingPlatform: "google_meet",
              meetingLink: meetingLinkForEmails,
              calendarEventId: createdEvent.id,
              calendarProvider: "google",
              metadata: {
                conferenceId,
                timezone: eventTimezone,
                endTime: bookingData.selectedSlot.end,
              },
            });
          }
          this.logger.log(INTRODUCTIONS_MESSAGES.LOG.SCHEDULED_MEETING_CREATED);
        } else if (activeIntegration.provider === "microsoft") {
          const meetingSubject =
            request.meetingTitle ||
            `Meeting: ${requester?.fullName} & ${bookingData.targetContactName}`;
          const bodyHtml = `Booked by: ${bookingData.targetContactName}<br>Introduced by: ${connector?.fullName || "Connector"}<br><br>Meeting Purpose:<br>${request.meetingDescription || "Introduction meeting"}<br><br>---<br>This meeting was scheduled through Prospectly. ${bookingData.targetContactName} selected this time slot from your available times.`;

          const { meetingLink: teamsLink, calendarEventId } =
            await this.calendarService.bookMicrosoftTeamsMeeting(
              request.requesterId,
              {
                integrationEmail:
                  activeIntegration.email || requester?.email || null,
                startDateTime: bookingData.selectedSlot.start,
                endDateTime: bookingData.selectedSlot.end,
                subject: meetingSubject,
                bodyHtml,
                timezone: eventTimezone,
                attendees: [
                  {
                    emailAddress: {
                      address: bookingData.targetContactEmail,
                      name: bookingData.targetContactName,
                    },
                    type: "required",
                  },
                ],
              }
            );

          const createdEvent = { id: calendarEventId };

          meetingLinkForEmails = teamsLink || undefined;
          this.logger.log(
            INTRODUCTIONS_MESSAGES.LOG.MEEETING_LINK(teamsLink || "N/A")
          );

          // Update existing scheduled_meeting if it was rescheduled, otherwise create new
          if (wasRescheduled && existingScheduledMeeting) {
            await this.calendarService.updateScheduledMeeting(
              existingScheduledMeeting.id,
              {
                meetingDate: dayjs(bookingData.selectedSlot.start).toDate(),
                meetingDuration: bookingData.duration,
                meetingLink: teamsLink || undefined,
                calendarEventId: createdEvent.id,
                status: "scheduled",
                metadata: {
                  timezone: eventTimezone,
                  endTime: bookingData.selectedSlot.end,
                  previousMeetingDate: (
                    existingScheduledMeeting.metadata as AnyType
                  )?.originalMeetingDate,
                  rescheduledFrom: (
                    existingScheduledMeeting.metadata as AnyType
                  )?.rescheduledAt,
                },
              }
            );
          } else {
            // Create entry in scheduled_meetings table for Microsoft Teams
            await this.calendarService.createScheduledMeeting({
              requesterId: request.requesterId,
              introductionRequestId: requestId,
              prospectEmail: bookingData.targetContactEmail,
              prospectName: bookingData.targetContactName,
              meetingDate: dayjs(bookingData.selectedSlot.start).toDate(),
              meetingDuration: bookingData.duration,
              meetingPlatform: "microsoft_teams",
              meetingLink: teamsLink || undefined,
              calendarEventId: createdEvent.id,
              calendarProvider: "microsoft",
              metadata: {
                timezone: eventTimezone,
                endTime: bookingData.selectedSlot.end,
              },
            });
          }
        } else {
          this.logger.warn(
            `Unsupported calendar provider: ${activeIntegration.provider} for user ${request.requesterId}`
          );
        }
      } else {
        this.logger.log(
          INTRODUCTIONS_MESSAGES.LOG.SKIPPING_CALENDAR(request.requesterId)
        );
        // Meeting is still booked, but without calendar integration
      }
    } catch (error) {
      this.logger.error(
        INTRODUCTIONS_MESSAGES.LOG.FAILED_CALENDAR(error.message)
      );
      // Don't fail the whole booking if calendar creation fails
      // The meeting is still booked, just without calendar integration
    }

    // Send confirmation emails to both parties
    if (meetingLinkForEmails === undefined) {
      const sm =
        await this.calendarService.getScheduledMeetingByIntroductionRequestId(
          requestId
        );
      meetingLinkForEmails = sm?.meetingLink || undefined;
    }
    const meetingLink = meetingLinkForEmails;

    // Format meeting date and time for emails using timezone-aware dayjs
    // Parse the ISO datetime strings as UTC
    const utcStartDateTime = utcDayjs(bookingData.selectedSlot.start);
    const utcEndDateTime = utcDayjs(bookingData.selectedSlot.end);
    const meetingDuration = `${bookingData.duration} minutes`;

    // Helper: format UTC slot instants in a recipient's IANA timezone (not Windows names).
    const formatDateTimeForTimezone = (recipientIana: string) => {
      const iana = resolveRecipientDisplayTimezone(
        recipientIana,
        eventTimezone
      );
      const localStartTime = utcStartDateTime.tz(iana);
      const localEndTime = utcEndDateTime.tz(iana);

      const formattedDate = localStartTime.format("dddd, MMMM D, YYYY");
      const formattedStartTime = localStartTime.format("h:mm A");
      const formattedEndTime = localEndTime.format("h:mm A");
      const formattedTimeRange = `${formattedStartTime} - ${formattedEndTime}`;

      const timezoneLabel = getTimezoneLabel(iana, utcStartDateTime);

      return { formattedDate, formattedTimeRange, timezoneLabel };
    };

    // Send one confirmation email per recipient so salutation and body match who is reading
    // (a single To+CC blast reused the requester's name for everyone on the thread)
    try {
      const requesterDisplay =
        requester?.fullName || requester?.email || "there";
      const targetDisplay = bookingData.targetContactName?.trim() || "there";
      const connectorDisplay = connector?.fullName || "";
      const partiesLabelForConnector = `${requesterDisplay} & ${targetDisplay}`;

      const sharedNonTimeFields = {
        connectorName: connectorDisplay,
        meetingDuration,
        meetingLink,
        meetingPurpose: request.meetingDescription || undefined,
      };

      const sentConfirmationTo = new Set<string>();
      const sendMeetingConfirmationOnce = async (
        email: string,
        recipientTz: string,
        fields: {
          recipientName: string;
          otherPartyName: string;
          isRequester: boolean;
          isConnector?: boolean;
        }
      ) => {
        const key = email.trim().toLowerCase();
        if (sentConfirmationTo.has(key)) return;
        sentConfirmationTo.add(key);
        const { formattedDate, formattedTimeRange, timezoneLabel } =
          formatDateTimeForTimezone(recipientTz);
        await this.emailsService.sendMeetingConfirmationEmail({
          to: email,
          ...sharedNonTimeFields,
          meetingDate: formattedDate,
          meetingTime: formattedTimeRange,
          meetingTimezone: timezoneLabel,
          ...fields,
        });
      };

      const requesterTz = resolveRecipientDisplayTimezone(
        bookingData.requesterTimezone,
        eventTimezone
      );
      const prospectTz = resolveRecipientDisplayTimezone(
        bookingData.timezone,
        eventTimezone
      );

      let connectorTz = eventTimezone;
      if (request.acceptedBy) {
        const connectorCalendarTz =
          await this.calendarService.getUserCalendarTimezone(
            request.acceptedBy
          );
        if (connectorCalendarTz) {
          connectorTz = resolveRecipientDisplayTimezone(
            connectorCalendarTz,
            eventTimezone
          );
        }
      }

      const confirmationJobs: Array<{ label: string; p: Promise<void> }> = [];

      if (requester?.email) {
        confirmationJobs.push({
          label: `requester:${requester.email}`,
          p: sendMeetingConfirmationOnce(requester.email, requesterTz, {
            recipientName: requesterDisplay,
            otherPartyName: targetDisplay,
            isRequester: true,
          }).then(() => {
            this.logger.log(
              INTRODUCTIONS_MESSAGES.LOG.CONFIRMATION_EMAIL_REQUESTER(
                requester.email
              )
            );
          }),
        });
      }

      if (bookingData.targetContactEmail) {
        confirmationJobs.push({
          label: `prospect:${bookingData.targetContactEmail}`,
          p: sendMeetingConfirmationOnce(
            bookingData.targetContactEmail,
            prospectTz,
            {
              recipientName: targetDisplay,
              otherPartyName: requesterDisplay,
              isRequester: false,
            }
          ),
        });
      }

      if (connector?.email) {
        confirmationJobs.push({
          label: `connector:${connector.email}`,
          p: sendMeetingConfirmationOnce(connector.email, connectorTz, {
            recipientName: connector.fullName || connector.email || "there",
            otherPartyName: partiesLabelForConnector,
            isRequester: false,
            isConnector: true,
          }),
        });
      }

      const settled = await Promise.allSettled(
        confirmationJobs.map((j) => j.p)
      );
      settled.forEach((result, i) => {
        if (result.status === "rejected") {
          const reason = result.reason as { message?: string };
          this.logger.error(
            `MEETING_SERVICE :: CONFIRMATION_EMAIL :: FAILED :: ${confirmationJobs[i].label} :: ${reason?.message ?? result.reason}`
          );
        }
      });
    } catch (emailError) {
      this.logger.error(
        `Failed to send meeting confirmation email: ${emailError.message}`
      );
      // Don't fail the booking if email fails
    }

    this.logger.log(
      `Meeting booked for request ${requestId}: ${bookingData.selectedSlot.start} - ${bookingData.selectedSlot.end}`
    );

    return {
      success: true,
      message: INTRODUCTIONS_MESSAGES.INFO.MEETING_BOOKED_SUCCESS,
      meetingDetails: {
        date: bookingData.selectedSlot.start,
        time: null,
        duration: `${bookingData.duration} minutes`,
        timezone: bookingData.timezone,
      },
    };
  }
}
