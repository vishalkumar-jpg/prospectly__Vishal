import { Injectable, Inject, ForbiddenException, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { utcDayjs } from "utils/dayjs";
import { CalendarService } from "modules/calendar/calendar.service";
import {
  resolveWorkingHours,
  generateSlotsFromHours,
} from "modules/calendar/shared/working-hours.util";
import { UserConfigurationsService } from "modules/user-configurations/user-configurations.service";
import { INTERVIEW_BOOKING_MESSAGES } from "../interview-booking.constants";

@Injectable()
export class InterviewBookingAvailabilityService {
  private readonly logger = new Logger(
    InterviewBookingAvailabilityService.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly calendarService: CalendarService,
    private readonly userConfigurationsService: UserConfigurationsService
  ) {}

  async getAvailability(candidateId: string, token: string) {
    // 1. Find workflow row by candidateId
    const [workflow] = await this.db
      .select({
        id: schema.recruitmentCandidateWorkflow.id,
        candidateId: schema.recruitmentCandidateWorkflow.candidateId,
        interviewBookingToken:
          schema.recruitmentCandidateWorkflow.interviewBookingToken,
        interviewBookingTokenExpiresAt:
          schema.recruitmentCandidateWorkflow.interviewBookingTokenExpiresAt,
        interviewNotes: schema.recruitmentCandidateWorkflow.interviewNotes,
      })
      .from(schema.recruitmentCandidateWorkflow)
      .where(
        and(
          eq(schema.recruitmentCandidateWorkflow.candidateId, candidateId),
          isNull(schema.recruitmentCandidateWorkflow.deletedAt)
        )
      )
      .limit(1);

    if (!workflow) {
      throw new ForbiddenException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.INVALID_OR_EXPIRED_TOKEN
      );
    }

    // 2. Fetch candidate, job, recruiter details
    const [candidate] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        jobId: schema.recruitmentJobCandidates.jobId,
        candidateUserId: schema.recruitmentJobCandidates.candidateUserId,
        jobTitle: schema.recruitmentJobsSchema.title,
        companyName: schema.recruitmentJobsSchema.companyName,
        jobLocation: schema.recruitmentJobsSchema.location,
        jobWorkType: schema.recruitmentJobsSchema.workType,
        jobEmploymentType: schema.recruitmentJobsSchema.employmentType,
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
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!candidate) {
      throw new ForbiddenException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.INVALID_OR_EXPIRED_TOKEN
      );
    }

    // 3. Check for scheduled meeting BEFORE token validation
    // This allows refreshing the page after booking (when token is nullified)
    const [meeting] = await this.db
      .select({
        id: schema.recruitmentInterviewMeetings.id,
        status: schema.recruitmentInterviewMeetings.status,
        recruiterId: schema.recruitmentInterviewMeetings.recruiterId,
        meetingDate: schema.recruitmentInterviewMeetings.meetingDate,
        meetingDuration: schema.recruitmentInterviewMeetings.meetingDuration,
        meetingLink: schema.recruitmentInterviewMeetings.meetingLink,
        meetingPlatform: schema.recruitmentInterviewMeetings.meetingPlatform,
      })
      .from(schema.recruitmentInterviewMeetings)
      .where(
        and(
          eq(schema.recruitmentInterviewMeetings.candidateId, candidateId),
          isNull(schema.recruitmentInterviewMeetings.deletedAt)
        )
      )
      .limit(1);

    // The interview is run by whoever sent the invite (a collaborator or the
    // owner), stored on the meeting record. All calendar identity — availability,
    // working hours, busy times — must key off this user, NOT the job owner.
    // Falls back to the job owner if no meeting row exists yet (defensive).
    const interviewerId = meeting?.recruiterId ?? candidate.requesterId;

    // 4. If meeting is already scheduled, return booked state (hide meetingLink for security)
    if (meeting && meeting.status === "scheduled") {
      const [recruiter] = await this.db
        .select({
          fullName: schema.users.fullName,
          jobTitle: schema.users.jobTitle,
        })
        .from(schema.users)
        .where(eq(schema.users.id, interviewerId))
        .limit(1);

      const [candidateUser] = await this.db
        .select({
          fullName: schema.users.fullName,
        })
        .from(schema.users)
        .where(eq(schema.users.id, candidate.candidateUserId))
        .limit(1);

      return {
        isAlreadyBooked: true,
        meetingDate: meeting.meetingDate,
        meetingDuration: meeting.meetingDuration,
        meetingLink: null,
        meetingPlatform: meeting.meetingPlatform,
        jobTitle: candidate.jobTitle,
        companyName: candidate.companyName,
        jobLocation: candidate.jobLocation,
        jobWorkType: candidate.jobWorkType,
        jobEmploymentType: candidate.jobEmploymentType,
        recruiterName: recruiter?.fullName || "Recruiter",
        recruiterTitle: recruiter?.jobTitle || null,
        candidateName: candidateUser?.fullName || "Candidate",
      };
    }

    // 5. No scheduled meeting — validate token before showing available slots
    if (workflow.interviewBookingToken !== token) {
      throw new ForbiddenException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.INVALID_OR_EXPIRED_TOKEN
      );
    }

    // Check token expiry
    if (
      workflow.interviewBookingTokenExpiresAt &&
      utcDayjs().isAfter(utcDayjs(workflow.interviewBookingTokenExpiresAt))
    ) {
      throw new ForbiddenException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.INVALID_OR_EXPIRED_TOKEN
      );
    }

    // 6. Fetch recruiter profile and candidate name for slot selection view
    const [recruiter] = await this.db
      .select({
        fullName: schema.users.fullName,
        jobTitle: schema.users.jobTitle,
      })
      .from(schema.users)
      .where(eq(schema.users.id, interviewerId))
      .limit(1);

    const [candidateUser] = await this.db
      .select({
        fullName: schema.users.fullName,
      })
      .from(schema.users)
      .where(eq(schema.users.id, candidate.candidateUserId))
      .limit(1);

    // 7. Check recruiter has active calendar
    const activeCalendar =
      await this.calendarService.getActiveCalendarIntegration(interviewerId);

    if (!activeCalendar) {
      throw new ForbiddenException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.NO_CALENDAR_CONNECTED
      );
    }

    // 8. Generate available slots (14 days) from the recruiter's configured
    // working hours, minus their real calendar busy times.
    const config =
      await this.userConfigurationsService.getUserConfiguration(interviewerId);
    let fallbackTimezone = "UTC";
    if (!config.workingHoursTimezone) {
      fallbackTimezone =
        (await this.calendarService.getUserCalendarTimezone(interviewerId)) ||
        "UTC";
    }
    const hours = resolveWorkingHours(config, fallbackTimezone);
    const busyPeriods = await this.calendarService.getBusyPeriods(
      interviewerId,
      14
    );
    const availableSlots = generateSlotsFromHours(
      hours,
      14,
      busyPeriods,
      utcDayjs()
    );

    return {
      isAlreadyBooked: false,
      availableSlots,
      timezone: hours.timezone,
      jobTitle: candidate.jobTitle,
      companyName: candidate.companyName,
      jobLocation: candidate.jobLocation,
      jobWorkType: candidate.jobWorkType,
      jobEmploymentType: candidate.jobEmploymentType,
      recruiterName: recruiter?.fullName || "Recruiter",
      recruiterTitle: recruiter?.jobTitle || null,
      candidateName: candidateUser?.fullName || "Candidate",
      interviewNotes: workflow.interviewNotes,
    };
  }
}
