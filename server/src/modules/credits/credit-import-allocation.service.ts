import { Injectable, Inject, Logger } from "@nestjs/common";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import { CreditBalanceHelper } from "./helpers/credit-balance.helper";
import {
  CreditImportMetricsHelper,
  normalizeContactImportProviderKey,
} from "./credit-import-metrics.helper";
import { CREDIT_TRANSACTION_TYPES } from "./credits.constants";

const IMPORT_COMPLETED = "completed" as const;

@Injectable()
export class CreditImportAllocationService {
  private readonly logger = new Logger(CreditImportAllocationService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly creditBalanceHelper: CreditBalanceHelper,
    private readonly metrics: CreditImportMetricsHelper
  ) {}

  /**
   * Idempotent for awards: `FOR UPDATE` on the import row, advisory lock per user+provider, and
   * at most one `user_credit_awards` row per provider. Re-runs for the same `contactsImportId`
   * are safe (may repeat skip logs). Awards at most one lump sum per user per credit provider.
   */
  async processCompletedImport(contactsImportId: string): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        const rows = await tx
          .select({
            userId: schema.contactsImports.userId,
            provider: schema.contactsImports.provider,
          })
          .from(schema.contactsImports)
          .where(
            and(
              eq(schema.contactsImports.id, contactsImportId),
              eq(schema.contactsImports.status, IMPORT_COMPLETED),
              isNotNull(schema.contactsImports.completedAt)
            )
          )
          .for("update")
          .limit(1);

        const [importRow] = rows;
        if (!importRow) {
          this.logger.log(
            `CREDIT_IMPORT_ALLOCATION_SERVICE :: processCompletedImport :: skip_no_eligible_row :: contactsImportId=${contactsImportId} (not status completed with completed_at set)`
          );
          return;
        }

        const { userId } = importRow;
        if (!userId) {
          this.logger.warn(
            `CREDIT_IMPORT_ALLOCATION_SERVICE :: processCompletedImport :: skip_no_user_id :: contactsImportId=${contactsImportId} provider=${importRow.provider}`
          );
          return;
        }

        const providerKey = normalizeContactImportProviderKey(
          importRow.provider
        );

        const advisoryKey = `${userId}:${providerKey}`;
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${advisoryKey}))`
        );

        const rule = await tx.query.creditRulesSchema.findFirst({
          where: and(
            sql`lower(${schema.creditRulesSchema.provider}) = lower(${providerKey})`,
            eq(schema.creditRulesSchema.isActive, true),
            isNull(schema.creditRulesSchema.deletedAt)
          ),
        });

        if (!rule) {
          this.logger.warn(
            `CREDIT_IMPORT_ALLOCATION_SERVICE :: processCompletedImport :: skip_no_active_rule :: contactsImportId=${contactsImportId} userId=${userId} providerKey=${providerKey}`
          );
          return;
        }

        const existingAward = await tx.query.userCreditAwards.findFirst({
          where: and(
            eq(schema.userCreditAwards.userId, userId),
            sql`lower(${schema.userCreditAwards.provider}) = lower(${providerKey})`
          ),
        });

        if (existingAward) {
          this.logger.log(
            `CREDIT_IMPORT_ALLOCATION_SERVICE :: processCompletedImport :: skip_award_already_exists :: contactsImportId=${contactsImportId} userId=${userId} providerKey=${providerKey}`
          );
          return;
        }

        const creditEligibleContactCount =
          await this.metrics.getCreditEligibleImportedContactCount(
            tx,
            userId,
            providerKey
          );
        const threshold = Number(rule.contactImport);
        if (
          !Number.isFinite(threshold) ||
          threshold < 0 ||
          !Number.isInteger(threshold)
        ) {
          this.logger.log(
            `CREDIT_IMPORT_ALLOCATION_SERVICE :: processCompletedImport :: skip_invalid_rule_threshold :: contactsImportId=${contactsImportId} userId=${userId} providerKey=${providerKey} contactImportRaw=${String(rule.contactImport)}`
          );
          return;
        }
        if (creditEligibleContactCount < threshold) {
          this.logger.log(
            `CREDIT_IMPORT_ALLOCATION_SERVICE :: processCompletedImport :: skip_threshold_not_met :: contactsImportId=${contactsImportId} userId=${userId} providerKey=${providerKey} creditEligibleContactCount=${String(creditEligibleContactCount)} threshold=${String(threshold)}`
          );
          return;
        }

        const amount = parseFloat(String(rule.credits));
        if (!Number.isFinite(amount) || amount <= 0) {
          this.logger.log(
            `CREDIT_IMPORT_ALLOCATION_SERVICE :: processCompletedImport :: skip_invalid_credits_amount :: contactsImportId=${contactsImportId} userId=${userId} providerKey=${providerKey} creditsRaw=${String(rule.credits)}`
          );
          return;
        }

        const { balanceBefore, balanceAfter } =
          await this.creditBalanceHelper.addCredits(tx, userId, amount);

        await tx.insert(schema.userCreditAwards).values({
          userId,
          provider: providerKey,
          creditRuleId: rule.id,
          contactsAtAward: creditEligibleContactCount,
          creditsAwarded: amount.toFixed(2),
          awardedAt: toUTC(),
        });

        await tx.insert(schema.userCreditHistory).values({
          userId,
          creditRuleId: rule.id,
          transactionType: CREDIT_TRANSACTION_TYPES.EARNED,
          provider: providerKey,
          amount: amount.toFixed(2),
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter: balanceAfter.toFixed(2),
          enrichedContactsCount: creditEligibleContactCount,
          evidence: {
            ruleId: rule.id,
            contactsImportId,
            creditEligibleContactCount,
            threshold,
            provider: providerKey,
          },
        });

        this.logger.log(
          `CREDIT_IMPORT_ALLOCATION_SERVICE :: processCompletedImport :: awarded :: contactsImportId=${contactsImportId} userId=${userId} providerKey=${providerKey} ruleId=${rule.id} amount=${String(amount)} creditEligibleContactCount=${String(creditEligibleContactCount)} threshold=${String(threshold)}`
        );
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `CREDIT_IMPORT_ALLOCATION_SERVICE :: processCompletedImport : ERROR : ${message}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
