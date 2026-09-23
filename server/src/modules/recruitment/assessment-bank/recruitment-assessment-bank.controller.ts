import { Controller, Get, Query, Logger, Res } from "@nestjs/common";
import { Response } from "express";
import { RequireModule } from "decorators/require-module.decorator";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { RecruitmentAssessmentBankService } from "./recruitment-assessment-bank.service";
import {
  BankQuestionExistsDto,
  ListBankQuestionsDto,
} from "./recruitment-assessment-bank.dto";

@RequireModule("recruiting")
@Controller("recruitment/assessment-bank")
export class RecruitmentAssessmentBankController {
  private readonly logger = new Logger(
    RecruitmentAssessmentBankController.name
  );

  constructor(private readonly bankService: RecruitmentAssessmentBankService) {}

  @Get("exists")
  async exists(
    @CurrentUser("userId") userId: string,
    @Query() query: BankQuestionExistsDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.bankService.exists(userId, query);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `ASSESSMENT_BANK_CONTROLLER :: EXISTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get()
  async list(
    @CurrentUser("userId") userId: string,
    @Query() query: ListBankQuestionsDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.bankService.list(userId, query);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `ASSESSMENT_BANK_CONTROLLER :: LIST : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
