import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { appConfig } from "config/app.config";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { renderTemplateWithVariables } from "modules/emails/templating";
import { SystemConfigurationService } from "modules/system-configuration/system-configuration.service";
import { NameSlug } from "modules/system-configuration/system-configuration.constants";
import { formatFeedbackEmailDateTime } from "utils/email-datetime.utils";
import {
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
} from "./system-feedback.constants";
import {
  hasFeedbackNotificationRecipients,
  parseFeedbackNotificationRecipients,
  type FeedbackNotificationRecipients,
} from "./system-feedback-notification-recipients.helper";
import {
  resolveFeedbackGreetingName,
  resolveFeedbackSubmitterLabel,
} from "./system-feedback-display-name.util";
import { buildUserFeedbackPanelUrl } from "./system-feedback-url.util";

type FeedbackRow = typeof schema.systemFeedback.$inferSelect;

@Injectable()
export class SystemFeedbackNotificationService {
  private readonly logger = new Logger(SystemFeedbackNotificationService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly emailsService: EmailsService,
    private readonly systemConfigurationService: SystemConfigurationService
  ) {}

  async sendSubmissionNotifications(
    feedback: FeedbackRow,
    attachmentCount: number
  ): Promise<void> {
    const user = await this.db.query.users.findFirst({
      where: and(
        eq(schema.users.id, feedback.userId),
        isNull(schema.users.deletedAt)
      ),
      columns: {
        email: true,
        firstName: true,
        lastName: true,
        fullName: true,
      },
    });
    if (!user?.email) return;

    const submittedAt = formatFeedbackEmailDateTime(feedback.createdAt);
    const baseVars = this.buildBaseVariables(feedback, user, submittedAt);

    await this.sendTeamSubmissionEmail({ ...baseVars, attachmentCount });
    await this.sendUserAcknowledgementEmail(user.email, {
      userName: resolveFeedbackGreetingName(user),
      userPanelUrl: buildUserFeedbackPanelUrl() || baseVars.userPanelUrl,
    });
  }

  private buildBaseVariables(
    feedback: FeedbackRow,
    user: {
      firstName?: string | null;
      lastName?: string | null;
      fullName?: string | null;
      email: string;
    },
    submittedAt: string
  ) {
    return {
      submitterLabel: resolveFeedbackSubmitterLabel(user),
      userEmail: user.email,
      feedbackType: FEEDBACK_TYPE_LABELS[feedback.type] ?? feedback.type,
      feedbackPriority:
        FEEDBACK_PRIORITY_LABELS[feedback.priority] ?? feedback.priority,
      feedbackTitle: feedback.title,
      feedbackDescription: feedback.description,
      submittedAt,
      userPanelUrl: buildUserFeedbackPanelUrl() || appConfig.frontendUrl,
      adminFeedbackUrl: appConfig.adminPanelUrl
        ? `${appConfig.adminPanelUrl}/dashboard/admin/system-feedback`
        : "",
    };
  }

  private resolveTeamEmailDelivery(
    recipients: FeedbackNotificationRecipients
  ): { to: string[]; bcc?: string[] } | null {
    if (recipients.to.length > 0) {
      return {
        to: recipients.to,
        bcc: recipients.bcc.length > 0 ? recipients.bcc : undefined,
      };
    }

    if (recipients.bcc.length > 0) {
      const { fromEmail } = appConfig.resend;
      if (!fromEmail) {
        this.logger.warn(
          "SYSTEM_FEEDBACK_NOTIFICATION_SERVICE :: RESOLVE_TEAM_EMAIL_DELIVERY : WARN : BCC-only config requires RESEND_FROM_EMAIL"
        );
        return null;
      }
      return { to: [fromEmail], bcc: recipients.bcc };
    }

    return null;
  }

  private async sendTeamSubmissionEmail(
    variables: Record<string, string | number>
  ): Promise<void> {
    const config = await this.systemConfigurationService.getConfigurationBySlug(
      NameSlug.FeedbackNotificationRecipients
    );
    const recipients = parseFeedbackNotificationRecipients(config?.value);
    if (!hasFeedbackNotificationRecipients(recipients)) {
      this.logger.warn(
        "SYSTEM_FEEDBACK_NOTIFICATION_SERVICE :: SEND_TEAM_SUBMISSION_EMAIL : WARN : No recipients configured for team submission email"
      );
      return;
    }

    const delivery = this.resolveTeamEmailDelivery(recipients);
    if (!delivery) return;

    try {
      const template = await this.emailsService.findTemplateBySlug(
        Slug.SystemFeedbackSubmitted
      );
      const { subject, html } = renderTemplateWithVariables(
        template,
        variables
      );
      await this.emailsService.sendEmail({
        to: delivery.to,
        bcc: delivery.bcc,
        subject,
        html,
        slug: Slug.SystemFeedbackSubmitted,
      });
    } catch (error) {
      this.logger.error(
        `SYSTEM_FEEDBACK_NOTIFICATION_SERVICE :: SEND_TEAM_SUBMISSION_EMAIL : ERROR : ${error}`
      );
    }
  }

  private async sendUserAcknowledgementEmail(
    userEmail: string,
    variables: Record<string, string | number>
  ): Promise<void> {
    try {
      const template = await this.emailsService.findTemplateBySlug(
        Slug.SystemFeedbackAcknowledgement
      );
      const { subject, html } = renderTemplateWithVariables(
        template,
        variables
      );
      await this.emailsService.sendEmail({
        to: userEmail,
        subject,
        html,
        slug: Slug.SystemFeedbackAcknowledgement,
      });
    } catch (error) {
      this.logger.error(
        `SYSTEM_FEEDBACK_NOTIFICATION_SERVICE :: SEND_USER_ACKNOWLEDGEMENT_EMAIL : ERROR : ${error}`
      );
    }
  }

  formatStatusLabel(status: string): string {
    return FEEDBACK_STATUS_LABELS[status] ?? status;
  }
}
