import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Logger,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import { PublicIgnoreJwt } from "decorators/public-ignore-jwt.decorator";
import { SkipCSRF } from "decorators/skip-csrf.decorator";
import { XApiKeyGuard } from "guards/x-api-key.guard";
import responseUtils from "utils/response.utils";
import { parseClampPagination } from "utils/pagination.utils";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { TypesenseSearchService } from "./services";
import { SearchTypesenseContactsQueryDto } from "./typesense-search.dto";
import { TypesenseBackfillService } from "../core/typesense-backfill.service";
import {
  SearchResultDocument,
  TypesenseContactDocument,
  ApolloCacheDocument,
} from "../core/typesense.types";

function isContactDocument(
  doc: SearchResultDocument
): doc is TypesenseContactDocument {
  return "linkedin" in doc;
}

@ApiTags(ApiTagsEnum.Contacts)
@Controller("typesense")
export class TypesenseController {
  private readonly logger = new Logger(TypesenseController.name);

  constructor(
    private readonly typesenseSearchService: TypesenseSearchService,
    private readonly typesenseBackfillService: TypesenseBackfillService
  ) {}

  @Get("search/contacts")
  async searchContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: SearchTypesenseContactsQueryDto
  ) {
    try {
      const { newLimit: limitNum } = parseClampPagination(query.limit);
      const pageNum = Math.max(1, parseInt(query.page ?? "1", 10) || 1);

      const data = await this.typesenseSearchService.searchContacts({
        q: query.q,
        linkedinUrl: query.linkedinUrl,
        name: query.name,
        title: query.title,
        company: query.company,
        website: query.website,
        location: query.location,
        limit: limitNum,
        page: pageNum,
      });

      // Map response to camelCase for frontend compatibility
      const contacts = data.contacts.map((doc: SearchResultDocument) => {
        if (isContactDocument(doc)) {
          return this.mapContactDocument(doc);
        }
        return this.mapApolloCacheDocument(doc);
      });

      return responseUtils.success(res, {
        data: {
          contacts,
          count: data.count,
          query: data.query,
          hasNextPage: data.hasNextPage,
        },
      });
    } catch (error) {
      this.logger.error(
        `TYPESENSE_CONTROLLER :: SEARCH_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @PublicIgnoreJwt()
  @SkipCSRF()
  @UseGuards(XApiKeyGuard)
  @Post("backfill/contacts")
  async backfillContacts(@Res() res: Response, @Query("force") force?: string) {
    try {
      const forceFlag = force === "true";

      responseUtils.success(res, {
        data: {
          message: forceFlag
            ? "Backfill started (force mode: syncing ALL contacts). Check server logs for progress."
            : "Backfill started (syncing unsynced contacts only). Check server logs for progress.",
        },
      });

      setImmediate(async () => {
        try {
          const result =
            await this.typesenseBackfillService.backfillAllContacts(forceFlag);
          this.logger.log(
            `TYPESENSE_CONTROLLER :: BACKFILL_CONTACTS : Finished: ${JSON.stringify(result)}`
          );
        } catch (error) {
          this.logger.error(
            `TYPESENSE_CONTROLLER :: BACKFILL_CONTACTS : ERROR : ${error}`
          );
        }
      });
    } catch (error) {
      this.logger.error(
        `TYPESENSE_CONTROLLER :: BACKFILL_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  private mapContactDocument(doc: TypesenseContactDocument) {
    return {
      id: doc.id,
      source: "contacts" as const,
      firstName: doc.first_name,
      lastName: doc.last_name,
      title: doc.title,
      company: doc.company,
      linkedin: doc.linkedin,
      website: doc.website,
      city: doc.city,
      state: doc.state,
      country: doc.country,
      industry: doc.industry,
      location: doc.location,
      companyDescription: doc.company_description,
      companyType: doc.company_type,
      companyIndustry: doc.company_industry,
      companyDomain: doc.company_domain,
      companyLinkedinUrl: doc.company_linkedin_url,
      linkedinConnections: doc.linkedin_connections,
      employees: doc.employees,
      bountyAmount: doc.bounty_amount,
      profilePhotoUrl: doc.profile_photo_url,
      hasEmail: doc.has_email,
      enrichmentStatus: doc.enrichment_status,
      potentialConnectorCount: 0,
      // Apollo-specific fields null for contact docs
      hasDirectPhone: null,
      hasIndustry: null,
      hasRevenue: null,
      hasEmployeeCount: null,
    };
  }

  private mapApolloCacheDocument(doc: ApolloCacheDocument) {
    return {
      id: doc.id,
      source: "apollo" as const,
      firstName: doc.first_name,
      lastName: doc.last_name,
      title: doc.title,
      company: doc.company,
      hasEmail: doc.has_email,
      hasDirectPhone: doc.has_direct_phone,
      hasIndustry: doc.has_industry,
      hasRevenue: doc.has_revenue,
      hasEmployeeCount: doc.has_employee_count,
      // Contact-specific fields null for apollo docs
      linkedin: null,
      website: null,
      city: null,
      state: null,
      country: null,
      industry: null,
      location: null,
      companyDescription: null,
      companyType: null,
      companyIndustry: null,
      companyDomain: null,
      companyLinkedinUrl: null,
      linkedinConnections: null,
      employees: null,
      bountyAmount: doc.bounty_amount ?? null,
      profilePhotoUrl: null,
      enrichmentStatus: null,
      potentialConnectorCount: 0,
    };
  }
}
