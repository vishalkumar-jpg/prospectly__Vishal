import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import { StripeService } from "modules/stripe/stripe.service";
import { utcDayjs, toUTC } from "utils/dayjs";
import { Client as TypesenseClient } from "typesense";
import {
  TYPESENSE_TOKEN,
  TYPESENSE_COLLECTION_NAME,
} from "modules/typesense/core/typesense.constants";
import { purgeContactsForUser } from "./account-deletion-contacts.helper";
import { purgeStripeData } from "./account-deletion-stripe.helper";
import { deleteUserRelatedData } from "./account-deletion-database.helper";
import { nullContactResumeUserRefs } from "./account-deletion-contacts-audit.helper";
import { purgeResumeSearchIndexForUser } from "./account-deletion-resume-index.helper";
import { AccountDeletionQueueService } from "./account-deletion-queue.service";

export interface AccountDeletionRequestResult {
  scheduledAt: string | null;
  immediate: boolean;
}

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService,
    private readonly moduleRef: ModuleRef,
    @Inject(TYPESENSE_TOKEN) private readonly typesenseClient: TypesenseClient
  ) {}

  async requestDeletion(
    userId: string,
    survey?: {
      surveyData?: schema.AccountDeletionSurveyData;
    }
  ): Promise<AccountDeletionRequestResult> {
    const [existing] = await this.db
      .select({
        requestedAt: schema.userConfigurations.accountDeletionRequestedAt,
        scheduledAt: schema.userConfigurations.accountDeletionScheduledAt,
      })
      .from(schema.userConfigurations)
      .where(eq(schema.userConfigurations.userId, userId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException("User not found");
    }

    if (existing.requestedAt) {
      return {
        scheduledAt: existing.scheduledAt
          ? existing.scheduledAt.toISOString()
          : null,
        immediate: false,
      };
    }

    if (survey?.surveyData) {
      try {
        const [user] = await this.db
          .select({ email: schema.users.email })
          .from(schema.users)
          .where(eq(schema.users.id, userId))
          .limit(1);

        await this.db.insert(schema.accountDeletionSurveys).values({
          surveyData: survey.surveyData,
          email: user?.email || null,
        });
      } catch (error) {
        this.logger.error(
          `Failed to save account deletion survey for user ${userId}: ${error}`
        );
      }
    }

    // Explicit UTC timeline for users.account_deletion_* (timestamptz); avoids OS-local parsing.
    const now = toUTC();
    const scheduled = toUTC(utcDayjs(now).add(24, "hours"));

    await this.db
      .update(schema.userConfigurations)
      .set({
        accountDeletionRequestedAt: now,
        accountDeletionScheduledAt: scheduled,
        updatedAt: toUTC(),
      })
      .where(eq(schema.userConfigurations.userId, userId));

    const delayMs = utcDayjs(scheduled).diff(utcDayjs(now));
    const queueSvc = this.moduleRef.get(AccountDeletionQueueService, {
      strict: false,
    });
    if (queueSvc) {
      try {
        await queueSvc.enqueuePurge(userId, Math.max(0, delayMs));
      } catch (error) {
        this.logger.warn(
          `Failed to enqueue account deletion purge for user ${userId} (delay: ${delayMs}ms): ${error}`
        );
      }
    }

    return {
      scheduledAt: scheduled.toISOString(),
      immediate: false,
    };
  }

  /** Clears a pending scheduled deletion and removes the delayed queue job when present. */
  async cancelDeletionRequest(userId: string): Promise<void> {
    const [existing] = await this.db
      .select({
        requestedAt: schema.userConfigurations.accountDeletionRequestedAt,
      })
      .from(schema.userConfigurations)
      .where(eq(schema.userConfigurations.userId, userId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException("User not found");
    }

    if (!existing.requestedAt) {
      throw new ConflictException("No pending account deletion request");
    }

    const [user] = await this.db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.userConfigurations)
        .set({
          accountDeletionRequestedAt: null,
          accountDeletionScheduledAt: null,
          updatedAt: toUTC(),
        })
        .where(eq(schema.userConfigurations.userId, userId));

      if (user?.email) {
        await tx
          .delete(schema.accountDeletionSurveys)
          .where(eq(schema.accountDeletionSurveys.email, user.email));
      }
    });

    const queueSvc = this.moduleRef.get(AccountDeletionQueueService, {
      strict: false,
    });
    if (queueSvc) {
      try {
        await queueSvc.removeScheduledPurge(userId);
      } catch (error) {
        this.logger.warn(
          `Failed to remove scheduled account deletion purge for user ${userId}: ${error}`
        );
      }
    }

    this.logger.log(`Account deletion cancelled for user ${userId}`);
  }

  /** Idempotent final purge: Stripe cancel, contacts, refresh tokens, delete user row. */
  async purgeUserData(userId: string): Promise<void> {
    const [row] = await this.db
      .select({
        id: schema.users.id,
        accountDeletionRequestedAt:
          schema.userConfigurations.accountDeletionRequestedAt,
        stripeCustomerId: schema.users.stripeCustomerId,
      })
      .from(schema.users)
      .leftJoin(
        schema.userConfigurations,
        eq(schema.users.id, schema.userConfigurations.userId)
      )
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!row) {
      this.logger.log(`Purge skipped — user ${userId} already removed`);
      return;
    }

    if (!row.accountDeletionRequestedAt) {
      this.logger.log(
        `Purge skipped — user ${userId} cancelled deletion or was cleared`
      );
      return;
    }

    // Pre-fetch Stripe data before deleting rows, as FKs or row deletions will clear these values.
    const activeSubscriptions = await this.db
      .select({ id: schema.userSubscription.stripeSubscriptionId })
      .from(schema.userSubscription)
      .where(eq(schema.userSubscription.userId, userId));

    const subscriptionIds = activeSubscriptions
      .map((s) => s.id)
      .filter((id): id is string => !!id);

    let deletedContactIds: number[] = [];
    // Step 1: Database cleanup in a single transaction.
    await this.db.transaction(async (tx) => {
      // Must precede deleteUserRelatedData: it hard-deletes candidate rows and
      // contact_resumes.candidate_id is ON DELETE SET NULL, which would orphan
      // the index rows while they still hold a live embedding.
      await purgeResumeSearchIndexForUser(tx, userId);

      // Clear all user-related data across various tables
      await deleteUserRelatedData(tx, userId);

      // Handle contacts (transfer ownership or hard delete). Resumes reached
      // through a contact are purged inside this call, immediately before the
      // contacts are deleted — afterwards the ON DELETE SET NULL on
      // contact_resumes.contact_id has already severed the link.
      deletedContactIds = await purgeContactsForUser(tx, userId);

      await nullContactResumeUserRefs(tx, userId);

      // Final security and identity cleanup
      await tx
        .delete(schema.refreshTokens)
        .where(eq(schema.refreshTokens.userId, userId));

      await tx.delete(schema.users).where(eq(schema.users.id, userId));
    });

    // Step 2: External cleanup (Stripe). Perform AFTER transaction succeeds.
    // If this fails, the DB work is already committed, so we log errors but don't rollback.
    // The BullMQ job can still retry if it fails here, provided it handles the case where the user is already gone.
    await purgeStripeData(
      this.stripeService,
      userId,
      row.stripeCustomerId,
      subscriptionIds
    );

    // Step 3: Typesense cleanup. Perform AFTER database transaction succeeds.
    if (deletedContactIds.length > 0) {
      try {
        await this.typesenseClient
          .collections(TYPESENSE_COLLECTION_NAME)
          .documents()
          .delete({ filter_by: `contact_id:[${deletedContactIds.join(",")}]` });

        this.logger.log(
          `Deleted ${deletedContactIds.length} contact records from Typesense for user ${userId}`
        );
      } catch (error) {
        this.logger.error(
          `Error deleting Typesense records for user ${userId}: ${error}`
        );
      }
    }

    this.logger.log(`Account purge completed for user ${userId}`);
  }
}
