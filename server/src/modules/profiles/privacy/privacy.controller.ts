import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import { Response } from "express";
import responseUtils from "utils/response.utils";
import { Logger } from "@nestjs/common";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { PrivacyService } from "./privacy.service";
import { CreateDto, UpdateDto, QueryDto, BulkDeleteDto } from "./privacy.dto";
import { PrivacyListResponse } from "./privacy.response";

@ApiTags(ApiTagsEnum.Privacy)
@Controller("privacy")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PrivacyController {
  private readonly logger = new Logger(PrivacyController.name);

  constructor(private readonly privacyService: PrivacyService) {}

  @Post()
  async create(
    @CurrentUser("userId") userId: string,
    @Body() createDto: CreateDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.privacyService.create(userId, createDto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTROLLER :: create :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get()
  async findAll(
    @CurrentUser("userId") userId: string,
    @Query() query: QueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.privacyService.findAll(userId, query);
      return responseUtils.success(res, {
        data,
        dto: PrivacyListResponse,
      });
    } catch (error) {
      this.logger.error(
        `CONTROLLER :: findAll :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      return responseUtils.error({ res, error });
    }
  }

  @Put(":id")
  async update(
    @CurrentUser("userId") userId: string,
    @Param("id") id: string,
    @Body() updateDto: UpdateDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.privacyService.update(id, userId, updateDto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTROLLER :: update :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      return responseUtils.error({ res, error });
    }
  }

  @Delete()
  async remove(
    @CurrentUser("userId") userId: string,
    @Body() deleteDto: BulkDeleteDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.privacyService.remove(userId, deleteDto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTROLLER :: remove :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      return responseUtils.error({ res, error });
    }
  }
}
