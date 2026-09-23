import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";

/**
 * Credit Balance Helper
 *
 * Handles atomic balance operations for user credits.
 */
@Injectable()
export class CreditBalanceHelper {
  private readonly logger = new Logger(CreditBalanceHelper.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Get user's current credit balance
   */
  async getBalance(userId: string): Promise<number> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { creditBalance: true },
    });

    return user ? parseFloat(String(user.creditBalance)) : 0;
  }

  /**
   * Add credits to user's balance atomically
   * Uses row-level lock to prevent race conditions
   */
  async addCredits(
    tx: PostgresJsDatabase<typeof schema>,
    userId: string,
    amount: number
  ): Promise<{ balanceBefore: number; balanceAfter: number }> {
    // Lock the user row
    const [user] = await tx
      .select({ creditBalance: schema.users.creditBalance })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .for("update");

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const balanceBefore = parseFloat(String(user.creditBalance));
    const balanceAfter = balanceBefore + amount;

    await tx
      .update(schema.users)
      .set({
        creditBalance: balanceAfter.toFixed(2),
        updatedAt: toUTC(),
      })
      .where(eq(schema.users.id, userId));

    this.logger.log(
      `Added ${amount} credits to user ${userId}: ${balanceBefore} -> ${balanceAfter}`
    );

    return { balanceBefore, balanceAfter };
  }

  /**
   * Deduct credits from user's balance atomically
   * Uses row-level lock to prevent race conditions
   */
  async deductCredits(
    tx: PostgresJsDatabase<typeof schema>,
    userId: string,
    amount: number
  ): Promise<{ balanceBefore: number; balanceAfter: number }> {
    // Lock the user row
    const [user] = await tx
      .select({ creditBalance: schema.users.creditBalance })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .for("update");

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const balanceBefore = parseFloat(String(user.creditBalance));
    const balanceAfter = Math.max(0, balanceBefore - amount);

    await tx
      .update(schema.users)
      .set({
        creditBalance: balanceAfter.toFixed(2),
        updatedAt: toUTC(),
      })
      .where(eq(schema.users.id, userId));

    this.logger.log(
      `Deducted ${amount} credits from user ${userId}: ${balanceBefore} -> ${balanceAfter}`
    );

    return { balanceBefore, balanceAfter };
  }
}
