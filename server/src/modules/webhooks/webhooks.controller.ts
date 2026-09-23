import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  RawBodyRequest,
  Inject,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "decorators/public.decorator";
import responseUtils from "utils/response.utils";
import { Request, Response } from "express";
import { StripeWebhooksService } from "./stripe/stripe-webhooks.service";
import { ResendWebhooksService } from "./resend/resend-webhooks.service";

@ApiTags("Webhooks")
@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    @Inject(StripeWebhooksService)
    private readonly webhooksService: StripeWebhooksService,
    @Inject(ResendWebhooksService)
    private readonly resendWebhooksService: ResendWebhooksService
  ) {}

  @Public()
  @Post("stripe")
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
    @Res() res: Response
  ) {
    try {
      if (!signature) {
        return res.status(401).json({
          statusCode: 401,
          message: "Missing Stripe signature header",
          error: "Unauthorized",
        });
      }

      const rawBody =
        (req.rawBody as Buffer) || (req.body as Buffer) || Buffer.from("");
      await this.webhooksService.handleStripeWebhook(rawBody, signature);
      return responseUtils.success(res, { data: { received: true } });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (this.isStripeSignatureError(error)) {
        this.logger.error("Stripe webhook signature verification failed", {
          message: errorMessage,
        });
        return res.status(401).json({
          statusCode: 401,
          message: errorMessage,
          error: "Unauthorized",
        });
      }

      this.logger.error("Webhook error:", errorMessage);
      return responseUtils.success(res, { data: { error: errorMessage } });
    }
  }

  @Public()
  @Post("stripe/v2")
  async handleStripeV2Webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
    @Res() res: Response
  ) {
    try {
      if (!signature) {
        return res.status(401).json({
          statusCode: 401,
          message: "Missing Stripe signature header",
          error: "Unauthorized",
        });
      }

      const rawBody =
        (req.rawBody as Buffer) || (req.body as Buffer) || Buffer.from("");
      await this.webhooksService.handleStripeV2Webhook(rawBody, signature);
      return responseUtils.success(res, { data: { received: true } });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (this.isStripeSignatureError(error)) {
        this.logger.error("Stripe v2 webhook signature failed", {
          message: errorMessage,
        });
        return res.status(401).json({
          statusCode: 401,
          message: errorMessage,
          error: "Unauthorized",
        });
      }

      this.logger.error("Webhook error:", errorMessage);
      return responseUtils.success(res, { data: { error: errorMessage } });
    }
  }

  @Public()
  @Post("resend")
  async handleResendWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("svix-id") svixId: string,
    @Headers("svix-timestamp") svixTimestamp: string,
    @Headers("svix-signature") svixSignature: string,
    @Res() res: Response
  ) {
    try {
      // Extract raw body for signature verification
      const rawBody =
        (req.rawBody as Buffer) || (req.body as Buffer) || Buffer.from("");

      // Verify webhook signature before processing
      const verifiedPayload = this.resendWebhooksService.verifyWebhookSignature(
        rawBody,
        {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        }
      );

      // Process webhook only after successful verification
      await this.resendWebhooksService.handleWebhook(
        verifiedPayload as Record<string, unknown>
      );
      return responseUtils.success(res, { data: { received: true } });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Return appropriate HTTP status codes for verification failures
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        this.logger.error(
          "Webhook signature verification failed:",
          errorMessage
        );
        return res.status(error.getStatus()).json({
          statusCode: error.getStatus(),
          message: errorMessage,
          error:
            error instanceof UnauthorizedException
              ? "Unauthorized"
              : "Forbidden",
        });
      }

      // Handle other errors
      this.logger.error("Webhook error:", errorMessage);
      return responseUtils.success(res, { data: { error: errorMessage } });
    }
  }

  private isStripeSignatureError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error as AnyType).type === "StripeSignatureVerificationError"
    );
  }
}
