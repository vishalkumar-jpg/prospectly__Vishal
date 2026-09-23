import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sanitizeUser } from "utils/user.utils";
import { PROFILES_MESSAGES } from "./profiles.constants";

@Injectable()
export class ProfilesValidationService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async validateProfileById(userId: string) {
    const profile = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      with: {
        userConfiguration: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(PROFILES_MESSAGES.ERROR.PROFILE_NOT_FOUND);
    }

    // Remove password field before returning to ensure it's never exposed in API responses
    return sanitizeUser(profile) as typeof profile;
  }
}
