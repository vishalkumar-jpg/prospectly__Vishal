import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Logger,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import { Response } from "express";
import responseUtils from "utils/response.utils";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { DisputesService } from "./disputes.service";
import { CreateDisputeDto } from "./disputes.dto";
import { QueryDisputeDto, BulkDeleteDto } from "./disputes-query.dto";

@ApiTags(ApiTagsEnum.Disputes)
@Controller("disputes")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DisputesController {
  private readonly logger = new Logger(DisputesController.name);

  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser("userId") userId: string,
    @Body() createDto: CreateDisputeDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.disputesService.create(userId, createDto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTROLLER :: create :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      return responseUtils.error({ res, error });
    }
  }
  @Get("eligible-introductions")
  async getEligibleIntroductions(
    @CurrentUser("userId") userId: string,
    @Query() query: QueryDisputeDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.disputesService.getEligibleIntroductions(
        userId,
        query
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTROLLER :: getEligibleIntroductions :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get()
  async findAll(
    @CurrentUser("userId") userId: string,
    @Query() query: QueryDisputeDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.disputesService.findAll(userId, query);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTROLLER :: findAll :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get(":id")
  async findOne(
    @CurrentUser("userId") userId: string,
    @Param("id") id: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.disputesService.findOne(id, userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTROLLER :: findOne :: ERROR :: ${JSON.stringify(error)}`,
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
      const data = await this.disputesService.remove(userId, deleteDto);
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
