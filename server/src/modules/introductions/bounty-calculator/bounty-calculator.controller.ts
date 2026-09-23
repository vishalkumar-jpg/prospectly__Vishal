import { Controller, Post, Body, Res, Logger } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { BountyCalculatorService } from "./bounty-calculator.service";
import { CalculateBountyDto } from "./bounty-calculator.dto";

@ApiTags(ApiTagsEnum.IntroductionRequests)
@Controller("introductions/bounty-calculator")
export class BountyCalculatorController {
  private readonly logger = new Logger(BountyCalculatorController.name);

  constructor(
    private readonly bountyCalculatorService: BountyCalculatorService
  ) {}

  @Post("calculate")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async calculate(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() dto: CalculateBountyDto
  ) {
    try {
      const result = await this.bountyCalculatorService.calculateBounty(
        dto,
        userId
      );
      return responseUtils.success(res, { data: result });
    } catch (error) {
      this.logger.error(
        `BOUNTY_CALCULATOR_CONTROLLER :: CALCULATE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
