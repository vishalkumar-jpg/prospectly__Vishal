import {
  Controller,
  Post,
  Body,
  Res,
  Logger,
  Param,
  ParseUUIDPipe,
  Delete,
} from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { Response } from "express";
import responseUtils from "utils/response.utils";
import { CurrentUser } from "decorators/current-user.decorator";
import { ConnectorUploadDto } from "./connector-upload.dto";
import { ConnectorReplaceResumeDto } from "./connector-upload-replace.dto";
import { ConnectorUploadService } from "./services/connector-upload.service";
import { ConnectorUploadReplaceService } from "./services/connector-upload-replace.service";
import { CONNECTOR_UPLOAD_MESSAGES } from "./connector-upload.constants";

@RequireModule("recruiting")
@Controller("recruitment/connector-upload")
export class ConnectorUploadController {
  private readonly logger = new Logger(ConnectorUploadController.name);

  constructor(
    private readonly uploadService: ConnectorUploadService,
    private readonly replaceService: ConnectorUploadReplaceService
  ) {}

  @Post()
  async uploadResumes(
    @Body() dto: ConnectorUploadDto,
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.uploadService.processUpload(dto, userId);

      return responseUtils.success(res, {
        data: {
          message: CONNECTOR_UPLOAD_MESSAGES.SUCCESS.QUEUED,
          uploadCount: result.uploadCount,
          uploadJobIds: result.uploadJobIds,
          succeeded: result.succeeded,
          failed: result.failed,
        },
      });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_UPLOAD_CONTROLLER :: uploadResumes : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("replace-resume")
  async replaceResume(
    @Body() dto: ConnectorReplaceResumeDto,
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.replaceService.replaceResume(dto, userId);
      return responseUtils.success(res, {
        data: {
          message: CONNECTOR_UPLOAD_MESSAGES.SUCCESS.REPLACE_QUEUED,
          ...result,
        },
      });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_UPLOAD_CONTROLLER :: replaceResume : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":uploadJobId/retry")
  async retryUpload(
    @Param("uploadJobId", new ParseUUIDPipe()) uploadJobId: string,
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      await this.uploadService.retryUploadJob(uploadJobId, userId);
      return responseUtils.success(res, {
        data: { uploadJobId, message: "Retry queued" },
      });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_UPLOAD_CONTROLLER :: retryUpload : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Delete(":uploadJobId")
  async dismissUpload(
    @Param("uploadJobId", new ParseUUIDPipe()) uploadJobId: string,
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      await this.uploadService.dismissUploadJob(uploadJobId, userId);
      return responseUtils.success(res, {
        data: { uploadJobId, message: "Upload dismissed" },
      });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_UPLOAD_CONTROLLER :: dismissUpload : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
