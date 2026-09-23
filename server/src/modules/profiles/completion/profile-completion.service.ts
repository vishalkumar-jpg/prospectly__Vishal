import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import {
  getPayoutCurrencyForCountry,
  isSupportedPayoutCountry,
} from "config/payment.config";
import { toUTC } from "utils/dayjs";
import { Transaction } from "./completion.types";
import { GeoLookupService } from "./geo-lookup.service";
import { OrganizationMembershipService } from "./organization-membership.service";
import { ProfileCompletionStateService } from "./profile-completion-state.service";
import { UpdateProfileCompletionDto } from "./profile-completion.dto";
import {
  PROFILE_COMPLETION_MESSAGES,
  PROFILE_COMPLETION_STEPS,
} from "./profile-completion.constants";
import { ProfileCompletionStatus } from "./profile-completion.response";

@Injectable()
export class ProfileCompletionService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly geoLookupService: GeoLookupService,
    private readonly stateService: ProfileCompletionStateService,
    private readonly membershipService: OrganizationMembershipService
  ) {}

  /**
   * Reports which steps are outstanding, plus any server-derived suggestion.
   *
   * The geolocation lookup runs only when country is actually missing, so a
   * fully-onboarded user costs zero outbound requests.
   */
  async getStatus(
    userId: string,
    clientIp: string
  ): Promise<ProfileCompletionStatus> {
    const state = await this.stateService.load(userId);
    const missingSteps = this.stateService.resolveMissingSteps(state);

    const status: ProfileCompletionStatus = {
      isComplete: missingSteps.length === 0,
      missingSteps,
      optionalSteps: this.stateService.resolveOptionalSteps(state),
      suggestions: {},
      current: { organization: state.organization },
    };

    if (missingSteps.includes(PROFILE_COMPLETION_STEPS.COUNTRY)) {
      const detected = await this.geoLookupService.lookupCountry(clientIp);

      status.suggestions = {
        country: { detected, supported: isSupportedPayoutCountry(detected) },
      };
    }

    return status;
  }

  /** Applies one or more completion steps and returns the refreshed status. */
  async applyUpdates(userId: string, dto: UpdateProfileCompletionDto) {
    if (dto.organizationId && dto.organizationName) {
      throw new BadRequestException(
        PROFILE_COMPLETION_MESSAGES.ERROR.ORGANIZATION_AMBIGUOUS
      );
    }

    const state = await this.stateService.load(userId);
    const wantsOrganization = !!(dto.organizationId || dto.organizationName);

    if (wantsOrganization && state.organization) {
      throw new ConflictException(
        PROFILE_COMPLETION_MESSAGES.ERROR.ORGANIZATION_ALREADY_SET
      );
    }

    const skipsOrganization =
      !!dto.skipOrganization && !state.organization && !wantsOrganization;

    if (dto.country === undefined && !wantsOrganization && !skipsOrganization) {
      throw new BadRequestException(
        PROFILE_COMPLETION_MESSAGES.ERROR.NO_FIELDS_PROVIDED
      );
    }

    await this.db.transaction(async (tx) => {
      if (dto.country !== undefined) {
        await this.updateCountry(tx, userId, dto.country);
      }

      if (wantsOrganization) {
        const organizationId = dto.organizationName
          ? await this.membershipService.create(
              tx,
              userId,
              dto.organizationName
            )
          : dto.organizationId!;

        await this.membershipService.addMember(tx, userId, organizationId);
      }

      if (skipsOrganization) {
        await this.stateService.markOrganizationSkipped(tx, userId);
      }
    });

    const refreshed = await this.stateService.load(userId);
    const missingSteps = this.stateService.resolveMissingSteps(refreshed);

    return {
      isComplete: missingSteps.length === 0,
      missingSteps,
      optionalSteps: this.stateService.resolveOptionalSteps(refreshed),
      country: refreshed.country,
      payoutCurrency: getPayoutCurrencyForCountry(refreshed.country),
      organization: refreshed.organization,
    };
  }

  private async updateCountry(
    tx: Transaction,
    userId: string,
    country: string
  ) {
    const [updated] = await tx
      .update(schema.users)
      .set({
        country,
        // Keep payout currency in lockstep with country, matching the general
        // profile update path so the two cannot drift.
        payoutCurrency: getPayoutCurrencyForCountry(country),
        updatedAt: toUTC(),
      })
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)))
      .returning({ id: schema.users.id });

    if (!updated) {
      throw new NotFoundException(
        PROFILE_COMPLETION_MESSAGES.ERROR.PROFILE_NOT_FOUND
      );
    }
  }
}
