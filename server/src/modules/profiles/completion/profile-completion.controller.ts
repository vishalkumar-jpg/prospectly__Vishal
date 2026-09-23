import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { getClientIp } from "utils/ip-extraction.util";
import responseUtils from "utils/response.utils";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { OrganizationLookupService } from "./organization-lookup.service";
import { ProfileCompletionService } from "./profile-completion.service";
import {
  GetCompletionOrganizationsQueryDto,
  UpdateProfileCompletionDto,
} from "./profile-completion.dto";

/**
 * Required profile fields that gate access to the app.
 *
 * Deliberately generic rather than country-specific: phase 2 adds the
 * organization step to this same resource without a new route.
 */
@ApiTags(ApiTagsEnum.Profiles)
@Controller("profiles/me/completion")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileCompletionController {
  private readonly logger = new Logger(ProfileCompletionController.name);

  constructor(
    @Inject(ProfileCompletionService)
    private readonly profileCompletionService: ProfileCompletionService,
    @Inject(OrganizationLookupService)
    private readonly organizationLookupService: OrganizationLookupService
  ) {}

  /** Which steps are outstanding, plus any server-derived suggestions. */
  @Get()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getCompletionStatus(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.profileCompletionService.getStatus(
        userId,
        getClientIp(req)
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `PROFILE_COMPLETION_CONTROLLER :: GET_COMPLETION_STATUS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  /** Organisations selectable in the gate, including ones pending approval. */
  @Get("organizations")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getOrganizations(
    @Res() res: Response,
    @Query() query: GetCompletionOrganizationsQueryDto
  ) {
    try {
      const data = await this.organizationLookupService.search(query);

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `PROFILE_COMPLETION_CONTROLLER :: GET_ORGANIZATIONS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  /** Submits one or more completion steps. */
  @Put()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async updateCompletion(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() updateData: UpdateProfileCompletionDto
  ) {
    try {
      const data = await this.profileCompletionService.applyUpdates(
        userId,
        updateData
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `PROFILE_COMPLETION_CONTROLLER :: UPDATE_COMPLETION : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
