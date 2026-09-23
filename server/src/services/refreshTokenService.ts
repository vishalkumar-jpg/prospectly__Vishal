import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, and, lt, or, inArray } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { refreshTokens } from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { toUTC, utcDayjs } from "utils/dayjs";
import * as crypto from "node:crypto";

// Delete in batches so a large backlog never becomes one long-running DELETE.
const CLEANUP_BATCH_SIZE = 5000;
// Revoked tokens are unusable immediately; keep them briefly for troubleshooting.
const REVOKED_TOKEN_RETENTION_DAYS = 7;

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async storeRefreshToken(
    token: string,
    userId: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    const tokenHash = this.hashToken(token);

    try {
      await this.db.insert(refreshTokens).values({
        userId,
        tokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      });
      this.logger.debug(`Stored refresh token for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to store refresh token: ${error.message}`);
      throw error;
    }
  }

  async invalidateRefreshToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    try {
      await this.db
        .update(refreshTokens)
        .set({
          isRevoked: true,
          revokedAt: toUTC(),
        })
        .where(eq(refreshTokens.tokenHash, tokenHash));
      this.logger.debug("Refresh token invalidated");
    } catch (error) {
      this.logger.error(`Failed to invalidate refresh token: ${error.message}`);
    }
  }

  async isRefreshTokenValid(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);

    try {
      const result = await this.db
        .select({ expiresAt: refreshTokens.expiresAt })
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            eq(refreshTokens.isRevoked, false)
          )
        )
        .limit(1);

      if (result.length === 0) {
        return false;
      }

      const [storedToken] = result;
      const now = toUTC();

      if (storedToken.expiresAt < now) {
        await this.invalidateRefreshToken(token);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to validate refresh token: ${error.message}`);
      return false;
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    const now = toUTC();
    const revokedBefore = toUTC(
      utcDayjs().subtract(REVOKED_TOKEN_RETENTION_DAYS, "day")
    );

    try {
      for (;;) {
        const deleted = await this.db
          .delete(refreshTokens)
          .where(
            inArray(
              refreshTokens.id,
              this.db
                .select({ id: refreshTokens.id })
                .from(refreshTokens)
                .where(
                  or(
                    lt(refreshTokens.expiresAt, now),
                    and(
                      eq(refreshTokens.isRevoked, true),
                      lt(refreshTokens.revokedAt, revokedBefore)
                    )
                  )
                )
                .limit(CLEANUP_BATCH_SIZE)
            )
          )
          .returning({ id: refreshTokens.id });

        if (deleted.length < CLEANUP_BATCH_SIZE) {
          break;
        }
      }
      this.logger.debug("Cleaned up expired refresh tokens");
    } catch (error) {
      this.logger.error(`Failed to cleanup expired tokens: ${error.message}`);
      throw error;
    }
  }
}
