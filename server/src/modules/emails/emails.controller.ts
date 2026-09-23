import {
  Controller,
  Get,
  Param,
  UseGuards,
  Inject,
  Res,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { EmailsService } from "./emails.service";
import {
  EMAIL_TEMPLATE_COMMON_VARIABLES,
  EMAIL_TEMPLATE_VARIABLES,
} from "./emails.constants";

@ApiTags(ApiTagsEnum.Emails)
@Controller("email-templates")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailsController {
  private readonly logger = new Logger(EmailsController.name);

  constructor(
    @Inject(EmailsService)
    private readonly emailsService: EmailsService
  ) {}

  @Get(":slug")
  @ApiOperation({ summary: "Get email template by slug" })
  async getTemplate(@Res() res: Response, @Param("slug") slug: string) {
    try {
      const template = await this.emailsService.findTemplateBySlug(slug);
      const slugVariables = EMAIL_TEMPLATE_VARIABLES[slug] || [];
      const variables = [
        ...new Set([...EMAIL_TEMPLATE_COMMON_VARIABLES, ...slugVariables]),
      ];

      return responseUtils.success(res, {
        data: {
          slug: template.slug,
          subject: template.subject,
          htmlContent: template.htmlContent,
          variables,
        },
      });
    } catch (error) {
      this.logger.error(`EMAILS_CONTROLLER :: GET_TEMPLATE : ERROR : ${error}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      return responseUtils.error({ res, error });
    }
  }
}
