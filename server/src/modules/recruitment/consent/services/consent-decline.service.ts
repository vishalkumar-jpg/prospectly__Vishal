import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { JOB_POOL_MATCH_STATUS } from "modules/recruitment/job-pool-matches/job-pool-matches.constants";
import { ConsentTokenService } from "./consent-token.service";
import {
  CONSENT_DECLINE_DONT_KNOW_CONNECTOR,
  CONSENT_MESSAGES,
} from "../consent.constants";
import { isSupersededConsentToken } from "../consent-token.utils";
import { DeclineConsentDto } from "../consent.dto";
import { upsertConnectorBlock } from "../consent-connector-block.utils";
import {
  declinePendingMatchesForConnectorEmail,
  findContactIdsByEmailHash,
} from "../consent-job-claim.utils";

@Injectable()
export class ConsentDeclineService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly consentTokenService: ConsentTokenService
  ) {}

  async declineConsent(dto: DeclineConsentDto) {
    let payload;
    try {
      payload = await this.consentTokenService.verifyToken(dto.token);
    } catch {
      throw new BadRequestException(CONSENT_MESSAGES.ERROR.TOKEN_INVALID);
    }

    const [match] = await this.db
      .select()
      .from(schema.recruitmentJobPoolMatches)
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.id, payload.matchId),
          isNull(schema.recruitmentJobPoolMatches.deletedAt)
        )
      )
      .limit(1);

    if (!match) {
      throw new NotFoundException(CONSENT_MESSAGES.ERROR.MATCH_NOT_FOUND);
    }

    if (isSupersededConsentToken(match, dto.token)) {
      throw new BadRequestException(CONSENT_MESSAGES.ERROR.TOKEN_SUPERSEDED);
    }

    if (match.status === JOB_POOL_MATCH_STATUS.CONSENT_DECLINED) {
      throw new BadRequestException(
        CONSENT_MESSAGES.ERROR.CONSENT_DECLINED_PERMANENT
      );
    }

    if (match.status === JOB_POOL_MATCH_STATUS.CONSENT_SUPERSEDED) {
      throw new BadRequestException(CONSENT_MESSAGES.ERROR.CONSENT_SUPERSEDED);
    }

    if (match.status !== JOB_POOL_MATCH_STATUS.CONSENT_PENDING) {
      throw new BadRequestException(
        CONSENT_MESSAGES.ERROR.CONSENT_ALREADY_RESPONDED
      );
    }

    const now = toUTC();
    const isDontKnow = dto.reason === CONSENT_DECLINE_DONT_KNOW_CONNECTOR;

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.recruitmentJobPoolMatches)
        .set({
          status: JOB_POOL_MATCH_STATUS.CONSENT_DECLINED,
          consentRespondedAt: now,
          consentDeclineReason: dto.reason,
          consentDeclineNotes: dto.notes || null,
          updatedAt: now,
        })
        .where(eq(schema.recruitmentJobPoolMatches.id, payload.matchId));

      // Rule 2: permanent global block + invalidate other pending consents from this connector.
      // Also remove only this connector↔candidate relationship (not the contact itself).
      if (isDontKnow) {
        await upsertConnectorBlock(tx, {
          candidateEmailHash: payload.emailHash,
          connectorUserId: match.connectorUserId,
          contactId: match.contactId,
          reason: dto.notes,
        });

        await declinePendingMatchesForConnectorEmail(tx, {
          connectorUserId: match.connectorUserId,
          emailHash: payload.emailHash,
          excludeMatchId: match.id,
          contactId: match.contactId,
          reason: CONSENT_DECLINE_DONT_KNOW_CONNECTOR,
          notes:
            dto.notes?.trim() ||
            "Candidate indicated they do not know this connector",
        });

        const contactIds = await findContactIdsByEmailHash(
          tx,
          payload.emailHash,
          match.contactId != null ? [match.contactId] : []
        );
        if (contactIds.length > 0) {
          await tx
            .delete(schema.contactRelationships)
            .where(
              and(
                eq(schema.contactRelationships.userId, match.connectorUserId),
                inArray(schema.contactRelationships.contactId, contactIds)
              )
            );
        }
      }
    });

    return { message: CONSENT_MESSAGES.SUCCESS.CONSENT_DECLINED };
  }
}
