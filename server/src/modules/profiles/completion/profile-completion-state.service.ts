import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { isSupportedPayoutCountry } from "config/payment.config";
import { toUTC } from "utils/dayjs";
import { Transaction } from "./completion.types";
import { OrganizationLookupService } from "./organization-lookup.service";
import {
  OPTIONAL_PROFILE_STEPS,
  PROFILE_COMPLETION_MESSAGES,
  PROFILE_COMPLETION_STEPS,
  ProfileCompletionStep,
  REQUIRED_PROFILE_STEPS,
} from "./profile-completion.constants";
import { CurrentOrganization } from "./profile-completion.response";

export interface CompletionState {
  country: string | null;
  organization: CurrentOrganization | null;
  hasSkippedOrganisation: boolean;
}

/** Resolves what the gate still owes for a user, and records a declined step. */
@Injectable()
export class ProfileCompletionStateService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly organizationLookupService: OrganizationLookupService
  ) {}

  async load(userId: string): Promise<CompletionState> {
    const [user] = await this.db
      .select({
        country: schema.users.country,
        hasSkippedOrganisation:
          schema.userConfigurations.hasSkippedOrganisation,
      })
      .from(schema.users)
      .leftJoin(
        schema.userConfigurations,
        eq(schema.userConfigurations.userId, schema.users.id)
      )
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)))
      .limit(1);

    if (!user) {
      throw new NotFoundException(
        PROFILE_COMPLETION_MESSAGES.ERROR.PROFILE_NOT_FOUND
      );
    }

    return {
      country: user.country,
      organization:
        await this.organizationLookupService.findCurrentMembership(userId),
      hasSkippedOrganisation: user.hasSkippedOrganisation ?? false,
    };
  }

  resolveMissingSteps(state: CompletionState): ProfileCompletionStep[] {
    return REQUIRED_PROFILE_STEPS.filter((step) => {
      switch (step) {
        case PROFILE_COMPLETION_STEPS.COUNTRY:
          return !isSupportedPayoutCountry(state.country);
        default:
          return false;
      }
    });
  }

  resolveOptionalSteps(state: CompletionState): ProfileCompletionStep[] {
    return OPTIONAL_PROFILE_STEPS.filter((step) => {
      switch (step) {
        case PROFILE_COMPLETION_STEPS.ORGANIZATION:
          return !state.organization && !state.hasSkippedOrganisation;
        default:
          return false;
      }
    });
  }

  // Deliberately not delegated to UserConfigurationsService: that one is bound
  // to its own db handle and would escape the caller's transaction.
  async markOrganizationSkipped(tx: Transaction, userId: string) {
    await tx
      .insert(schema.userConfigurations)
      .values({ userId, hasSkippedOrganisation: true })
      .onConflictDoUpdate({
        target: schema.userConfigurations.userId,
        set: { hasSkippedOrganisation: true, updatedAt: toUTC() },
      });
  }
}
