import { Controller, Get, Logger, Res, Query } from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { Response } from "express";
import responseUtils from "utils/response.utils";
import { MasterDataService } from "./master-data.service";

@RequireModule("recruiting")
@Controller("recruitment/master-data")
export class MasterDataController {
  private readonly logger = new Logger(MasterDataController.name);

  constructor(private readonly masterDataService: MasterDataService) {}

  @Get("industries")
  async getIndustries(@Res() res: Response, @Query("search") search?: string) {
    try {
      const data = await this.masterDataService.getActiveIndustries(search);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MASTER_DATA_CONTROLLER :: GET_INDUSTRIES : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get("departments")
  async getDepartments(@Res() res: Response, @Query("search") search?: string) {
    try {
      const data = await this.masterDataService.getActiveDepartments(search);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MASTER_DATA_CONTROLLER :: GET_DEPARTMENTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get("recruitment-stages")
  async getRecruitmentStages(@Res() res: Response) {
    try {
      const data = await this.masterDataService.getActiveRecruitmentStages();
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MASTER_DATA_CONTROLLER :: GET_RECRUITMENT_STAGES : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
