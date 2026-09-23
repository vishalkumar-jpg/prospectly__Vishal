import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC, utcDayjs } from "utils/dayjs";
import { CalendarService } from "modules/calendar/calendar.service";
import { UserConfigurationsService } from "modules/user-configurations/user-configurations.service";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { renderTemplateWithVariables } from "modules/emails/templating";
import { RecruitmentLifecycleNotificationDispatchService } from "modules/recruitment/notifications/services/recruitment-lifecycle-notification-dispatch.service";
import { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { RECRUITMENT_EMAIL_LOG_TYPE } from "modules/recruitment/email-logs/recruitment-email-logs.constants";
import { logRecruitmentEmailSent } from "modules/recruitment/email-logs/recruitment-email-log.helper";
import { resolveUserEmail } from "modules/recruitment/notifications/processors/recruitment-lifecycle-send.helper";
import * as crypto from "node:crypto";
import {
  CANDIDATE_WORKFLOW_MESSAGES,
  INTERVIEW_TOKEN_EXPIRY_DAYS,
} from "../candidate-workflow.constants";
import { SendInterviewInviteDto } from "../candidate-workflow.dto";

@Injectable()
export class CandidateWorkflowInterviewInviteService {
  private readonly logger = new Logger(
    CandidateWorkflowInterviewInviteService.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly calendarService: CalendarService,
    private readonly userConfigurationsService: UserConfigurationsService,
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService,
    private readonly lifecycleDispatch: RecruitmentLifecycleNotificationDispatchService,
    private readonly emailLogsService: RecruitmentEmailLogsService
  ) {}

  async sendInterviewInvite(
    userId: string,
    candidateId: string,
    dto: SendInterviewInviteDto
  ) {
    const now = toUTC();

    // 1. Fetch candidate + verify job ownership
    const [candidate] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        stageId: schema.recruitmentJobCandidates.stageId,
        jobId: schema.recruitmentJobCandidates.jobId,
        candidateUserId: schema.recruitmentJobCandidates.candidateUserId,
        requesterId: schema.recruitmentJobsSchema.requesterId,
        jobTitle: schema.recruitmentJobsSchema.title,
        companyName: schema.recruitmentJobsSchema.companyName,
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
      throw new NotFoundException(
        CANDIDATE_WORKFLOW_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    // 2. Fetch candidate user email. Resolved through the shared lifecycle
    // resolver so every recruitment email reaches the same address and honours
    // the same deleted / deactivated guards.
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
      throw new BadRequestException("Candidate user email not found");
    }

    // 3. Validate candidate is in shortlisted or interview_invite_sent stage
    const allowedStages = await this.db
      .select({
        id: schema.recruitmentStagesSchema.id,
        stageKey: schema.recruitmentStagesSchema.stageKey,
      })
      .from(schema.recruitmentStagesSchema)
      .where(eq(schema.recruitmentStagesSchema.stageKey, "shortlisted"))
      .limit(1);

    const [inviteSentStageRow] = await this.db
      .select({
        id: schema.recruitmentStagesSchema.id,
        stageKey: schema.recruitmentStagesSchema.stageKey,
      })
      .from(schema.recruitmentStagesSchema)
      .where(
        eq(schema.recruitmentStagesSchema.stageKey, "interview_invite_sent")
      )
      .limit(1);

    const [interviewScheduledStageRow] = await this.db
      .select({
        id: schema.recruitmentStagesSchema.id,
        stageKey: schema.recruitmentStagesSchema.stageKey,
      })
      .from(schema.recruitmentStagesSchema)
      .where(eq(schema.recruitmentStagesSchema.stageKey, "interview_scheduled"))
      .limit(1);

    const shortlistedStage = allowedStages[0];
    const isShortlisted =
      shortlistedStage && candidate.stageId === shortlistedStage.id;
    const isInviteSent =
      inviteSentStageRow && candidate.stageId === inviteSentStageRow.id;
    const isInterviewScheduled =
      interviewScheduledStageRow &&
      candidate.stageId === interviewScheduledStageRow.id;

    if (!isShortlisted && !isInviteSent && !isInterviewScheduled) {
      throw new BadRequestException(
        CANDIDATE_WORKFLOW_MESSAGES.ERROR.INVALID_STAGE_FOR_INVITE
      );
    }

    const isResend = isInviteSent || isInterviewScheduled;

    // 4. Check recruiter has active calendar
    const activeCalendar =
      await this.calendarService.getActiveCalendarIntegration(userId);

    if (!activeCalendar) {
      throw new BadRequestException(
        CANDIDATE_WORKFLOW_MESSAGES.ERROR.NO_CALENDAR_CONNECTED
      );
    }

    // 4b. If the recruiter set/edited their working hours in the dialog, save
    // them as the reusable default (used to generate the candidate's slots).
    if (dto.availability) {
      const { startTime, endTime, timezone } = dto.availability;
      if (endTime <= startTime) {
        throw new BadRequestException(
          CANDIDATE_WORKFLOW_MESSAGES.ERROR.INVALID_WORKING_HOURS
        );
      }
      await this.userConfigurationsService.updateUserConfiguration(userId, {
        workingHoursStart: startTime,
        workingHoursEnd: endTime,
        workingHoursTimezone: timezone,
      });
    }

    // 5. Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiresAt = utcDayjs()
      .add(INTERVIEW_TOKEN_EXPIRY_DAYS, "day")
      .toDate();

    // 6. Fetch recruiter profile info for email
    const [recruiter] = await this.db
      .select({
        fullName: schema.users.fullName,
        jobTitle: schema.users.jobTitle,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    // 7. Transaction
    await this.db.transaction(async (tx) => {
      // a. Look up interview_invite_sent stage
      if (!inviteSentStageRow) {
        throw new BadRequestException(
          "Interview invite sent stage not found in database"
        );
      }

      // b. Upsert recruitment_interview_meetings
      if (isInterviewScheduled) {
        await tx
          .update(schema.recruitmentInterviewMeetings)
          .set({
            status: "invite_sent",
            // Reassign the organizer to whoever re-sent the invite, so the
            // candidate's slots and the booked meeting use this user's calendar.
            recruiterId: userId,
            meetingDate: null,
            meetingLink: null,
            calendarEventId: null,
            calendarProvider: null,
            meetingPlatform: null,
            interviewNotes: dto.interviewNotes ?? null,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(
            and(
              eq(schema.recruitmentInterviewMeetings.candidateId, candidateId),
              isNull(schema.recruitmentInterviewMeetings.deletedAt)
            )
          );
      } else if (isResend) {
        await tx
          .update(schema.recruitmentInterviewMeetings)
          .set({
            status: "invite_sent",
            // Reassign the organizer to whoever re-sent the invite, so the
            // candidate's slots and the booked meeting use this user's calendar.
            recruiterId: userId,
            interviewNotes: dto.interviewNotes ?? null,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(
            and(
              eq(schema.recruitmentInterviewMeetings.candidateId, candidateId),
              isNull(schema.recruitmentInterviewMeetings.deletedAt)
            )
          );
      } else {
        // Insert new meeting record
        await tx.insert(schema.recruitmentInterviewMeetings).values({
          candidateId,
          jobId: candidate.jobId,
          recruiterId: userId,
          candidateUserId: candidate.candidateUserId,
          status: "invite_sent",
          interviewNotes: dto.interviewNotes ?? null,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      // c. Update workflow: set token and notes
      await tx
        .update(schema.recruitmentCandidateWorkflow)
        .set({
          interviewBookingToken: token,
          interviewBookingTokenExpiresAt: tokenExpiresAt,
          interviewNotes: dto.interviewNotes ?? null,
          ...(isInterviewScheduled
            ? {
                interviewScheduledAt: null,
                interviewMeetingLink: null,
              }
            : {}),
          updatedAt: now,
          updatedBy: userId,
        })
        .where(
          eq(schema.recruitmentCandidateWorkflow.candidateId, candidateId)
        );

      // d. Update candidate stage to interview_invite_sent
      await tx
        .update(schema.recruitmentJobCandidates)
        .set({
          stageId: inviteSentStageRow.id,
          stageUpdatedAt: now,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(schema.recruitmentJobCandidates.id, candidateId));

      // e. Insert stage history
      await tx.insert(schema.recruitmentCandidateStageHistory).values({
        candidateId,
        stageId: inviteSentStageRow.id,
        note: isInterviewScheduled
          ? "Interview rescheduled"
          : isResend
            ? "Interview invite resent"
            : "Interview invite sent",
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });

      // f. Insert meeting history
      const [meeting] = await tx
        .select({ id: schema.recruitmentInterviewMeetings.id })
        .from(schema.recruitmentInterviewMeetings)
        .where(
          and(
            eq(schema.recruitmentInterviewMeetings.candidateId, candidateId),
            isNull(schema.recruitmentInterviewMeetings.deletedAt)
          )
        )
        .limit(1);

      if (meeting) {
        await tx.insert(schema.recruitmentInterviewMeetingHistory).values({
          meetingId: meeting.id,
          eventType: isInterviewScheduled
            ? "rescheduled"
            : isResend
              ? "invite_resent"
              : "invite_sent",
          previousStatus: isResend
            ? isInterviewScheduled
              ? "scheduled"
              : "invite_sent"
            : null,
          newStatus: "invite_sent",
          performedBy: userId,
          createdAt: now,
        });
      }
    });

    // 8. Build booking link and send email
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    const bookingLink = `${frontendUrl}/interview-booking/${candidateId}/${token}`;

    try {
      const template = await this.emailsService.findTemplateBySlug(
        Slug.RecruitmentInterviewInvite
      );

      const { subject, html } = renderTemplateWithVariables(template, {
        candidateName: candidateUser?.fullName || "Candidate",
        jobTitle: candidate.jobTitle,
        companyName: candidate.companyName,
        recruiterName: recruiter?.fullName || "The recruiter",
        recruiterTitle: recruiter?.jobTitle || "",
        interviewNotes: dto.interviewNotes || "",
        bookingLink,
        url: frontendUrl,
      });

      const sendResult = await this.emailsService.sendEmail({
        to: candidateEmail,
        subject,
        html,
        slug: Slug.RecruitmentInterviewInvite,
      });

      await logRecruitmentEmailSent(this.emailLogsService, sendResult.emailId, {
        jobId: candidate.jobId,
        candidateId,
        poolMatchId: null,
        emailType: RECRUITMENT_EMAIL_LOG_TYPE.INTERVIEW_INVITE,
        recipientType: "candidate",
        recipientEmail: candidateEmail,
        subject,
        emailBody: html,
        createdBy: userId,
      });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_WORKFLOW_INTERVIEW_INVITE_SERVICE :: SEND_EMAIL : ERROR : ${error}`
      );
    }

    // Notify connectors only on first invite from shortlisted (skip resend/reschedule).
    if (!isResend) {
      void this.lifecycleDispatch
        .dispatchInterviewInviteSent(candidateId)
        .catch((err) => {
          this.logger.error(
            `CANDIDATE_WORKFLOW_INTERVIEW_INVITE_SERVICE :: DISPATCH_NOTIFICATION : ERROR : ${err}`
          );
        });
    }

    return {
      candidateId,
      message: CANDIDATE_WORKFLOW_MESSAGES.SUCCESS.INTERVIEW_INVITE_SENT,
    };
  }
}
