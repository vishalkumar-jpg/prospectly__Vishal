import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { toUTC } from "utils/dayjs";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "./decorators/public.decorator";

@ApiTags("health")
@Controller("health")
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Health check endpoint" })
  getHealth() {
    return {
      status: "ok",
      timestamp: toUTC().toISOString(),
      environment: this.configService.get<string>("NODE_ENV") || "development",
    };
  }
}
