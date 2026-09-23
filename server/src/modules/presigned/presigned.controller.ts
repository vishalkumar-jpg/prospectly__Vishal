import { Controller, Res, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiSwaggerResponse } from "modules/swagger/swagger.decorator";
import responseUtils from "utils/response.utils";
import { getQueryObject } from "utils/helper.utils";
import type { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { PresignedService } from "./presigned.service";
import { PresignDto } from "./presigned.dto";
import {
  PresignedPostResponseDto,
  PresignedResponseDto,
} from "./presigned.response";
import { GetPresignUrlQuery } from "./presigned.types";

@ApiTags(ApiTagsEnum.Presigned)
@Controller("presigned")
export class PresignedController {
  constructor(private readonly presignedService: PresignedService) {}

  @ApiSwaggerResponse(PresignedResponseDto)
  @Get()
  async generatePresignedUrl(
    @Query() payload: PresignDto,
    @Res() res: Response
  ) {
    try {
      const result = await this.presignedService.generatePresignedUrl(payload);
      return responseUtils.success(res, {
        data: result,
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @ApiSwaggerResponse(PresignedPostResponseDto)
  @Get("post")
  async postPresignedUrl(
    @Query() query: GetPresignUrlQuery,
    @Res() res: Response
  ) {
    try {
      const { metadata: stringMetadata } = query;
      const metadata = getQueryObject("metadata", stringMetadata);

      const result = await this.presignedService.generatePresignedPost({
        ...query,
        metadata,
      });

      return responseUtils.success(res, {
        data: result,
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }
}
