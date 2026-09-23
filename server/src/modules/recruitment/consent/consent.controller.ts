import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Res,
  Logger,
} from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { Request, Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { Public } from "decorators/public.decorator";
import { SkipCSRF } from "decorators/skip-csrf.decorator";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { getClientIp } from "utils/ip-extraction.util";
import { RecruitmentJobShareService } from "modules/recruitment/share/share.service";
import {
  ConsentVerifyService,
  ConsentSendService,
  ConsentResendService,
  ConsentDeclineService,
  ConsentApplyService,
  ConsentUpdateEmailService,
} from "./services";
import {
  SendConsentParamDto,
  DeclineConsentDto,
  ConsentApplyDto,
  VerifyConsentParamDto,
  UpdateConsentEmailDto,
} from "./consent.dto";

// NOTE: This controller is intentionally NOT gated at the class level.
// `consentApply` (POST /apply) is a candidate's own self-apply action and must
// be reachable by any authenticated user, like My Applications — it's already
// bound to the consent token's recipient email, so a candidate can only apply
// with a token issued to them. `verify`/`decline` are `@Public()`. The recruiter
// `sendConsent` route keeps its `@RequireModule("recruiting")` at method level.
@Controller("recruitment/consent")
export class ConsentController {
  private readonly logger = new Logger(ConsentController.name);

  constructor(
    private readonly consentSendService: ConsentSendService,
    private readonly consentResendService: ConsentResendService,
    private readonly consentDeclineService: ConsentDeclineService,
    private readonly consentApplyService: ConsentApplyService,
    private readonly consentVerifyService: ConsentVerifyService,
    private readonly consentUpdateEmailService: ConsentUpdateEmailService,
    private readonly shareService: RecruitmentJobShareService
  ) {}

  @RequireModule("recruiting")
  @Get(":id/consent-email")
  async getConsentEmail(
    @CurrentUser("userId") userId: string,
    @Param() params: SendConsentParamDto,
    @Res() res: Response
  ) {
    try {
      const result = await this.consentUpdateEmailService.getConsentEmail(
        userId,
        params.id
      );
      return responseUtils.success(res, { data: result });
    } catch (error) {
      this.logger.error(
        `CONSENT_CONTROLLER :: GET_CONSENT_EMAIL : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @RequireModule("recruiting")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(":id/consent-email")
  async updateConsentEmail(
    @CurrentUser("userId") userId: string,
    @Param() params: SendConsentParamDto,
    @Body() body: UpdateConsentEmailDto,
    @Res() res: Response
  ) {
    try {
      const result =
        await this.consentUpdateEmailService.updateConsentEmailAndSend(
          userId,
          params.id,
          body.email
        );
      return responseUtils.success(res, { data: result });
    } catch (error) {
      this.logger.error(
        `CONSENT_CONTROLLER :: UPDATE_CONSENT_EMAIL : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @RequireModule("recruiting")
  @Patch(":id/resend")
  async resendConsent(
    @CurrentUser("userId") userId: string,
    @Param() params: SendConsentParamDto,
    @Res() res: Response
  ) {
    try {
      const result = await this.consentResendService.resendConsent(
        userId,
        params.id
      );
      return responseUtils.success(res, { data: result });
    } catch (error) {
      this.logger.error(
        `CONSENT_CONTROLLER :: RESEND_CONSENT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @RequireModule("recruiting")
  @Patch(":id/send")
  async sendConsent(
    @CurrentUser("userId") userId: string,
    @Param() params: SendConsentParamDto,
    @Res() res: Response
  ) {
    try {
      const result = await this.consentSendService.sendConsent(
        userId,
        params.id
      );
      return responseUtils.success(res, { data: result });
    } catch (error) {
      this.logger.error(
        `CONSENT_CONTROLLER :: SEND_CONSENT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @SkipCSRF()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get("verify/:token")
  async verifyConsent(
    @Param() params: VerifyConsentParamDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const result = await this.consentVerifyService.verifyConsentToken(
        params.token
      );

      if (result?.jobId) {
        const ip = getClientIp(req);
        const userAgent = req.headers["user-agent"];
        const referrer = req.headers["referer"] as string | undefined;
        this.shareService
          .trackConsentView(result.jobId, ip, userAgent, referrer)
          .catch((err) => {
            this.logger.error(
              `CONSENT_CONTROLLER :: TRACK_VIEW : ERROR : ${err}`
            );
          });
      }

      return responseUtils.success(res, { data: result });
    } catch (error) {
      this.logger.error(
        `CONSENT_CONTROLLER :: VERIFY_CONSENT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @SkipCSRF()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("decline")
  async declineConsent(@Body() dto: DeclineConsentDto, @Res() res: Response) {
    try {
      const result = await this.consentDeclineService.declineConsent(dto);
      return responseUtils.success(res, { data: result });
    } catch (error) {
      this.logger.error(
        `CONSENT_CONTROLLER :: DECLINE_CONSENT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("apply")
  async consentApply(
    @CurrentUser("userId") userId: string,
    @Body() dto: ConsentApplyDto,
    @Res() res: Response
  ) {
    try {
      const result = await this.consentApplyService.consentApply(userId, dto);
      return responseUtils.success(res, { data: result });
    } catch (error) {
      this.logger.error(
        `CONSENT_CONTROLLER :: CONSENT_APPLY : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
