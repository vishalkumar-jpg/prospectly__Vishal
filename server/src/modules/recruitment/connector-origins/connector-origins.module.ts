import { Module } from "@nestjs/common";
import { ConnectorOriginsService } from "./connector-origins.service";
import { ConnectorOriginsController } from "./connector-origins.controller";

// Exposes ConnectorOriginsService to auth/signup + payout split, and a single
// read controller (`GET /recruitment/connector-origins/me`) for the post-
// welcome popup on the dashboard.
@Module({
  controllers: [ConnectorOriginsController],
  providers: [ConnectorOriginsService],
  exports: [ConnectorOriginsService],
})
export class ConnectorOriginsModule {}
