import {
  Injectable,
  Inject,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC, utcDayjs } from "utils/dayjs";
import dayjs from "dayjs";
import { CalendarService } from "modules/calendar/calendar.service";
import {
  resolveWorkingHours,
  isSlotWithinHours,
} from "modules/calendar/shared/working-hours.util";
import { UserConfigurationsService } from "modules/user-configurations/user-configurations.service";
import { RecruitmentLifecycleNotificationDispatchService } from "modules/recruitment/notifications/services/recruitment-lifecycle-notification-dispatch.service";
import { resolveUserEmail } from "modules/recruitment/notifications/processors/recruitment-lifecycle-send.helper";
import {
  resolveBookingCalendarTimezone,
  toGoogleCalendarDateTime,
} from "modules/calendar/microsoft/microsoft-graph-datetime.utils";
import {
  INTERVIEW_BOOKING_MESSAGES,
  INTERVIEW_BOOKING_DURATION,
} from "../interview-booking.constants";
import { ConfirmInterviewBookingDto } from "../interview-booking.dto";

@Injectable()
export class InterviewBookingConfirmService {
  private readonly logger = new Logger(InterviewBookingConfirmService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly calendarService: CalendarService,
    private readonly userConfigurationsService: UserConfigurationsService,
    private readonly lifecycleDispatch: RecruitmentLifecycleNotificationDispatchService
  ) {}

  async confirmBooking(
    candidateId: string,
    token: string,
    dto: ConfirmInterviewBookingDto
  ) {
    const now = toUTC();

    // 1. Validate token
    const [workflow] = await this.db
      .select({
        id: schema.recruitmentCandidateWorkflow.id,
        candidateId: schema.recruitmentCandidateWorkflow.candidateId,
        interviewBookingToken:
          schema.recruitmentCandidateWorkflow.interviewBookingToken,
        interviewBookingTokenExpiresAt:
          schema.recruitmentCandidateWorkflow.interviewBookingTokenExpiresAt,
      })
      .from(schema.recruitmentCandidateWorkflow)
      .where(
        and(
          eq(schema.recruitmentCandidateWorkflow.candidateId, candidateId),
          isNull(schema.recruitmentCandidateWorkflow.deletedAt)
        )
      )
      .limit(1);

    if (!workflow || workflow.interviewBookingToken !== token) {
      throw new ForbiddenException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.INVALID_OR_EXPIRED_TOKEN
      );
    }

    if (
      workflow.interviewBookingTokenExpiresAt &&
      dayjs().isAfter(dayjs(workflow.interviewBookingTokenExpiresAt))
    ) {
      throw new ForbiddenException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.INVALID_OR_EXPIRED_TOKEN
      );
    }

    // 2. Fetch meeting and verify status
    const [meeting] = await this.db
      .select()
      .from(schema.recruitmentInterviewMeetings)
      .where(
        and(
          eq(schema.recruitmentInterviewMeetings.candidateId, candidateId),
          isNull(schema.recruitmentInterviewMeetings.deletedAt)
        )
      )
      .limit(1);

    if (!meeting) {
      throw new ForbiddenException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.INVALID_OR_EXPIRED_TOKEN
      );
    }

    if (meeting.status === "scheduled") {
      throw new ConflictException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.ALREADY_BOOKED
      );
    }

    // 2b. Re-validate the selected slot against the recruiter's working hours
    //     and live calendar busy times BEFORE charging or creating the event.
    //     Closes the race where a slot becomes busy / falls outside the window
    //     between when availability was fetched and when the candidate confirms.
    //     The interview is run by whoever sent the invite (meeting.recruiterId —
    //     a collaborator or the owner), so validate against THEIR calendar.
    const interviewerId = meeting.recruiterId;

    const workingHoursConfig =
      await this.userConfigurationsService.getUserConfiguration(interviewerId);
    let confirmFallbackTimezone = "UTC";
    if (!workingHoursConfig.workingHoursTimezone) {
      confirmFallbackTimezone =
        (await this.calendarService.getUserCalendarTimezone(interviewerId)) ||
        "UTC";
    }
    const workingHours = resolveWorkingHours(
      workingHoursConfig,
      confirmFallbackTimezone
    );
    const confirmBusyPeriods = await this.calendarService.getBusyPeriods(
      interviewerId,
      14
    );
    if (
      !isSlotWithinHours(
        workingHours,
        dto.selectedSlot,
        confirmBusyPeriods,
        utcDayjs()
      )
    ) {
      throw new BadRequestException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.SLOT_NO_LONGER_AVAILABLE
      );
    }

    // 3. Nothing is charged at booking. The referral fee, success fee, and
    //    connector payouts are all handled when the recruiter moves the
    //    candidate to Hired (CandidateWorkflowHireService).

    // 4. Fetch candidate and job info for calendar event
    const [candidate] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        jobId: schema.recruitmentJobCandidates.jobId,
        candidateUserId: schema.recruitmentJobCandidates.candidateUserId,
        jobTitle: schema.recruitmentJobsSchema.title,
        companyName: schema.recruitmentJobsSchema.companyName,
        requesterId: schema.recruitmentJobsSchema.requesterId,
      })
      .from(schema.recruitmentJobCandidates)
      .innerJoin(
        schema.recruitmentJobsSchema,
        eq(
          schema.recruitmentJobCandidates.jobId,
          schema.recruitmentJobsSchema.id
        )
      )
      .where(eq(schema.recruitmentJobCandidates.id, candidateId))
      .limit(1);

    if (!candidate) {
      throw new ForbiddenException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.INVALID_OR_EXPIRED_TOKEN
      );
    }

    // Fetch candidate name. The address handed to the calendar provider is
    // resolved through the shared lifecycle resolver so the meeting invite goes
    // to the same address as every other recruitment email.
    const [candidateUser] = await this.db
      .select({
        fullName: schema.users.fullName,
      })
      .from(schema.users)
      .where(eq(schema.users.id, candidate.candidateUserId))
      .limit(1);

    const candidateEmail = await resolveUserEmail(
      this.db,
      candidate.candidateUserId
    );

    if (!candidateEmail) {
      throw new ForbiddenException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.BOOKING_FAILED
      );
    }

    // 4b. When a collaborator sent the invite, add the job owner as a required
    //     attendee so the meeting also lands on the owner's calendar. Skipped
    //     when the owner sent the invite themselves (they're already the
    //     organizer) to avoid adding them as a guest of their own event.
    let owner: { email: string | null; fullName: string | null } | undefined;
    if (candidate.requesterId !== interviewerId) {
      [owner] = await this.db
        .select({
          email: schema.users.email,
          fullName: schema.users.fullName,
        })
        .from(schema.users)
        .where(eq(schema.users.id, candidate.requesterId))
        .limit(1);
    }
    const ownerName = owner?.fullName || "Job Owner";

    // 5. Detect calendar provider and create event on the interviewer's calendar
    //    (collaborator or owner — whoever sent the invite), making them the
    //    meeting organizer.
    const activeCalendar =
      await this.calendarService.getActiveCalendarIntegration(interviewerId);

    if (!activeCalendar) {
      throw new ForbiddenException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.NO_CALENDAR_CONNECTED
      );
    }

    let meetingLink: string | null = null;
    let calendarEventId: string | null = null;
    let meetingPlatform: string | null = null;
    const calendarProvider = activeCalendar.provider;
    const candidateName = candidateUser?.fullName || "Candidate";
    const eventSummary = `Interview: ${candidateName} - ${candidate.jobTitle}`;

    const eventTimezone = resolveBookingCalendarTimezone(
      dto.timezone,
      dto.requesterTimezone
    );

    try {
      if (calendarProvider === "google") {
        const googleStart = toGoogleCalendarDateTime(
          dto.selectedSlot.start,
          eventTimezone
        );
        const googleEnd = toGoogleCalendarDateTime(
          dto.selectedSlot.end,
          eventTimezone
        );
        const calendarEvent = {
          summary: eventSummary,
          description: `Interview for ${candidate.jobTitle} at ${candidate.companyName}\n\nCandidate: ${candidateName} (${candidateEmail})\n\n---\nThis interview was scheduled through Prospectly.`,
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
              email: candidateEmail,
              displayName: candidateName,
            },
            ...(owner?.email
              ? [{ email: owner.email, displayName: ownerName }]
              : []),
          ],
          conferenceData: {
            createRequest: {
              requestId: `interview-${candidateId}-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 24 * 60 },
              { method: "popup", minutes: 30 },
            ],
          },
          guestsCanModify: false,
          guestsCanInviteOthers: false,
          guestsCanSeeOtherGuests: true,
        };

        const createdEvent = await this.calendarService.createEvent(
          interviewerId,
          calendarEvent
        );

        calendarEventId = createdEvent.id;
        meetingLink = createdEvent.hangoutLink || null;
        meetingPlatform = "google_meet";
      } else if (calendarProvider === "microsoft") {
        const bodyHtml = `Interview for ${candidate.jobTitle} at ${candidate.companyName}<br><br>Candidate: ${candidateName} (${candidateEmail})<br><br>---<br>This interview was scheduled through Prospectly.`;

        const bookingResult =
          await this.calendarService.bookMicrosoftTeamsMeeting(interviewerId, {
            integrationEmail: activeCalendar.email,
            startDateTime: dto.selectedSlot.start,
            endDateTime: dto.selectedSlot.end,
            subject: eventSummary,
            bodyHtml,
            timezone: eventTimezone,
            attendees: [
              {
                emailAddress: {
                  address: candidateEmail,
                  name: candidateName,
                },
                type: "required" as const,
              },
              ...(owner?.email
                ? [
                    {
                      emailAddress: {
                        address: owner.email,
                        name: ownerName,
                      },
                      type: "required" as const,
                    },
                  ]
                : []),
            ],
          });

        calendarEventId = bookingResult.calendarEventId;
        meetingLink = bookingResult.meetingLink;
        meetingPlatform = "teams";
      }
    } catch (calendarError) {
      this.logger.error(
        `INTERVIEW_BOOKING_CONFIRM :: confirmBooking : Calendar event creation failed: ${calendarError}`
      );
      throw new BadRequestException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.BOOKING_FAILED
      );
    }

    // 6. Transaction: update all records
    await this.db.transaction(async (tx) => {
      // a. Update interview meeting
      await tx
        .update(schema.recruitmentInterviewMeetings)
        .set({
          status: "scheduled",
          meetingDate: dayjs(dto.selectedSlot.start).toDate(),
          meetingDuration: INTERVIEW_BOOKING_DURATION,
          meetingLink,
          calendarEventId,
          calendarProvider,
          meetingPlatform,
          updatedAt: now,
        })
        .where(eq(schema.recruitmentInterviewMeetings.id, meeting.id));

      // b. Look up interview_scheduled stage
      const [interviewScheduledStage] = await tx
        .select({
          id: schema.recruitmentStagesSchema.id,
        })
        .from(schema.recruitmentStagesSchema)
        .where(
          eq(schema.recruitmentStagesSchema.stageKey, "interview_scheduled")
        )
        .limit(1);

      if (interviewScheduledStage) {
        // c. Update candidate stage
        await tx
          .update(schema.recruitmentJobCandidates)
          .set({
            stageId: interviewScheduledStage.id,
            stageUpdatedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.recruitmentJobCandidates.id, candidateId));

        // d. Insert stage history
        await tx.insert(schema.recruitmentCandidateStageHistory).values({
          candidateId,
          stageId: interviewScheduledStage.id,
          note: "Interview booked by candidate",
          createdAt: now,
          updatedAt: now,
        });
      }

      // e. Update workflow
      await tx
        .update(schema.recruitmentCandidateWorkflow)
        .set({
          interviewScheduledAt: dayjs(dto.selectedSlot.start).toDate(),
          interviewMeetingLink: meetingLink,
          interviewBookingToken: null,
          interviewBookingTokenExpiresAt: null,
          updatedAt: now,
        })
        .where(
          eq(schema.recruitmentCandidateWorkflow.candidateId, candidateId)
        );

      // f. Insert meeting history
      await tx.insert(schema.recruitmentInterviewMeetingHistory).values({
        meetingId: meeting.id,
        eventType: "slot_booked",
        previousStatus: "invite_sent",
        newStatus: "scheduled",
        createdAt: now,
      });
    });

    void this.lifecycleDispatch
      .dispatchInterviewScheduled(candidateId)
      .catch((err) => {
        this.logger.error(
          `INTERVIEW_BOOKING_CONFIRM :: confirmBooking : ERROR : ${err}`
        );
      });

    return {
      success: true,
      meetingLink,
      meetingDate: dto.selectedSlot.start,
      duration: INTERVIEW_BOOKING_DURATION,
    };
  }
}
