import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { ApiTagsEnum } from "constants/api-tags.constants";
import {
  ContactEnrichmentService,
  ContactEnrichmentDetailsService,
} from "./services";
import { EnrichContactDto } from "./contact-enrichment.dto";

@ApiTags(ApiTagsEnum.IntroductionRequests)
@Controller("introductions/contact-enrichment")
export class ContactEnrichmentController {
  private readonly logger = new Logger(ContactEnrichmentController.name);

  constructor(
    private readonly contactEnrichmentService: ContactEnrichmentService,
    private readonly detailsService: ContactEnrichmentDetailsService
  ) {}

  @Post("enrich")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async enrich(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() dto: EnrichContactDto
  ) {
    try {
      const result = await this.contactEnrichmentService.enrichContact(
        dto,
        userId
      );
      return responseUtils.success(res, { data: result });
    } catch (error) {
      this.logger.error(
        `CONTACT_ENRICHMENT_CONTROLLER :: ENRICH : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get(":contactId/details")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getDetails(
    @Res() res: Response,
    @Param("contactId") contactId: string
  ) {
    try {
      const result = await this.detailsService.getContactWithEnrichment(
        Number(contactId)
      );
      if (!result) {
        throw new NotFoundException("Contact not found");
      }
      return responseUtils.success(res, { data: result });
    } catch (error) {
      this.logger.error(
        `CONTACT_ENRICHMENT_CONTROLLER :: GET_DETAILS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
