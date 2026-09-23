import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { EncryptionService } from "shared/encryption.service";
import { normalizeEmail } from "services/contactMatchingService";
import {
  JOB_POOL_MATCH_SOURCE,
  JOB_POOL_MATCH_STATUS,
} from "modules/recruitment/job-pool-matches/job-pool-matches.constants";
import { ConsentTokenService } from "./consent-token.service";
import { CONSENT_MESSAGES } from "../consent.constants";
import { hashCandidateEmail } from "../consent-job-claim.utils";
import { updateContactEmailForConsent } from "../consent-update-contact-email.helper";
import { assertConsentChangeEmailTargetAllowed } from "../consent-update-email-guards.helper";
import {
  findExistingContactIdForConsentEmailChange,
  relinkConsentMatchToExistingContact,
} from "../consent-update-email-relink.helper";
import { ConsentEmailSendQueueService } from "../consent-email-send-queue.service";

@Injectable()
export class ConsentUpdateEmailService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly consentTokenService: ConsentTokenService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
    private readonly consentEmailSendQueue: ConsentEmailSendQueueService
  ) {}

  async getConsentEmail(userId: string, matchId: string) {
    const { match, candidateEmail } = await this.loadEditableMatch(
      userId,
      matchId
    );
    return { email: candidateEmail, matchId: match.id };
  }

  async updateConsentEmailAndSend(
    userId: string,
    matchId: string,
    rawEmail: string
  ) {
    const normalized = normalizeEmail(rawEmail);
    if (!normalized) {
      throw new BadRequestException(CONSENT_MESSAGES.ERROR.INVALID_EMAIL);
    }

    const ctx = await this.loadEditableMatch(userId, matchId);
    const { match, candidateEmail, connector, job } = ctx;

    const newHash = hashCandidateEmail(normalized);
    if (newHash === hashCandidateEmail(candidateEmail)) {
      throw new BadRequestException(CONSENT_MESSAGES.ERROR.EMAIL_UNCHANGED);
    }

    const existingContactId = await findExistingContactIdForConsentEmailChange(
      this.db,
      newHash,
      match.contactId
    );

    let targetMatchId = match.id;
    let targetContactId = match.contactId;

    if (existingContactId != null) {
      await assertConsentChangeEmailTargetAllowed(this.db, match, newHash, {
        skipDuplicateUploadCheck: true,
      });
      const relinked = await relinkConsentMatchToExistingContact(this.db, {
        sourceMatch: match,
        targetContactId: existingContactId,
        emailHash: newHash,
      });
      targetMatchId = relinked.targetMatchId;
      targetContactId = relinked.targetContactId;
    } else {
      await assertConsentChangeEmailTargetAllowed(this.db, match, newHash);
      await updateContactEmailForConsent(this.db, match.contactId, normalized);
      await this.db
        .update(schema.recruitmentUploadJobs)
        .set({ candidateEmailHash: newHash, updatedAt: toUTC() })
        .where(eq(schema.recruitmentUploadJobs.poolMatchId, matchId));
    }

    const targetContact = await this.db.query.contacts.findFirst({
      where: eq(schema.contacts.id, targetContactId),
    });
    const candidateName =
      `${targetContact?.firstName || ""} ${targetContact?.lastName || ""}`.trim() ||
      "there";
    const connectorName = this.formatConnectorName(connector);

    const token = await this.consentTokenService.generateToken(
      targetMatchId,
      targetContactId,
      match.jobId,
      match.connectorUserId,
      newHash
    );

    const now = toUTC();
    await this.db
      .update(schema.recruitmentJobPoolMatches)
      .set({
        consentToken: token,
        consentSentAt: null,
        updatedAt: now,
      })
      .where(eq(schema.recruitmentJobPoolMatches.id, targetMatchId));

    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    const consentLink = `${frontendUrl}/consent/${token}`;

    await this.consentEmailSendQueue.enqueueConsentUpdateEmailSend({
      poolMatchId: targetMatchId,
      recruitmentJobId: match.jobId,
      consentToken: token,
      to: normalized,
      candidateName,
      connectorName,
      jobTitle: job.title || "a position",
      companyName: job.companyName || "a company",
      consentLink,
      createdBy: userId,
    });

    return {
      message: existingContactId
        ? CONSENT_MESSAGES.SUCCESS.CONSENT_EMAIL_LINKED
        : CONSENT_MESSAGES.SUCCESS.CONSENT_EMAIL_UPDATED,
      candidateName,
      email: normalized,
      matchId: targetMatchId,
      linkedExistingContact: existingContactId != null,
    };
  }

  private async loadEditableMatch(userId: string, matchId: string) {
    const [match] = await this.db
      .select()
      .from(schema.recruitmentJobPoolMatches)
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.id, matchId),
          eq(schema.recruitmentJobPoolMatches.connectorUserId, userId),
          eq(
            schema.recruitmentJobPoolMatches.source,
            JOB_POOL_MATCH_SOURCE.CONNECTOR_UPLOADED
          ),
          eq(
            schema.recruitmentJobPoolMatches.status,
            JOB_POOL_MATCH_STATUS.CONSENT_PENDING
          ),
          isNull(schema.recruitmentJobPoolMatches.deletedAt)
        )
      )
      .limit(1);

    if (!match) {
      throw new NotFoundException(
        CONSENT_MESSAGES.ERROR.CONSENT_EMAIL_EDIT_NOT_ALLOWED
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

    const [job] = await this.db
      .select()
      .from(schema.recruitmentJobsSchema)
      .where(eq(schema.recruitmentJobsSchema.id, match.jobId))
      .limit(1);

    if (!job || job.status === "closed") {
      throw new BadRequestException(CONSENT_MESSAGES.ERROR.JOB_CLOSED);
    }

    const connector = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    return { match, candidateEmail, connector, job };
  }

  private formatConnectorName(
    connector:
      | { firstName?: string | null; lastName?: string | null }
      | undefined
  ) {
    const first = connector?.firstName || "";
    const lastInitial = connector?.lastName
      ? `${connector.lastName.charAt(0)}.`
      : "";
    return `${first} ${lastInitial}`.trim();
  }
}
