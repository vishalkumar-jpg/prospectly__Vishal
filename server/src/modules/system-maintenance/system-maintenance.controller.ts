import {
  Controller,
  // Delete,
  // Inject,
  // Res,
  // Logger,
  // UseGuards,
} from "@nestjs/common";
// import responseUtils from "utils/response.utils";
// import { Response } from "express";
// import { XApiKeyGuard } from "guards/x-api-key.guard";
// import { PublicIgnoreJwt } from "decorators/public-ignore-jwt.decorator";
// import { SkipCSRF } from "decorators/skip-csrf.decorator";
// import { SystemMaintenanceService } from "./system-maintenance.service";
// import { SYSTEM_MAINTENANCE_MESSAGES } from "./system-maintenance.constants";

@Controller("system-maintenance")
export class SystemMaintenanceController {
  // private readonly logger = new Logger(SystemMaintenanceController.name);
  // constructor(
  //   @Inject(SystemMaintenanceService)
  //   private readonly systemMaintenanceService: SystemMaintenanceService
  // ) {}
  // @PublicIgnoreJwt()
  // @SkipCSRF()
  // @UseGuards(XApiKeyGuard)
  // @Delete("clean-database")
  // async cleanDatabase(@Res() res: Response) {
  //   try {
  //     this.logger.warn(
  //       SYSTEM_MAINTENANCE_MESSAGES.CONTROLLER.INITIATING_CLEANUP
  //     );
  //     const data = await this.systemMaintenanceService.cleanDatabase();
  //     return responseUtils.success(res, { data });
  //   } catch (error) {
  //     this.logger.error(
  //       `${SYSTEM_MAINTENANCE_MESSAGES.CONTROLLER.ERROR} ${error}`
  //     );
  //     return responseUtils.error({ res, error });
  //   }
  // }
}
