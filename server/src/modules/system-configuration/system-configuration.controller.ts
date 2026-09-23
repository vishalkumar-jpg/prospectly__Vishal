import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "decorators/public.decorator";
import { SystemConfigurationService } from "./system-configuration.service";
import { NameSlug } from "./system-configuration.constants";

@ApiTags("system-configuration")
@Controller("system-configuration")
export class SystemConfigurationController {
  constructor(
    private readonly systemConfigurationService: SystemConfigurationService
  ) {}

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Get system configuration by slug" })
  async getConfiguration(@Param("slug") slug: NameSlug) {
    const config =
      await this.systemConfigurationService.getConfigurationBySlug(slug);
    if (!config) {
      throw new NotFoundException(`Configuration with slug ${slug} not found`);
    }
    return config;
  }

  @Public()
  @Get()
  @ApiOperation({ summary: "Get all system configurations" })
  async getAllConfigurations() {
    return await this.systemConfigurationService.getAllConfigurations();
  }
}
