import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Inject,
  Res,
  BadRequestException,
} from "@nestjs/common";

import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { UserConfigurationsService } from "modules/user-configurations/user-configurations.service";
import { AccountDeletionService } from "modules/account-deletion/account-deletion.service";
import { clearAuthCookies } from "utils/auth";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { ProfilesService } from "./profiles.service";
import {
  UpdateProfileInformationDto,
  GenerateProfilePhotoUploadUrlDto,
  UpdateUserConfigurationDto,
  DeleteAccountDto,
} from "./profiles.dto";

@ApiTags(ApiTagsEnum.Profiles)
@Controller("profiles")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfilesController {
  constructor(
    @Inject(ProfilesService) private readonly profilesService: ProfilesService,
    @Inject(UserConfigurationsService)
    private readonly userConfigurationsService: UserConfigurationsService,
    @Inject(AccountDeletionService)
    private readonly accountDeletionService: AccountDeletionService
  ) {}

  @Get("me")
  async getProfile(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.profilesService.getProfile(userId);

      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("me/stats")
  async getUserStats(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.profilesService.getUserStats(userId);

      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Put("me")
  async updateProfile(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() updateData: UpdateProfileInformationDto
  ) {
    try {
      const data = await this.profilesService.updateProfile(userId, updateData);

      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Post("me/generate-presigned-url")
  async generateProfilePhotoUploadUrl(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: GenerateProfilePhotoUploadUrlDto
  ) {
    try {
      const data = await this.profilesService.generateProfilePhotoUploadUrl(
        userId,
        body
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Put("me/welcome-popup-seen")
  async markWelcomePopupSeen(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.profilesService.markWelcomePopupSeen(userId);

      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Put("me/skip-bank-account")
  async markSkipBankAccount(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.profilesService.markSkipBankAccount(userId);

      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("me/configuration")
  async getConfiguration(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data =
        await this.userConfigurationsService.getUserConfiguration(userId);

      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Put("me/configuration")
  async updateConfiguration(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: UpdateUserConfigurationDto
  ) {
    try {
      const data = await this.profilesService.updateConfiguration(userId, body);

      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("me/organizations")
  async getOrganizations(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.profilesService.getUserOrganizations(userId);

      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Post("me/delete-account")
  async deleteAccount(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: DeleteAccountDto
  ) {
    try {
      if (!body.confirm) {
        throw new BadRequestException("Confirmation required");
      }
      const result = await this.accountDeletionService.requestDeletion(userId, {
        surveyData: body.surveyData,
      });
      if (result.immediate) {
        clearAuthCookies(res);
      }
      return responseUtils.success(res, {
        data: {
          scheduledAt: result.scheduledAt,
          immediate: result.immediate,
        },
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Post("me/cancel-delete-account")
  async cancelDeleteAccount(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      await this.accountDeletionService.cancelDeletionRequest(userId);
      return responseUtils.success(res, {
        data: { cancelled: true },
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }
}
