import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  ParseUUIDPipe,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { ContactsService } from "./contacts.service";
import { ListContactImportAccountsQueryDto } from "./contacts.dto";

@ApiTags(ApiTagsEnum.Contacts)
@Controller("contacts/import-accounts")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContactImportAccountsController {
  private readonly logger = new Logger(ContactImportAccountsController.name);

  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  async list(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: ListContactImportAccountsQueryDto
  ) {
    try {
      const data = await this.contactsService.listContactImportAccounts(
        userId,
        query.provider
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACT_IMPORT_ACCOUNTS_CONTROLLER :: LIST : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":tokenId/disconnect")
  async disconnect(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("tokenId", ParseUUIDPipe) tokenId: string
  ) {
    try {
      const data = await this.contactsService.disconnectContactImportAccount(
        userId,
        tokenId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACT_IMPORT_ACCOUNTS_CONTROLLER :: DISCONNECT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":tokenId/resync")
  async resync(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("tokenId", ParseUUIDPipe) tokenId: string
  ) {
    try {
      const data = await this.contactsService.resyncContactImportAccount(
        userId,
        tokenId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACT_IMPORT_ACCOUNTS_CONTROLLER :: RESYNC : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
