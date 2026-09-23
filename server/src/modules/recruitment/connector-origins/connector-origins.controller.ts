import { Controller, Get, Inject, Logger, Res } from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { Response } from "express";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { ConnectorOriginsService } from "./connector-origins.service";

// Read endpoint that powers the post-welcome popup decision on the dashboard.
// JWT-protected via the global guard. Returns the user's origin job (if any)
// joined with the current job title and status.
@RequireModule("recruiting")
@Controller("recruitment/connector-origins")
export class ConnectorOriginsController {
  private readonly logger = new Logger(ConnectorOriginsController.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly originsService: ConnectorOriginsService
  ) {}

  @Get("me")
  async getMyOrigin(
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.originsService.getOriginForCurrentUser(
        this.db,
        userId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_ORIGINS_CONTROLLER :: GET_MY_ORIGIN : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
