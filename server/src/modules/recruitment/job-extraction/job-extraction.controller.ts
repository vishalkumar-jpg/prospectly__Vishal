import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
} from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { JobExtractionService } from "./job-extraction.service";
import {
  MAX_FILE_SIZE,
  ExtractJobFromUrlDto,
  GenerateWithAiDto,
} from "./job-extraction.dto";
import { JobExtractionFileValidationPipe } from "./pipes/job-extraction-file-validation.pipe";

@ApiTags(ApiTagsEnum.Recruitment)
@RequireModule("recruiting")
@Controller("recruitment/job-extraction")
@ApiBearerAuth()
export class JobExtractionController {
  constructor(private readonly extractionService: JobExtractionService) {}

  @Post("extract")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_FILE_SIZE },
    })
  )
  async extractFromFile(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @UploadedFile(new JobExtractionFileValidationPipe())
    file: Express.Multer.File
  ) {
    try {
      const data = await this.extractionService.extractFromFile(
        file.buffer,
        file.mimetype,
        { userId, actionType: "job-upload" }
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Post("extract-url")
  async extractFromUrl(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: ExtractJobFromUrlDto
  ) {
    try {
      const data = await this.extractionService.extractFromUrl(body.url, {
        userId,
        actionType: "job-link",
      });
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Post("generate-with-ai")
  async generateWithAi(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: GenerateWithAiDto
  ) {
    try {
      const data = await this.extractionService.generateWithAi(body, {
        userId,
        actionType: "job-generate-ai",
      });
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
