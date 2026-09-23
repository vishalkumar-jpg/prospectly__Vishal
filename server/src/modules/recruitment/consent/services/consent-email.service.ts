import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { renderTemplateWithVariables } from "modules/emails/templating";

interface SendConsentEmailParams {
  to: string;
  candidateName: string;
  connectorName: string;
  jobTitle: string;
  companyName: string;
  consentLink: string;
}

@Injectable()
export class ConsentEmailService {
  private readonly logger = new Logger(ConsentEmailService.name);

  constructor(
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService
  ) {}

  async sendConsentEmail(params: SendConsentEmailParams): Promise<{
    success: boolean;
    emailId?: string;
    subject?: string;
    html?: string;
    error?: string;
  }> {
    try {
      const template = await this.emailsService.findTemplateBySlug(
        Slug.CandidateConsent
      );

      const frontendUrl = this.configService.get<string>("FRONTEND_URL");

      const { subject, html } = renderTemplateWithVariables(template, {
        candidateName: params.candidateName,
        connectorName: params.connectorName,
        jobTitle: params.jobTitle,
        companyName: params.companyName,
        consentLink: params.consentLink,
        url: frontendUrl,
      });

      const result = await this.emailsService.sendEmail({
        to: params.to,
        subject,
        html,
        slug: Slug.CandidateConsent,
      });

      if (!result.success) {
        return result;
      }

      return { success: true, emailId: result.emailId, subject, html };
    } catch (error) {
      this.logger.error(
        `CONSENT_EMAIL_SERVICE :: SEND_CONSENT_EMAIL : ERROR : ${error}`
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }
}
