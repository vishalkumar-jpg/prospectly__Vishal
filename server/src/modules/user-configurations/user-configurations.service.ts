import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { userConfigurations } from "database/schema/user-configurations";
import { eq } from "drizzle-orm";
import { toUTC } from "utils/dayjs";

@Injectable()
export class UserConfigurationsService {
  private readonly logger = new Logger(UserConfigurationsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Get user configuration, creating default if none exists.
   * Reads via SELECT first; only INSERTs when no row exists (avoids write on every read).
   */
  async getUserConfiguration(userId: string) {
    const [existing] = await this.db
      .select()
      .from(userConfigurations)
      .where(eq(userConfigurations.userId, userId))
      .limit(1);

    if (existing) return existing;

    try {
      const [inserted] = await this.db
        .insert(userConfigurations)
        .values({ userId })
        .returning();
      return inserted!;
    } catch (err) {
      const [raceExisting] = await this.db
        .select()
        .from(userConfigurations)
        .where(eq(userConfigurations.userId, userId))
        .limit(1);
      if (raceExisting) return raceExisting;
      throw err;
    }
  }

  /**
   * Create a default configuration record for a new user.
   * This handles the requirement: "create one function that create a record for new user as default values"
   */
  async createDefaultUserConfiguration(userId: string) {
    try {
      const [config] = await this.db
        .insert(userConfigurations)
        .values({
          userId,
        })
        .returning();
      return config;
    } catch (error) {
      this.logger.error(
        `Failed to create default user configuration for user ${userId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Update the configuration record for a particular user.
   * Handles logic: "if there is no entry for that user first create entry and then update that and if there is record then update it"
   *
   * Workspace fields must satisfy DB check:
   * preferred = 'both' OR primary = preferred.
   * Partial patches are reconciled against the existing row so header focus
   * switches (primary only) do not violate the constraint.
   */
  async updateUserConfiguration(
    userId: string,
    data: Partial<typeof userConfigurations.$inferInsert>
  ) {
    const updateData: Partial<typeof userConfigurations.$inferInsert> = {};
    for (const key in data) {
      if (data[key as keyof typeof data] !== undefined) {
        updateData[key] = data[key];
      }
    }

    if (
      updateData.preferredWorkspace !== undefined ||
      updateData.primaryWorkspace !== undefined
    ) {
      Object.assign(
        updateData,
        await this.reconcileWorkspaceFields(userId, updateData)
      );
    }

    const [config] = await this.db
      .insert(userConfigurations)
      .values({
        userId,
        ...updateData,
      })
      .onConflictDoUpdate({
        target: userConfigurations.userId,
        set: {
          ...updateData,
          updatedAt: toUTC(),
        },
      })
      .returning();

    return config;
  }

  /**
   * Keep preferred/primary consistent with the DB check constraint.
   * - preferred-only change to recruiting|prospecting → mirror into primary
   * - primary-only change away from a single preferred → promote preferred to both
   */
  private async reconcileWorkspaceFields(
    userId: string,
    updateData: Partial<typeof userConfigurations.$inferInsert>
  ): Promise<
    Pick<
      typeof userConfigurations.$inferInsert,
      "preferredWorkspace" | "primaryWorkspace"
    >
  > {
    let preferred = updateData.preferredWorkspace;
    let primary = updateData.primaryWorkspace;

    if (preferred === undefined || primary === undefined) {
      const [existing] = await this.db
        .select({
          preferredWorkspace: userConfigurations.preferredWorkspace,
          primaryWorkspace: userConfigurations.primaryWorkspace,
        })
        .from(userConfigurations)
        .where(eq(userConfigurations.userId, userId))
        .limit(1);

      preferred = preferred ?? existing?.preferredWorkspace ?? "recruiting";
      primary = primary ?? existing?.primaryWorkspace ?? "recruiting";
    }

    if (preferred !== "both" && primary !== preferred) {
      if (
        updateData.preferredWorkspace !== undefined &&
        updateData.primaryWorkspace === undefined
      ) {
        primary = preferred;
      } else {
        // Primary switched (or inconsistent pair): allow free switching via both
        preferred = "both";
      }
    }

    return {
      preferredWorkspace: preferred,
      primaryWorkspace: primary,
    };
  }
}
