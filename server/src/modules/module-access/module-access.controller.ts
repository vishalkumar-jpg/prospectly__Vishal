import { Controller, Get, Logger, Res } from "@nestjs/common";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { ModuleAccessService } from "./module-access.service";

@Controller("module-access")
export class ModuleAccessController {
  private readonly logger = new Logger(ModuleAccessController.name);

  constructor(private readonly moduleAccessService: ModuleAccessService) {}

  /**
   * Resolved recruiting-module config for the current user's organisation.
   * Generic on purpose — new org-level flags surface as additional keys here
   * rather than dedicated endpoints. Returns an empty object when the user has
   * no qualifying organisation grant.
   */
  @Get("config")
  async getConfig(@CurrentUser("userId") userId: string, @Res() res: Response) {
    try {
      const data =
        (await this.moduleAccessService.getRecruitingModuleConfig(userId)) ??
        {};
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MODULE_ACCESS_CONTROLLER :: GET_CONFIG : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
