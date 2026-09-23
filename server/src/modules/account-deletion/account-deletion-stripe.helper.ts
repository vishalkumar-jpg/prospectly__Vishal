import { and, eq, isNull } from "drizzle-orm";
import * as schema from "database/schema";
import { Logger } from "@nestjs/common";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { StripeService } from "modules/stripe/stripe.service";

const logger = new Logger("AccountDeletionStripe");

function isStripeResourceAlreadyGone(error: unknown): boolean {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "resource_missing"
  ) {
    return true;
  }
  if (error instanceof Error) {
    return /no such (subscription|customer)/i.test(error.message);
  }
  return false;
}

async function cancelStripeSubscription(
  stripeService: StripeService,
  userId: string,
  subId: string,
  errors: unknown[]
): Promise<void> {
  try {
    logger.log(
      `[Subscription: ${subId}] Canceling subscription for user ${userId}...`
    );
    await stripeService.cancelSubscription(subId);
    logger.log(
      `[Subscription: ${subId}] Subscription canceled successfully for user ${userId}.`
    );
  } catch (e) {
    if (isStripeResourceAlreadyGone(e)) {
      logger.warn(
        `[Subscription: ${subId}] Already removed in Stripe for user ${userId}; skipping.`
      );
      return;
    }
    const errorMsg = `ACCOUNT_DELETION_STRIPE_HELPER :: cancelSubscription : ERROR : ${e instanceof Error ? e.message : e}`;
    logger.error(`[${errorMsg}] [Subscription: ${subId}] [User: ${userId}]`);
    errors.push(e);
  }
}

async function deleteStripeCustomer(
  stripeService: StripeService,
  userId: string,
  stripeCustomerId: string,
  errors: unknown[]
): Promise<void> {
  try {
    logger.log(
      `[Customer: ${stripeCustomerId}] Deleting Stripe customer for user ${userId}...`
    );
    await stripeService.deleteCustomer(stripeCustomerId);
    logger.log(
      `[Customer: ${stripeCustomerId}] Stripe customer deleted successfully for user ${userId}.`
    );
  } catch (e) {
    if (isStripeResourceAlreadyGone(e)) {
      logger.warn(
        `[Customer: ${stripeCustomerId}] Already removed in Stripe for user ${userId}; skipping.`
      );
      return;
    }
    const errorMsg = `ACCOUNT_DELETION_STRIPE_HELPER :: deleteCustomer : ERROR : ${e instanceof Error ? e.message : e}`;
    logger.error(
      `[${errorMsg}] [Customer: ${stripeCustomerId}] [User: ${userId}]`
    );
    errors.push(e);
  }
}

/**
 * Performs a complete Stripe data purge for a user.
 * Can be called with pre-fetched IDs to allow running after the user has been deleted from the database.
 */
export async function purgeStripeData(
  stripeService: StripeService,
  userId: string,
  stripeCustomerId: string | null,
  stripeSubscriptionIds: string[]
): Promise<void> {
  const errors: unknown[] = [];

  for (const subId of stripeSubscriptionIds) {
    await cancelStripeSubscription(stripeService, userId, subId, errors);
  }

  if (stripeCustomerId) {
    await deleteStripeCustomer(stripeService, userId, stripeCustomerId, errors);
  }

  if (errors.length > 0) {
    throw new Error(
      `Failed to complete Stripe purge for user ${userId}: ${errors.length} errors occurred.`
    );
  }
}

/** Legacy helper: fetches and cancels subscriptions. Use purgeStripeData for full cleanup. */
export async function cancelSubscriptionsForUser(
  db: PostgresJsDatabase<typeof schema>,
  stripeService: StripeService,
  userId: string
): Promise<void> {
  const subs = await db
    .select({
      stripeSubscriptionId: schema.userSubscription.stripeSubscriptionId,
    })
    .from(schema.userSubscription)
    .where(
      and(
        eq(schema.userSubscription.userId, userId),
        isNull(schema.userSubscription.deletedAt)
      )
    );

  if (subs.length === 0) {
    logger.log(`[User: ${userId}] No active subscriptions found to cancel.`);
    return;
  }

  const subIds = subs
    .map((s) => s.stripeSubscriptionId)
    .filter((id): id is string => !!id);
  await purgeStripeData(stripeService, userId, null, subIds);
}
