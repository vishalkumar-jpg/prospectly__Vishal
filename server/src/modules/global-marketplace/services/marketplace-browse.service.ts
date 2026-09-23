import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { ProfilesService } from "modules/profiles/profiles.service";
import { ContactOrganizationEnricherService } from "modules/introductions/services/contact-organization-enricher.service";
import { MarketplaceMetricsService } from "./marketplace-metrics.service";
import { BrowseMarketplaceQueryDto } from "../dto/browse-marketplace.dto";
import { MARKETPLACE_MESSAGES } from "../global-marketplace.constants";
import {
  calculatePagination,
  getTotalCount,
} from "../utils/marketplace-pagination.utils";
import {
  buildFilterConditions,
  buildOrderBy,
  getFilterOptions,
} from "../utils/marketplace-filters";
import { executeBrowseQuery } from "../utils/marketplace-queries";
import {
  getPublicRequestDetailsQuery,
  checkRequestClaimed,
  transformPublicRequestDetails,
} from "../utils/marketplace-public-request";

@Injectable()
export class MarketplaceBrowseService {
  private readonly logger = new Logger(MarketplaceBrowseService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly metricsService: MarketplaceMetricsService,
    private readonly profilesService: ProfilesService,
    private readonly contactOrganizationEnricher: ContactOrganizationEnricherService
  ) {}

  async browseMarketplace(userId: string, query: BrowseMarketplaceQueryDto) {
    if (!userId || typeof userId !== "string") {
      throw new UnauthorizedException("User ID is required");
    }

    const { page, limit, offset } = calculatePagination(
      query.page,
      query.limit
    );

    const conditions = buildFilterConditions(userId, query);
    const orderBy = buildOrderBy(query.sortBy);
    const requests = await executeBrowseQuery(
      this.db,
      conditions,
      orderBy,
      limit,
      offset,
      userId
    );

    const total = await getTotalCount(this.db, conditions);

    // Get request IDs for metrics calculation
    const requestIds = requests.map((r) => r.id);

    const contactIds = [
      ...new Set(
        requests.map((r) => r.contactId).filter((id): id is number => !!id)
      ),
    ];

    let contactIdToRegisteredUserId: Map<number, string> = new Map();
    let orgsByUserId: Map<
      string,
      Array<{ id: string; name: string; isVerified: boolean }>
    > = new Map();

    try {
      const result =
        await this.contactOrganizationEnricher.getContactOrganizationsMap(
          contactIds
        );

      if (result.contactIdToDecryptedEmail.size < contactIds.length) {
        const failedCount =
          contactIds.length - result.contactIdToDecryptedEmail.size;
        this.logger.warn(
          `GLOBAL_MARKETPLACE_SERVICE :: browseMarketplace : WARNING : ` +
            `${failedCount} out of ${contactIds.length} contacts missing email hash in sensitive data. ` +
            `Contacts with hash row: ${result.contactIdToDecryptedEmail.size}`
        );
      }

      ({ contactIdToRegisteredUserId, orgsByUserId } = result);
    } catch (error) {
      this.logger.error(
        `GLOBAL_MARKETPLACE_SERVICE :: browseMarketplace : ERROR : ` +
          `Failed to get contact organizations: ${error.message}`,
        error.stack
      );
      throw error;
    }

    // Get metrics using metrics service
    const [viewsCounts, interestedCounts] = await Promise.all([
      this.metricsService.getViewsCounts(requestIds),
      this.metricsService.getInterestedCounts(requestIds),
    ]);

    // Create maps for quick lookup
    const { viewsMap, interestedMap } = this.metricsService.createMetricsMaps(
      viewsCounts,
      interestedCounts
    );

    // Convert contact photo URLs to CloudFront URLs
    const requestsWithConvertedPhotos = await Promise.all(
      requests.map(async (r) => {
        let contactProfilePhotoUrl = r.contactProfilePhotoUrl || null;
        if (contactProfilePhotoUrl) {
          const contactWithPhoto = {
            profilePhotoUrl: contactProfilePhotoUrl,
          };
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            contactWithPhoto
          );
          contactProfilePhotoUrl = contactWithPhoto.profilePhotoUrl;
        }

        const contactUserId = r.contactId
          ? contactIdToRegisteredUserId.get(r.contactId)
          : undefined;

        let contactOrganizations = [];
        if (contactUserId) {
          // Contact is a registered user, get their organizations
          contactOrganizations = orgsByUserId.get(contactUserId) ?? [];
        }

        // Build response object explicitly, excluding internal IDs (requesterId, contactId)
        return {
          id: r.id,
          contactName: r.contactName,
          meetingTitle: r.meetingTitle,
          meetingDescription: r.meetingDescription,
          bountyAmount: Number(r.bountyAmount),
          isUrgent: r.isUrgent,
          expiredAt: r.expiredAt,
          createdAt: r.createdAt,
          contactTitle: r.contactTitle,
          contactCompany: r.contactCompany,
          contactLinkedin: r.contactLinkedin,
          contactWebsite: r.contactWebsite,
          contactProfilePhotoUrl,
          viewsCount: viewsMap.get(r.id) || 0,
          interestedCount: interestedMap.get(r.id) || 0,
          contactOrganizations,
        };
      })
    );

    return {
      requests: requestsWithConvertedPhotos,
      total,
      page,
      limit,
    };
  }

  // Returns true iff the requestId resolves to a publicly visible
  // introduction request. Used by the auth flow to gate public-request-page
  // signup. Mirrors the visibility check in getPublicRequestDetailsQuery.
  async isValidPublicRequest(
    requestId: string,
    _sharerCode: string
  ): Promise<boolean> {
    const request = await getPublicRequestDetailsQuery(this.db, requestId);
    return !!request;
  }

  async getPublicRequestDetails(requestId: string, _sharerCode: string) {
    const request = await getPublicRequestDetailsQuery(this.db, requestId);

    if (!request) {
      throw new NotFoundException(MARKETPLACE_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }

    const [claim, interestedCount, viewCount] = await Promise.all([
      checkRequestClaimed(this.db, requestId),
      this.metricsService.getInterestedCountForRequest(requestId),
      this.metricsService.getViewCountForRequest(requestId),
    ]);

    return transformPublicRequestDetails(
      request,
      claim,
      interestedCount,
      viewCount
    );
  }

  getFilterOptions() {
    return getFilterOptions();
  }

  async removeRequestFromMarketplace(userId: string, requestId: string) {
    const [request] = await this.db
      .select()
      .from(schema.introductionRequests)
      .where(eq(schema.introductionRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new NotFoundException(MARKETPLACE_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }

    if (request.requesterId !== userId) {
      throw new ForbiddenException(
        "You can only remove your own introduction requests"
      );
    }

    await this.db
      .update(schema.introductionRequests)
      .set({
        isMarketplaceVisible: false,
        updatedAt: toUTC(),
      })
      .where(eq(schema.introductionRequests.id, requestId));

    return { success: true };
  }
}
