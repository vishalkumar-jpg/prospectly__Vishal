import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { systemConfigurationSchema } from "database/schema/system-configuration.schema";
import { NameSlug } from "./system-configuration.constants";

@Injectable()
export class SystemConfigurationService {
  private readonly logger = new Logger(SystemConfigurationService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getConfigurationBySlug(slug: NameSlug) {
    try {
      const [config] = await this.db
        .select()
        .from(systemConfigurationSchema)
        .where(
          and(
            eq(systemConfigurationSchema.name, slug),
            isNull(systemConfigurationSchema.deletedAt)
          )
        )
        .orderBy(desc(systemConfigurationSchema.updatedAt))
        .limit(1);

      if (!config) {
        this.logger.warn(`System configuration with slug ${slug} not found`);
        return null;
      }

      return config;
    } catch (error) {
      this.logger.error(
        `Failed to fetch system configuration for slug ${slug}`,
        error
      );
      throw error;
    }
  }

  async getAllConfigurations() {
    return await this.db
      .select()
      .from(systemConfigurationSchema)
      .where(isNull(systemConfigurationSchema.deletedAt));
  }
}
