import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Inject,
  BadRequestException,
  Res,
  Logger,
  Optional,
} from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { parseClampPagination } from "utils/pagination.utils";
import { JobPoolMatchQueueService } from "modules/recruitment/job-pool-matches/job-pool-match-queue.service";
import { ApiTagsEnum } from "constants/api-tags.constants";
import {
  CreateContactDto,
  ImportContactsDto,
  GetContactsQueryDto,
  SearchGlobalContactsQueryDto,
  SearchGlobalContactsBodyDto,
  ConnectAppleContactsDto,
  ImportAppleContactsDto,
  GoogleImportProcessCallbackDto,
  ImportMicrosoftContactsDto,
  UpdateBountyAmountDto,
  MicrosoftImportProcessCallbackDto,
  CheckEmailDto,
  GenerateLinkedInZipUploadUrlDto,
  CompleteLinkedInZipUploadDto,
} from "./contacts.dto";
import { ContactsService } from "./contacts.service";
import { ContactsSearchService } from "./contacts-search.service";
import { CONTACTS_MESSAGES } from "./contacts.constants";

@ApiTags(ApiTagsEnum.Contacts)
@Controller("contacts")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContactsController {
  private readonly logger = new Logger(ContactsController.name);

  constructor(
    @Inject(ContactsService) private readonly contactsService: ContactsService,
    @Inject(ContactsSearchService)
    private readonly contactsSearchService: ContactsSearchService,
    @Optional()
    @Inject(JobPoolMatchQueueService)
    private readonly jobPoolMatchQueueService: JobPoolMatchQueueService | null
  ) {}

  @Post()
  async createContact(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() createContactDto: CreateContactDto
  ) {
    try {
      const data = await this.contactsService.createContact(
        userId,
        createContactDto
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: CREATE_CONTACT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get()
  async getContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: GetContactsQueryDto
  ) {
    try {
      const { newLimit, newOffset } = parseClampPagination(
        query.limit,
        query.page
      );

      const data = await this.contactsService.getContactsByUser(
        userId,
        newOffset,
        newLimit,
        query.searchTerm,
        query.sortBy,
        query.sortDir
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: GET_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("search-global")
  async searchGlobalContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: SearchGlobalContactsQueryDto
  ) {
    try {
      const { newLimit: limitNum } = parseClampPagination(query.limit);
      const data = await this.contactsSearchService.searchGlobalContacts(
        userId,
        {
          q: query.q,
          linkedinUrl: query.linkedinUrl,
          name: query.name,
          email: query.email,
          company: query.company,
          website: query.website,
        },
        limitNum
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: SEARCH_GLOBAL_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("search-global")
  async searchGlobalContactsPost(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: SearchGlobalContactsBodyDto
  ) {
    try {
      const { newLimit: limitNum } = parseClampPagination(
        body.limit !== undefined ? String(body.limit) : undefined
      );
      const data = await this.contactsSearchService.searchGlobalContacts(
        userId,
        {
          q: body.q,
          linkedinUrl: body.linkedinUrl,
          name: body.name,
          email: body.email,
          company: body.company,
          website: body.website,
        },
        limitNum
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: SEARCH_GLOBAL_CONTACTS_POST : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("google-import/status")
  async getGoogleContactsImportStatus(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data =
        await this.contactsService.getGoogleContactsImportStatus(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: GET_GOOGLE_CONTACTS_IMPORT_STATUS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("google-import/resync")
  async resyncGoogleContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.contactsService.resyncGoogleContacts(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: RESYNC_GOOGLE_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("google-import/connect")
  async connectGoogleContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.contactsService.connectGoogleContacts(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: CONNECT_GOOGLE_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("google-import/process-callback")
  async processGoogleContactsCallback(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: GoogleImportProcessCallbackDto
  ) {
    try {
      if (!body.code) {
        throw new BadRequestException(
          CONTACTS_MESSAGES.ERROR.MISSING_AUTH_CODE
        );
      }
      const data = await this.contactsService.processGoogleContactsCallback(
        body.code,
        userId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: PROCESS_GOOGLE_CONTACTS_CALLBACK : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("import-apple")
  async importAppleContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: ImportAppleContactsDto
  ) {
    try {
      const data = await this.contactsService.importAppleContacts(
        userId,
        body.apple_id,
        body.app_password
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: IMPORT_APPLE_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("apple-import/status")
  async getAppleContactsImportStatus(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data =
        await this.contactsService.getAppleContactsImportStatus(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Post("apple-import/resync")
  async resyncAppleContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.contactsService.resyncAppleContacts(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: RESYNC_APPLE_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("apple-import/connect")
  async connectAppleContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: ConnectAppleContactsDto
  ) {
    try {
      if (!body.apple_id || !body.app_password) {
        throw new BadRequestException(
          CONTACTS_MESSAGES.ERROR.APPLE_ID_PASSWORD_REQUIRED
        );
      }
      const data = await this.contactsService.connectAppleContacts(
        userId,
        body.apple_id,
        body.app_password
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: CONNECT_APPLE_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("import-csv")
  async importCSVContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: ImportContactsDto
  ) {
    try {
      const data = await this.contactsService.importCSVContacts(
        userId,
        body.contacts,
        body.source
      );

      // Disabled: job matching on contact import to avoid unnecessary Gemini API calls
      // this.jobPoolMatchQueueService
      //   ?.queueContactMatchCompute(userId)
      //   .catch((err) => {
      //     this.logger.error(
      //       `CONTACTS_CONTROLLER :: IMPORT_CSV : QUEUE_MATCH_ERROR : ${err}`
      //     );
      //   });

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: IMPORT_CSV_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("microsoft-import/status")
  async getMicrosoftContactsImportStatus(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data =
        await this.contactsService.getMicrosoftContactsImportStatus(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: GET_MICROSOFT_CONTACTS_IMPORT_STATUS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("microsoft-import/resync")
  async resyncMicrosoftContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.contactsService.resyncMicrosoftContacts(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: RESYNC_MICROSOFT_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("microsoft-import/connect")
  async connectMicrosoftContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.contactsService.connectMicrosoftContacts(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: CONNECT_MICROSOFT_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("microsoft-import/process-callback")
  async processMicrosoftContactsCallback(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: MicrosoftImportProcessCallbackDto
  ) {
    try {
      if (!body.code) {
        throw new BadRequestException(
          CONTACTS_MESSAGES.ERROR.MISSING_AUTH_CODE
        );
      }
      const data = await this.contactsService.processMicrosoftContactsCallback(
        body.code,
        userId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: PROCESS_MICROSOFT_CONTACTS_CALLBACK : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("import-microsoft")
  async importMicrosoftContacts(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: ImportMicrosoftContactsDto
  ) {
    try {
      const data = await this.contactsService.importMicrosoftContacts(
        userId,
        body.code,
        body.redirectUri
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: IMPORT_MICROSOFT_CONTACTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get(":id")
  async getContactById(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id", ParseIntPipe) contactId: number
  ) {
    try {
      const data = await this.contactsService.getContactById(userId, contactId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: GET_CONTACT_BY_ID : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("check-email")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // limits to 20 requests per minute
  async checkEmail(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: CheckEmailDto
  ) {
    try {
      if (!body.email) {
        return responseUtils.error({
          res,
          error: new BadRequestException("Email parameter is required"),
        });
      }

      const email = body.email.trim();

      const exists =
        await this.contactsService.checkEmailExistsForOtherContact(email);

      return responseUtils.success(res, {
        data: {
          exists,
          message: exists
            ? CONTACTS_MESSAGES.ERROR.EMAIL_ALREADY_IN_USE
            : undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: CHECK_EMAIL : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Patch(":id")
  async updateContact(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id", ParseIntPipe) contactId: number,
    @Body() updateData: Partial<CreateContactDto>
  ) {
    try {
      const data = await this.contactsService.updateContact(
        userId,
        contactId,
        updateData
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: UPDATE_CONTACT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Patch(":id/bounty-amount")
  async updateBountyAmount(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id", ParseIntPipe) contactId: number,
    @Body() body: UpdateBountyAmountDto
  ) {
    try {
      if (body.bountyAmount === undefined || body.bountyAmount === null) {
        throw new BadRequestException(
          CONTACTS_MESSAGES.ERROR.BOUNTY_AMOUNT_REQUIRED
        );
      }
      const data =
        await this.contactsService.updateContactRelationshipBountyAmount(
          userId,
          contactId,
          body.bountyAmount
        );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: UPDATE_BOUNTY_AMOUNT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("linkedin/generate-presigned-url")
  async generateLinkedInZipUploadUrl(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: GenerateLinkedInZipUploadUrlDto
  ) {
    try {
      const data = await this.contactsService.generateLinkedInZipUploadUrl(
        userId,
        {
          fileName: body.fileName,
          fileSize: parseInt(body.fileSize, 10),
        }
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: GENERATE_LINKEDIN_ZIP_UPLOAD_URL : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("linkedin/complete-upload")
  async completeLinkedInZipUpload(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: CompleteLinkedInZipUploadDto
  ) {
    try {
      const data = await this.contactsService.processLinkedInZipUpload(
        userId,
        body.s3Key
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: COMPLETE_LINKEDIN_ZIP_UPLOAD : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("linkedin/import-status/:importRecordId")
  async getLinkedInImportStatus(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("importRecordId") importRecordId: string
  ) {
    try {
      const data = await this.contactsService.getLinkedInImportStatus(
        userId,
        importRecordId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACTS_CONTROLLER :: GET_LINKEDIN_IMPORT_STATUS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
