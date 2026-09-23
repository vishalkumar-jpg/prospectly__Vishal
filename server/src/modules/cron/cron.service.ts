import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { RefreshTokenService } from "services/refreshTokenService";
import { MeetingsCronService } from "./meetings/mettings-cron.service";
import { CalendarTokenCronService } from "./calendar/calendar-token-cron.service";
import { ContactsTokenCronService } from "./contacts/contacts-token-cron.service";
import { TrustScoreCronService } from "./trust-score/trust-score-cron.service";
import { InReviewReminderCronService } from "./recruitment/in-review-reminder-cron.service";

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly meetingsCronService: MeetingsCronService,
    private readonly calendarTokenCronService: CalendarTokenCronService,
    private readonly contactsTokenCronService: ContactsTokenCronService,
    private readonly trustScoreCronService: TrustScoreCronService,
    private readonly inReviewReminderCronService: InReviewReminderCronService,
    private readonly refreshTokenService: RefreshTokenService
  ) {}

  // Auto-complete meetings using Google Meet API verification
  @Cron("0 */10 * * * *") // Runs every 10 minutes
  async autoCompleteExpiredMeetings() {
    try {
      await this.meetingsCronService.autoCompleteExpiredMeetings();
    } catch (error) {
      this.logger.error(
        `Error during autoCompleteExpiredMeetings cron: ${(error as Error).message}`
      );
    }
  }

  // Refresh calendar tokens that are expiring soon
  @Cron("0 */30 * * * *") // Runs every 30 minutes
  async refreshCalendarTokens() {
    try {
      await this.calendarTokenCronService.refreshExpiringTokens();
    } catch (error) {
      this.logger.error(
        `Error during refreshCalendarTokens cron: ${(error as Error).message}`
      );
    }
  }

  // Refresh contacts provider tokens that are expiring soon
  @Cron("0 */30 * * * *") // Runs every 30 minutes
  async refreshContactsProviderTokens() {
    try {
      await this.contactsTokenCronService.refreshExpiringTokens();
    } catch (error) {
      this.logger.error(
        `Error during refreshContactsProviderTokens cron: ${(error as Error).message}`
      );
    }
  }

  // Check for no response after 48 hours
  @Cron("0 */10 * * * *") // Runs every 10 minutes
  async checkNoResponse48h() {
    try {
      await this.trustScoreCronService.checkNoResponse48h();
    } catch (error) {
      this.logger.error(
        `Error during checkNoResponse48h cron: ${(error as Error).message}`
      );
    }
  }

  // Check for high success rate
  @Cron("0 0 * * *") // Runs daily at midnight
  async checkHighSuccessRate() {
    try {
      await this.trustScoreCronService.checkHighSuccessRate();
    } catch (error) {
      this.logger.error(
        `Error during checkHighSuccessRate cron: ${(error as Error).message}`
      );
    }
  }

  // Recover failed jobs
  @Cron("0 */2 * * *") // Runs every 2 hours
  async recoverFailedJobs() {
    try {
      await this.trustScoreCronService.recoverFailedJobs();
    } catch (error) {
      this.logger.error(
        `Error during recoverFailedJobs cron: ${(error as Error).message}`
      );
    }
  }

  /** One-time In Review status emails (candidate + connector); logs on recruiter popup only. */
  @Cron("0 30 8 * * *", { timeZone: "UTC" }) // Daily at 8:30 AM UTC
  async sendInReviewReminderEmails() {
    try {
      await this.inReviewReminderCronService.processDueInReviewReminders();
    } catch (error) {
      this.logger.error(
        `Error during sendInReviewReminderEmails cron: ${(error as Error).message}`
      );
    }
  }

  // Purge refresh tokens that are already past their expiry (housekeeping only —
  // expired/revoked tokens are already rejected at validation time, so this just
  // keeps the refresh_tokens table from accumulating dead rows over time).
  @Cron("0 0 3 * * *", { timeZone: "UTC" }) // Runs daily at 3:00 AM UTC
  async cleanupExpiredRefreshTokens() {
    try {
      await this.refreshTokenService.cleanupExpiredTokens();
    } catch (error) {
      this.logger.error(
        `Error during cleanupExpiredRefreshTokens cron: ${(error as Error).message}`
      );
    }
  }
}
