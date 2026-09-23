import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { ConfigService } from "@nestjs/config";
import { EncryptionService } from "shared/encryption.service";
import { JOB_POOL_MATCH_STATUS } from "modules/recruitment/job-pool-matches/job-pool-matches.constants";
import { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { RECRUITMENT_EMAIL_LOG_TYPE } from "modules/recruitment/email-logs/recruitment-email-logs.constants";
import { logRecruitmentEmailSent } from "modules/recruitment/email-logs/recruitment-email-log.helper";
import { ConsentTokenService } from "./consent-token.service";
import { ConsentEmailService } from "./consent-email.service";
import { CONSENT_MESSAGES } from "../consent.constants";
import { isConnectorBlockedForCandidate } from "../consent-connector-block.utils";
import {
  hashCandidateEmail,
  isJobAppliedForEmail,
  isJobConsentAcceptedForEmail,
  supersedeOtherMatchesForJobEmail,
} from "../consent-job-claim.utils";

@Injectable()
export class ConsentResendService {
  private readonly logger = new Logger(ConsentResendService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly consentTokenService: ConsentTokenService,
    private readonly encryptionService: EncryptionService,
    private readonly consentEmailService: ConsentEmailService,
    private readonly configService: ConfigService,
    private readonly emailLogsService: RecruitmentEmailLogsService
  ) {}

  async resendConsent(userId: string, matchId: string) {
    const [match] = await this.db
      .select()
      .from(schema.recruitmentJobPoolMatches)
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.id, matchId),
          isNull(schema.recruitmentJobPoolMatches.deletedAt)
        )
      )
      .limit(1);

    if (!match) {
      throw new NotFoundException(CONSENT_MESSAGES.ERROR.MATCH_NOT_FOUND);
    }

    const [job] = await this.db
      .select()
      .from(schema.recruitmentJobsSchema)
      .where(eq(schema.recruitmentJobsSchema.id, match.jobId))
      .limit(1);

    const isConnector = match.connectorUserId === userId;
    const isRecruiter = job?.requesterId === userId;
    if (!isConnector && !isRecruiter) {
      throw new NotFoundException(CONSENT_MESSAGES.ERROR.MATCH_NOT_FOUND);
    }

    if (match.status !== JOB_POOL_MATCH_STATUS.CONSENT_PENDING) {
      throw new BadRequestException(
        CONSENT_MESSAGES.ERROR.CONSENT_RESEND_NOT_PENDING
      );
    }

    const sensitiveData = await this.db.query.contactSensitiveData.findFirst({
      where: eq(schema.contactSensitiveData.contactId, match.contactId),
    });

    if (!sensitiveData?.email) {
      throw new BadRequestException(CONSENT_MESSAGES.ERROR.EMAIL_NOT_FOUND);
    }

    const candidateEmail = await this.encryptionService.decryptContactEmail(
      sensitiveData.email,
      match.contactId
    );

    if (!candidateEmail) {
      throw new BadRequestException(CONSENT_MESSAGES.ERROR.EMAIL_NOT_FOUND);
    }

    const emailHash = hashCandidateEmail(candidateEmail);

    if (
      isConnector &&
      (await isConnectorBlockedForCandidate(this.db, {
        connectorUserId: userId,
        candidateEmailHash: emailHash,
      }))
    ) {
      throw new ConflictException(
        CONSENT_MESSAGES.ERROR.CONNECTOR_BLOCKED_BY_CANDIDATE
      );
    }

    // Another connector already accepted (same email, possibly different contactId).
    if (
      await isJobConsentAcceptedForEmail(this.db, {
        jobId: match.jobId,
        emailHash,
        contactId: match.contactId,
      })
    ) {
      await supersedeOtherMatchesForJobEmail(this.db, {
        jobId: match.jobId,
        emailHash,
        excludeMatchId: match.id,
        contactId: match.contactId,
      });
      // Include this stale pending match.
      await this.db
        .update(schema.recruitmentJobPoolMatches)
        .set({
          status: JOB_POOL_MATCH_STATUS.CONSENT_SUPERSEDED,
          consentToken: null,
          consentRespondedAt: toUTC(),
          updatedAt: toUTC(),
        })
        .where(eq(schema.recruitmentJobPoolMatches.id, matchId));

      throw new ConflictException(
        CONSENT_MESSAGES.ERROR.CLAIMED_BY_OTHER_CONNECTOR
      );
    }

    if (
      await isJobAppliedForEmail(this.db, {
        jobId: match.jobId,
        emailHash,
        contactId: match.contactId,
      })
    ) {
      throw new ConflictException(
        CONSENT_MESSAGES.ERROR.CANDIDATE_ALREADY_APPLIED
      );
    }

    const contact = await this.db.query.contacts.findFirst({
      where: eq(schema.contacts.id, match.contactId),
    });

    const connector = await this.db.query.users.findFirst({
      where: eq(schema.users.id, match.connectorUserId),
    });

    if (!job || job.status === "closed") {
      throw new BadRequestException(CONSENT_MESSAGES.ERROR.JOB_CLOSED);
    }

    const candidateName = contact
      ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "there"
      : "there";

    const connectorFirstName = connector?.firstName || "";
    const connectorLastInitial = connector?.lastName
      ? `${connector.lastName.charAt(0)}.`
      : "";
    const connectorName =
      `${connectorFirstName} ${connectorLastInitial}`.trim();

    const token = await this.consentTokenService.generateToken(
      matchId,
      match.contactId,
      match.jobId,
      match.connectorUserId,
      emailHash
    );

    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    const consentLink = `${frontendUrl}/consent/${token}`;

    const emailResult = await this.consentEmailService.sendConsentEmail({
      to: candidateEmail,
      candidateName,
      connectorName,
      jobTitle: job.title || "a position",
      companyName: job.companyName || "a company",
      consentLink,
    });

    if (!emailResult.success) {
      this.logger.error(
        `CONSENT_RESEND_SERVICE :: RESEND_CONSENT : EMAIL_FAILED : ${emailResult.error}`
      );
      throw new BadRequestException(
        emailResult.error ?? "Failed to resend consent email"
      );
    }

    const now = toUTC();
    await this.db
      .update(schema.recruitmentJobPoolMatches)
      .set({
        consentToken: token,
        consentSentAt: now,
        updatedAt: now,
      })
      .where(eq(schema.recruitmentJobPoolMatches.id, matchId));

    try {
      await logRecruitmentEmailSent(
        this.emailLogsService,
        emailResult.emailId,
        {
          jobId: match.jobId,
          poolMatchId: matchId,
          candidateId: null,
          emailType: RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_CONSENT,
          recipientType: "candidate",
          recipientEmail: candidateEmail,
          subject: emailResult.subject,
          emailBody: emailResult.html,
          createdBy: userId,
        }
      );
    } catch (logError) {
      this.logger.error(
        `CONSENT_RESEND_SERVICE :: RESEND_CONSENT : EMAIL_LOG : ERROR : ${logError}`
      );
    }

    return {
      message: CONSENT_MESSAGES.SUCCESS.CONSENT_RESENT,
      candidateName,
    };
  }
}
