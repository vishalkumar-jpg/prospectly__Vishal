import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Res,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Public } from "decorators/public.decorator";
import type { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { InvitesService } from "./invites.service";
import { ResendInviteDto, GenerateInviteDto } from "./invites.dto";
import { OnboardingService } from "../onboarding/onboarding.service";

@ApiTags(ApiTagsEnum.Invites)
@Controller("invites")
export class InvitesController {
  constructor(
    private readonly invitesService: InvitesService,
    private readonly onboardingService: OnboardingService
  ) {}

  @Post("generate")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Generate stateless invite links" })
  @ApiResponse({ status: 200, description: "Invite links generated" })
  async generateInviteLink(
    @CurrentUser("userId") userId: string,
    @Body()
    body: GenerateInviteDto,
    @Res() res: Response
  ) {
    try {
      const results = await this.invitesService.generateInvitesFromContactIds(
        userId,
        body.contactIds,
        body.planId,
        body.organisationId,
        body.customHtml,
        body.inviteText,
        undefined,
        body.country
      );

      return responseUtils.success(res, {
        data: results,
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Post("resend")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Resend invite email with a new link for a contact",
  })
  @ApiResponse({ status: 200, description: "Invite resent" })
  async resendInvite(
    @CurrentUser("userId") userId: string,
    @Body() body: ResendInviteDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.invitesService.resendInviteForContact(
        userId,
        body.contactId
      );
      return responseUtils.success(res, {
        data,
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("leader-permissions")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get current user's organization leader permissions",
  })
  @ApiResponse({ status: 200, description: "Permissions retrieved" })
  async getLeaderPermissions(
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const permissions =
        await this.invitesService.getLeaderPermissions(userId);

      return responseUtils.success(res, {
        data: permissions,
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Post(":token/validate")
  @ApiOperation({ summary: "Validate invite with email (public)" })
  @ApiResponse({ status: 200, description: "Invite validation result" })
  async validateInvite(
    @Param("token") token: string,
    @Body() body: { email: string },
    @Res() res: Response
  ) {
    try {
      const eligibility = await this.invitesService.checkInviteEligibility(
        token,
        body.email
      );

      return responseUtils.success(res, {
        data: {
          eligible: eligibility.eligible,
          reason: eligibility.reason,
          invite: eligibility.invite
            ? {
                id: eligibility.invite.id.toString(),
                email: eligibility.invite.email,
                inviteType: eligibility.invite.inviteType,
                status: eligibility.invite.status,
              }
            : null,
        },
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Get(":token")
  @ApiOperation({ summary: "Get invite details (public)" })
  @ApiResponse({ status: 200, description: "Invite details retrieved" })
  @ApiResponse({ status: 404, description: "Invite not found" })
  async getInviteByToken(@Param("token") token: string, @Res() res: Response) {
    try {
      const invite = await this.invitesService.getInviteByToken(token);

      if (!invite) {
        return responseUtils.error({
          res,
          error: new Error("Invite not found or expired"),
          statusCode: 404,
        });
      }

      // Return invite details (without sensitive info)
      return responseUtils.success(res, {
        data: {
          id: invite.id.toString(),
          email: invite.email,
          senderEmail: (invite as AnyType).senderEmail || null, // From JWT if virtual
          inviteType: invite.inviteType,
          subscriptionPlan: invite.subscriptionPlan
            ? {
                id: invite.subscriptionPlan.id,
                name: invite.subscriptionPlan.name,
                description: invite.subscriptionPlan.description,
              }
            : null,
          status: invite.status,
          expiresAt: invite.expiresAt,
          organisationId: invite.organisationId,
          organisationName:
            (invite as { organisationName?: string | null }).organisationName ??
            null,
        },
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Post(":token/accept")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Accept invite (authenticated after OAuth)" })
  @ApiResponse({ status: 200, description: "Invite accepted successfully" })
  async acceptInvite(
    @Param("token") token: string,
    @CurrentUser("userId") userId: string,
    @CurrentUser("email") email: string,
    @Body() body: { googleUser?: AnyType },
    @Res() res: Response
  ) {
    try {
      // If googleUser is provided, this is a complete signup flow
      if (body.googleUser) {
        const result = await this.onboardingService.handleInviteSignup(
          token,
          body.googleUser
        );

        return responseUtils.success(res, {
          data: {
            user: {
              id: result.user.id,
              email: result.user.email,
            },
            invite: {
              id: result.invite.id.toString(),
              status: result.invite.status,
            },
            subscription: result.subscription
              ? {
                  id: result.subscription.id,
                  status: result.subscription.status,
                }
              : null,
          },
        });
      } else {
        // Just accept the invite (user already exists)
        // Use onboardingService to handle subscription creation as well
        const result =
          await this.onboardingService.handleExistingUserInviteAcceptance(
            token,
            userId,
            email
          );

        return responseUtils.success(res, {
          data: {
            invite: {
              id: result.invite.id.toString(),
              status: result.invite.status,
            },
            subscription: result.subscription
              ? {
                  id: result.subscription.id,
                  status: result.subscription.status,
                }
              : null,
          },
        });
      }
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }
}
