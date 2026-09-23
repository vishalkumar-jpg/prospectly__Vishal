import { Injectable, NotFoundException, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq, sql, inArray, and, isNull } from "drizzle-orm";
import { S3Service } from "shared/s3.service";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { IntroductionStatus } from "modules/introductions/introductions.constants";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TrustScoreQueueService } from "modules/trust-score-queue/trust-score-queue.service";
import { UserConfigurationsService } from "modules/user-configurations/user-configurations.service";
import { NotificationSendGateService } from "modules/notification-preferences/notification-send-gate.service";
import { appConfig } from "config/app.config";
import { getPayoutCurrencyForCountry } from "config/payment.config";
import { toUTC } from "utils/dayjs";
import { sanitizeUser } from "utils/user.utils";
import { PROFILES_MESSAGES } from "./profiles.constants";
import {
  GenerateProfilePhotoUploadUrlDto,
  UpdateUserConfigurationDto,
} from "./profiles.dto";
import { ProfilesValidationService } from "./profiles-validation.service";
import { mergeUserFilter, normalizeUserFilter } from "./user-filter.constants";

@Injectable()
export class ProfilesService {
  private readonly cloudFrontUrl: string | undefined;
  private readonly mediaProspectlyUrl: string | undefined;
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly profilesValidationService: ProfilesValidationService,
    @Inject(TrustScoreQueueService)
    private readonly trustScoreQueueService: TrustScoreQueueService,
    private readonly userConfigurationsService: UserConfigurationsService,
    private readonly sendGate: NotificationSendGateService
  ) {
    this.cloudFrontUrl = this.configService.get<string>("AWS_CLOUDFRONT_URL");
    this.mediaProspectlyUrl = this.configService.get<string>("AWS_MEDIA_URL");
  }

  /**
   * Convert S3 key to full URL for reading profile photos.
   * In production uses custom media domain (AWS_MEDIA_URL) when set; otherwise CloudFront.
   * Falls back to S3 presigned URL if no CDN URL is configured.
   * @param profile - Profile object with potential profilePhotoUrl
   * @returns Profile with profilePhotoUrl converted to full URL
   */
  async convertProfilePhotoUrlToFullUrl(profile: AnyType) {
    if (
      profile.profilePhotoUrl &&
      typeof profile.profilePhotoUrl === "string"
    ) {
      const photoUrl = profile.profilePhotoUrl;
      // Check if it's an S3 key (starts with 'profiles/' or 'contacts/') and not already a full URL
      if (
        (photoUrl.startsWith("profiles/") ||
          photoUrl.startsWith("contacts/")) &&
        !photoUrl.startsWith("http")
      ) {
        const baseUrlRaw =
          appConfig.isProduction && this.mediaProspectlyUrl
            ? this.mediaProspectlyUrl
            : this.cloudFrontUrl;
        if (baseUrlRaw) {
          const baseUrl = baseUrlRaw.endsWith("/")
            ? baseUrlRaw.slice(0, -1)
            : baseUrlRaw;
          profile.profilePhotoUrl = `${baseUrl}/${photoUrl}`;
        } else {
          profile.profilePhotoUrl =
            await this.s3Service.generatePresignedGetUrl(photoUrl);
        }
      }
    }
    return profile;
  }

  async getProfile(userId: string) {
    const profile =
      await this.profilesValidationService.validateProfileById(userId);

    // Convert S3 key to CloudFront URL (or fallback to presigned URL)
    await this.convertProfilePhotoUrlToFullUrl(profile);

    return profile;
  }

  async updateProfile(userId: string, updateData: AnyType) {
    // If firstName or lastName are being updated, compute fullName
    if (
      updateData.firstName !== undefined ||
      updateData.lastName !== undefined
    ) {
      // Get current profile to merge with update data for fullName computation
      const currentProfile = await this.getProfileById(userId);

      if (currentProfile) {
        // Use updated values if provided, otherwise use existing values
        const firstName =
          updateData.firstName ?? currentProfile.firstName ?? "";
        const lastName = updateData.lastName ?? currentProfile.lastName ?? "";

        // Compute fullName from firstName and lastName
        const fullName = `${firstName} ${lastName}`.trim();
        updateData.fullName = fullName || undefined;
      }
    }

    // Handle user configuration updates
    if (updateData.isUserUnsubscribe !== undefined) {
      await this.userConfigurationsService.updateUserConfiguration(userId, {
        isUserUnsubscribe: updateData.isUserUnsubscribe,
      });
      // Remove isUserUnsubscribe from updateData as it's not part of the users table
      delete updateData.isUserUnsubscribe;
    }

    // Keep the recipient's payout currency in sync with their selected country.
    // Changing the country before payout onboarding is fine; the recipient
    // account is created lazily from this country at onboarding time.
    if (updateData.country !== undefined) {
      const normalizedCountry = updateData.country
        ? String(updateData.country).toUpperCase()
        : null;
      updateData.country = normalizedCountry;
      updateData.payoutCurrency = normalizedCountry
        ? getPayoutCurrencyForCountry(normalizedCountry)
        : null;
    }

    // Convert undefined optional fields to null so they actually clear in the database
    // These are fields that can be intentionally cleared by the user
    const nullableFields = [
      "phone",
      "linkedinUrl",
      "websiteUrl",
      "jobTitle",
      "company",
      "industry",
      "location",
      "bio",
      "products",
      "uniqueSellingProposition",
      "targetMarket",
      "companySize",
      "revenueRange",
      "keyCredentials",
      "country",
    ];

    for (const field of nullableFields) {
      // If the field key exists in updateData but value is undefined, set to null
      if (field in updateData && updateData[field] === undefined) {
        updateData[field] = null;
      }
    }

    const profile = await this.updateProfileInDb(userId, updateData);

    if (!profile) {
      throw new NotFoundException(PROFILES_MESSAGES.ERROR.PROFILE_NOT_FOUND);
    }

    // Convert S3 key to CloudFront URL (or fallback to presigned URL)
    await this.convertProfilePhotoUrlToFullUrl(profile);

    return profile;
  }

  async updateStripeInfo(userId: string, stripeData: AnyType) {
    const profile = await this.updateProfileInDb(userId, stripeData);

    if (!profile) {
      throw new NotFoundException(PROFILES_MESSAGES.ERROR.PROFILE_NOT_FOUND);
    }

    return profile;
  }

  async generateProfilePhotoUploadUrl(
    userId: string,
    fileMeta: GenerateProfilePhotoUploadUrlDto
  ) {
    const { fileName, fileSize, mimeType } = fileMeta;

    // Generate presigned PUT URL and S3 key for the client to upload directly
    const { uploadUrl, key, expiresIn } =
      await this.s3Service.generatePresignedPutUrlForProfilePhoto(
        userId,
        fileName,
        fileSize,
        mimeType
      );

    return {
      uploadUrl,
      key,
      expiresIn,
    };
  }

  /**
   * Get all user stats aggregated in a single call
   */
  async getUserStats(userId: string): Promise<{
    trustPoints: number;
    connections: number;
    introductions: number;
    activeBounties: number;
  }> {
    const result = await this.db.execute(
      sql<{
        trust_points: number;
        connections: number;
        introductions: number;
        active_bounties: number;
      }>`
      SELECT
        COALESCE((SELECT trust_score FROM users WHERE id = ${userId}), 0) as trust_points,
        (SELECT count(distinct contact_id) FROM contact_relationships WHERE user_id = ${userId}) as connections,
        (SELECT count(*) FROM introduction_requests WHERE requester_id = ${userId}) as introductions,
        (SELECT count(*) FROM introduction_requests 
         WHERE requester_id = ${userId} 
         AND (status = ${IntroductionStatus.PENDING} 
         OR status = ${IntroductionStatus.ACCEPTED} 
         OR status = ${IntroductionStatus.INTRO_SENT} 
         OR status = ${IntroductionStatus.MEETING_BOOKED}
         OR status = ${IntroductionStatus.MEETING_COMPLETED})
         AND meeting_completed_by_requester = false) as active_bounties
      `
    );

    const stats = Array.isArray(result)
      ? result[0]
      : (result as AnyType).rows[0];

    return {
      trustPoints: Number(stats?.trust_points ?? 0),
      connections: Number(stats?.connections ?? 0),
      introductions: Number(stats?.introductions ?? 0),
      activeBounties: Number(stats?.active_bounties ?? 0),
    };
  }

  async getProfileById(id: string): Promise<schema.User | undefined> {
    const profile = await this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });

    // Remove password field before returning to ensure it's never exposed
    return profile ? (sanitizeUser(profile) as schema.User) : undefined;
  }

  async getProfileByEmail(email: string): Promise<schema.User | undefined> {
    const profile = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    // Remove password field before returning to ensure it's never exposed
    return profile ? (sanitizeUser(profile) as schema.User) : undefined;
  }

  async createProfile(
    data: typeof schema.users.$inferInsert
  ): Promise<schema.User> {
    const [profile] = await this.db
      .insert(schema.users)
      .values(data)
      .returning();

    if (profile) {
      await this.userConfigurationsService.createDefaultUserConfiguration(
        profile.id
      );
      if (profile.email) {
        await this.sendGate.clearUnsubscribedSuppression(profile.email);
      }
    }

    // Remove password field before returning to ensure it's never exposed
    return sanitizeUser(profile) as schema.User;
  }

  async getProfileByStripeRecipientAccountId(accountId: string) {
    const profile = await this.db.query.users.findFirst({
      where: eq(schema.users.stripeRecipientAccountId, accountId),
    });

    // Remove password field before returning to ensure it's never exposed
    return profile ? (sanitizeUser(profile) as schema.User) : undefined;
  }

  async getBasicProfilesByIds(ids: string[]): Promise<
    {
      id: string;
      fullName: string | null;
      email: string | null;
    }[]
  > {
    if (!ids.length) return [];

    return await this.db
      .select({
        id: schema.users.id,
        fullName: schema.users.fullName,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(inArray(schema.users.id, ids));
  }

  private async updateProfileInDb(
    id: string,
    data: Partial<typeof schema.users.$inferInsert>
  ): Promise<schema.User | undefined> {
    const [profile] = await this.db
      .update(schema.users)
      .set({ ...data, updatedAt: toUTC() })
      .where(eq(schema.users.id, id))
      .returning();

    // Remove password field before returning to ensure it's never exposed
    return profile ? (sanitizeUser(profile) as schema.User) : undefined;
  }

  async recordLastLoginAt(userId: string): Promise<void> {
    await this.updateProfileInDb(userId, { lastLoginAt: toUTC() });
  }

  /**
   * Update user's max_concurrent_requests based on their subscription plan
   * @param userId - User ID
   * @param planId - Subscription plan ID
   */
  async updateMaxConcurrentRequests(
    userId: string,
    planId: string
  ): Promise<void> {
    try {
      // Fetch the subscription plan
      const plan = await this.db.query.subscriptionPlan.findFirst({
        where: eq(schema.subscriptionPlan.id, planId),
      });

      if (!plan) {
        this.logger.warn(
          `Subscription plan ${planId} not found, skipping max_concurrent_requests update for user ${userId}`
        );
        return;
      }

      // Get max_concurrent_requests from the plan (default to 1 if not set)
      const maxConcurrentRequests = plan.maxConcurrentRequests ?? 1;

      // Update the user's profile
      await this.updateProfileInDb(userId, {
        maxConcurrentRequests,
      });

      this.logger.log(
        `Updated max_concurrent_requests to ${maxConcurrentRequests} for user ${userId} based on plan ${planId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update max_concurrent_requests for user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
      // Don't throw - allow the subscription flow to continue even if this fails
    }
  }

  /**
   * Mark the welcome popup as seen for a user
   * @param userId - User ID
   * @returns Updated configuration
   */
  async markWelcomePopupSeen(userId: string) {
    return this.userConfigurationsService.updateUserConfiguration(userId, {
      hasSeenWelcomePopup: true,
    });
  }

  async markSkipBankAccount(userId: string) {
    return this.userConfigurationsService.updateUserConfiguration(userId, {
      hasSkipBankAccount: true,
    });
  }

  /**
   * Update user's configuration
   * @param userId - User ID
   * @param data - Configuration data to update
   * @returns Updated configuration
   */
  async updateConfiguration(userId: string, data: UpdateUserConfigurationDto) {
    const { userFilter, ...rest } = data;
    if (!userFilter) {
      return this.userConfigurationsService.updateUserConfiguration(
        userId,
        rest
      );
    }

    // Merge partial key patches so saving one pipeline does not wipe the others.
    const existing =
      await this.userConfigurationsService.getUserConfiguration(userId);
    const merged = mergeUserFilter(
      normalizeUserFilter(existing.userFilter),
      userFilter
    );

    return this.userConfigurationsService.updateUserConfiguration(userId, {
      ...rest,
      userFilter: merged,
    });
  }

  /**
   * Map normalized (lowercase trimmed) emails to registered user IDs for batch lookups.
   */
  async getUserIdsByNormalizedEmails(
    emails: string[]
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const normalized = [
      ...new Set(
        emails
          .map((e) => (e || "").trim().toLowerCase())
          .filter((e) => e.includes("@"))
      ),
    ];
    if (normalized.length === 0) {
      return map;
    }

    const rows = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(
        and(
          inArray(sql`lower(trim(${schema.users.email}))`, normalized),
          isNull(schema.users.deletedAt)
        )
      );

    for (const row of rows) {
      map.set(row.email.trim().toLowerCase(), row.id);
    }
    return map;
  }

  /**
   * Get all organizations a user belongs to
   * @param userId - User ID
   */
  async getUserOrganizations(userId: string) {
    const results = await this.db
      .select({
        id: schema.organisation.id,
        name: schema.organisation.name,
        description: schema.organisation.description,
        website: schema.organisation.website,
        logoUrl: schema.organisation.logoUrl,
        isVerified: schema.organisationMemberSchema.isVerified,
        verifiedAt: schema.organisationMemberSchema.verifiedAt,
        inviteCode: schema.organisationMemberSchema.inviteCode,
        joinedAt: schema.organisationMemberSchema.createdAt,
      })
      .from(schema.organisationMemberSchema)
      .innerJoin(
        schema.organisation,
        eq(
          schema.organisationMemberSchema.organisationId,
          schema.organisation.id
        )
      )
      .where(
        and(
          eq(schema.organisationMemberSchema.userId, userId),
          isNull(schema.organisationMemberSchema.deletedAt),
          isNull(schema.organisation.deletedAt),
          eq(schema.organisation.isActive, true)
        )
      );

    return results;
  }

  /**
   * Batch-load organizations for many users (one query). Returns a map of userId → simplified org rows.
   */
  async getOrganizationsForUserIds(
    userIds: string[]
  ): Promise<
    Map<string, Array<{ id: string; name: string; isVerified: boolean }>>
  > {
    const map = new Map<
      string,
      Array<{ id: string; name: string; isVerified: boolean }>
    >();
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) {
      return map;
    }

    const rows = await this.db
      .select({
        userId: schema.organisationMemberSchema.userId,
        id: schema.organisation.id,
        name: schema.organisation.name,
        isVerified: schema.organisationMemberSchema.isVerified,
      })
      .from(schema.organisationMemberSchema)
      .innerJoin(
        schema.organisation,
        eq(
          schema.organisationMemberSchema.organisationId,
          schema.organisation.id
        )
      )
      .where(
        and(
          inArray(schema.organisationMemberSchema.userId, unique),
          isNull(schema.organisationMemberSchema.deletedAt),
          isNull(schema.organisation.deletedAt),
          eq(schema.organisation.isActive, true)
        )
      );

    for (const row of rows) {
      const uid = row.userId;
      if (!uid) continue;
      const list = map.get(uid) ?? [];
      list.push({
        id: row.id,
        name: row.name,
        isVerified: !!row.isVerified,
      });
      map.set(uid, list);
    }

    return map;
  }
}
