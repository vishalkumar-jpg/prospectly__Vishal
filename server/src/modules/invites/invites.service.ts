import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull, sql, or } from "drizzle-orm";
import { UserInvite } from "database/schema";
import { JwtService } from "@nestjs/jwt";
import { ConfigType } from "@nestjs/config";
import jwtConfig from "config/jwt.config";
import { appConfig } from "config/app.config";
import { toUTC } from "utils/dayjs";

import { EmailsService } from "modules/emails/emails.service";
import { decryptData } from "services/encryptionService";
import { StripeService } from "modules/stripe/stripe.service";
import { ReferralQueueService } from "modules/referral-queue/referral-queue.service";
import { ReferralsService } from "modules/referrals/referrals.service";
import { ContactsService } from "modules/contacts/contacts.service";
import { NotificationSendGateService } from "modules/notification-preferences/notification-send-gate.service";
import { isSupportedPayoutCountry } from "config/payment.config";
import type { ReferralInvitedUserInput } from "modules/referrals/referrals.service";
import crypto from "node:crypto";
import {
  INVITE_STATUS,
  INVITE_TYPE,
  INVITE_CONSTANTS,
  VERIFICATION_TYPE,
  VERIFICATION_STATUS,
} from "./invites.constants";
import { AnyType } from "../../types/common";

interface InviteTokenPayload {
  email: string; // Target email
  senderUserId?: string; // Sender user ID
  senderEmail: string; // Sender email
  couponCode?: string;
  planId?: string;
  stripeCustomerId?: string;
  organisationId?: string;
  /** ISO 3166-1 alpha-2 payout country for invitee profile defaults */
  country?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly emailsService: EmailsService,
    private readonly stripeService: StripeService,
    private readonly referralQueueService: ReferralQueueService,
    @Inject(forwardRef(() => ReferralsService))
    private readonly referralsService: ReferralsService,
    private readonly contactsService: ContactsService,
    private readonly sendGate: NotificationSendGateService
  ) {}

  private getJwtLinkExpiresAt(token: string): Date {
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      return toUTC(decoded.exp * 1000);
    }
    return toUTC(toUTC().getTime() + 24 * 60 * 60 * 1000);
  }

  /**
   * Generate multiple stateless invite links from Contact IDs (Secure)
   */
  async generateInvitesFromContactIds(
    userId: string,
    contactIds: string[],
    planId: string,
    organisationId?: string,
    customHtml?: string,
    inviteText?: string,
    options?: { skipLeaderQuotaIncrement?: boolean },
    country?: string
  ): Promise<{ email: string; inviteLink?: string; error?: string }[]> {
    const inviteCountry =
      typeof country === "string" && isSupportedPayoutCountry(country.trim())
        ? country.trim().toUpperCase()
        : undefined;
    // 1. Get sender profile and plan once
    const sender = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!sender) {
      throw new NotFoundException("Sender profile not found");
    }

    const plan = await this.db.query.subscriptionPlan.findFirst({
      where: and(
        eq(schema.subscriptionPlan.id, planId),
        isNull(schema.subscriptionPlan.deletedAt)
      ),
      with: {
        prices: {
          where: isNull(schema.subscriptionPlanPrice.deletedAt),
        },
      },
    });

    if (!plan) {
      throw new NotFoundException("Subscription plan not found");
    }

    // 2. Initial validation (yearly plan check)
    const isPaidPlan =
      plan.prices && plan.prices.some((p) => Number(p.price) > 0);

    const yearlyPrice = plan.prices.find((p) => p.interval === "year");

    if (isPaidPlan && !yearlyPrice) {
      throw new BadRequestException(
        "Only yearly plans can be used for invitations"
      );
    }

    // 3. Validate organization selection based on plan
    let effectiveLeaderPerms: AnyType = null;

    if (organisationId) {
      // If organization is specified, validate user has leader permissions for it and this plan
      effectiveLeaderPerms =
        await this.db.query.organisationLeaderPermissions.findFirst({
          where: and(
            eq(schema.organisationLeaderPermissions.userId, userId),
            eq(
              schema.organisationLeaderPermissions.organisationId,
              organisationId
            ),
            isNull(schema.organisationLeaderPermissions.deletedAt),
            sql`${schema.organisationLeaderPermissions.allowedPlanIds} @> ${JSON.stringify([planId])}::jsonb`
          ),
        });

      if (!effectiveLeaderPerms && isPaidPlan) {
        throw new BadRequestException(
          "You do not have permission to invite for this specific organization and plan"
        );
      }
    } else {
      // If no organization is specified (None), check if it's a paid plan
      if (isPaidPlan) {
        throw new BadRequestException(
          "An organization must be selected for paid invitation plans"
        );
      }
    }

    const finalOrganisationId = organisationId || null;

    const results: { email: string; inviteLink?: string; error?: string }[] =
      [];

    const invitedUsersData: ReferralInvitedUserInput[] = [];

    // 3. Process each contact ID
    for (const contactId of contactIds) {
      let normalizedEmail = "";
      let incrementedForThisContact = false;

      try {
        // Fetch encrypted data
        this.logger.log(`Processing contactId: ${contactId}`);
        const sensitiveData =
          await this.db.query.contactSensitiveData.findFirst({
            where: eq(
              schema.contactSensitiveData.contactId,
              parseInt(contactId)
            ),
          });

        if (!sensitiveData || !sensitiveData.email) {
          this.logger.warn(`No email found for contactId: ${contactId}`);
          results.push({
            email: `Contact ID: ${contactId}`,
            error: "No email found for this contact",
          });
          continue;
        }

        // Fetch contact details for full name
        const contact = await this.db.query.contacts.findFirst({
          where: eq(schema.contacts.id, parseInt(contactId)),
        });

        const fullName = contact
          ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "-"
          : "-";

        // Decrypt email
        const originalEmail =
          await this.contactsService.getContactDecryptedEmail(
            parseInt(contactId)
          );

        if (!originalEmail) {
          this.logger.error(
            `Decryption failed for contactId: ${contactId}. The data might be encrypted with a different key or is corrupted.`
          );
          results.push({
            email: `Contact ID: ${contactId}`,
            error:
              "Failed to decrypt email. Please verify your ENCRYPTION_KEY and contact data.",
          });
          continue;
        }
        normalizedEmail = originalEmail.toLowerCase().trim();

        // Atomic limit check and increment if it's a paid plan
        if (
          isPaidPlan &&
          effectiveLeaderPerms &&
          !options?.skipLeaderQuotaIncrement
        ) {
          const updateResult = await this.db
            .update(schema.organisationLeaderPermissions)
            .set({
              invitesUsedThisMonth: sql`${schema.organisationLeaderPermissions.invitesUsedThisMonth} + 1`,
              updatedAt: toUTC(),
            })
            .where(
              and(
                eq(
                  schema.organisationLeaderPermissions.id,
                  effectiveLeaderPerms.id
                ),
                isNull(schema.organisationLeaderPermissions.deletedAt),
                or(
                  isNull(
                    schema.organisationLeaderPermissions.maxInvitesPerMonth
                  ),
                  sql`${schema.organisationLeaderPermissions.invitesUsedThisMonth} < ${schema.organisationLeaderPermissions.maxInvitesPerMonth}`
                )
              )
            )
            .returning();

          if (updateResult.length === 0) {
            results.push({
              email: normalizedEmail,
              error: "Monthly invite limit reached",
            });
            continue;
          }
          incrementedForThisContact = true;
        }

        let couponCode: string | undefined;
        let stripeCustomerId: string | undefined;

        if (isPaidPlan) {
          try {
            // 1. Create Stripe Customer (Lead)
            const customer = await this.stripeService.createCustomer(
              normalizedEmail,
              undefined,
              {
                source: "invite_flow",
                sender_id: userId,
                plan_id: planId,
              }
            );
            stripeCustomerId = customer.id;

            // 2. Create specific coupon with expiry
            const pseudoInviteId = crypto.randomUUID();
            const couponExpiresAt = toUTC();
            couponExpiresAt.setDate(couponExpiresAt.getDate() + 30); // 30 days expiry

            const couponResult =
              await this.stripeService.createCustomerSpecificCoupon({
                inviteId: pseudoInviteId,
                email: normalizedEmail,
                planId,
                expiresAt: couponExpiresAt,
                stripeCustomerId,
                stripeProductId: plan.stripePlanId,
              });
            couponCode = couponResult.promotionCodeId || couponResult.id;
          } catch (couponError) {
            this.logger.error("Failed to create Stripe resources", couponError);
            throw new Error("Failed to generate promo code");
          }
        }

        // Generate JWT Token
        const payload = {
          email: normalizedEmail,
          senderUserId: userId,
          senderEmail: sender.email,
          planId,
          couponCode,
          stripeCustomerId,
          organisationId: finalOrganisationId,
          ...(inviteCountry ? { country: inviteCountry } : {}),
        };

        const token = await this.jwtService.signAsync(payload, {
          secret: this.jwtConfiguration.accessTokenSecret,
          expiresIn: "1d",
        });

        const inviteLink = `${appConfig.frontendUrl}/accept-invite/${token}`;

        // Send email
        const emailResult = await this.emailsService.sendInviteEmail(
          normalizedEmail,
          `${sender.firstName} ${sender.lastName}`,
          inviteLink,
          inviteText, // Use inviteText if provided, otherwise undefined
          customHtml
        );

        if (!emailResult.success) {
          throw new Error(emailResult.error || "Failed to send email");
        }

        const invitedAt = toUTC();
        results.push({ email: normalizedEmail, inviteLink });
        invitedUsersData.push({
          email: normalizedEmail,
          fullName,
          subscriptionPlan: plan.name,
          invitedAt,
          contactId,
          subscriptionPlanId: plan.id,
          expiresAt: this.getJwtLinkExpiresAt(token),
          organisationId: finalOrganisationId,
          ...(inviteCountry ? { country: inviteCountry } : {}),
        });
      } catch (err) {
        if (incrementedForThisContact && effectiveLeaderPerms) {
          // Revert the increment if subsequent steps failed
          await this.db
            .update(schema.organisationLeaderPermissions)
            .set({
              invitesUsedThisMonth: sql`GREATEST(0, ${schema.organisationLeaderPermissions.invitesUsedThisMonth} - 1)`,
              updatedAt: toUTC(),
            })
            .where(
              and(
                eq(
                  schema.organisationLeaderPermissions.id,
                  effectiveLeaderPerms.id
                ),
                isNull(schema.organisationLeaderPermissions.deletedAt)
              )
            );
        }
        results.push({
          email: normalizedEmail || `Contact ID: ${contactId}`,
          error: err instanceof Error ? err.message : "Internal error",
        });
      }
    }

    // 4. Update referral progress once for all successful ones
    if (invitedUsersData.length > 0) {
      try {
        // Update referral progress with details
        await this.referralsService.updateInvitedUsers(
          userId,
          invitedUsersData
        );
        this.logger.log(
          `Successfully updated referral progress for ${invitedUsersData.length} invited users`
        );
      } catch (error) {
        this.logger.error(
          `Failed to update referral progress after sending invites: ${error instanceof Error ? error.message : "Unknown error"}`,
          error instanceof Error ? error.stack : undefined
        );
        // Don't fail the entire request if referral progress update fails
        // The invites were already sent successfully
      }
    }

    return results;
  }

  /**
   * Generate multiple stateless invite links (Legacy/Raw Email Support)
   */
  async generateInviteLinks(
    userId: string,
    targetEmails: string[],
    planId: string,
    organisationId?: string
  ): Promise<{ email: string; inviteLink?: string; error?: string }[]> {
    // 1. Get sender profile and plan once
    const sender = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!sender) {
      throw new NotFoundException("Sender profile not found");
    }

    const plan = await this.db.query.subscriptionPlan.findFirst({
      where: and(
        eq(schema.subscriptionPlan.id, planId),
        isNull(schema.subscriptionPlan.deletedAt)
      ),
      with: {
        prices: {
          where: isNull(schema.subscriptionPlanPrice.deletedAt),
        },
      },
    });

    if (!plan) {
      throw new NotFoundException("Subscription plan not found");
    }

    // 2. Initial validation (yearly plan check)
    const isPaidPlan =
      plan.prices && plan.prices.some((p) => Number(p.price) > 0);

    const yearlyPrice = plan.prices.find((p) => p.interval === "year");

    if (isPaidPlan && !yearlyPrice) {
      throw new BadRequestException(
        "Only yearly plans can be used for invitations"
      );
    }

    // 2. Validate organization selection based on plan
    let effectiveLeaderPerms: AnyType = null;

    if (organisationId) {
      // If organization is specified, validate user has leader permissions for it and this plan
      effectiveLeaderPerms =
        await this.db.query.organisationLeaderPermissions.findFirst({
          where: and(
            eq(schema.organisationLeaderPermissions.userId, userId),
            eq(
              schema.organisationLeaderPermissions.organisationId,
              organisationId
            ),
            isNull(schema.organisationLeaderPermissions.deletedAt),
            sql`${schema.organisationLeaderPermissions.allowedPlanIds} @> ${JSON.stringify([planId])}::jsonb`
          ),
        });

      if (!effectiveLeaderPerms && isPaidPlan) {
        throw new BadRequestException(
          "You do not have permission to invite for this specific organization and plan"
        );
      }
    } else {
      // If no organization is specified (None), check if it's a paid plan
      if (isPaidPlan) {
        throw new BadRequestException(
          "An organization must be selected for paid invitation plans"
        );
      }
    }

    const finalOrganisationId = organisationId || null;

    const results: { email: string; inviteLink?: string; error?: string }[] =
      [];
    const legacyInvitedPayload: ReferralInvitedUserInput[] = [];

    // 3. Process each email
    for (const targetEmail of targetEmails) {
      const normalizedEmail = targetEmail.toLowerCase().trim();
      let incrementedForThisContact = false;

      try {
        // Atomic limit check and increment if it's a paid plan
        if (isPaidPlan && effectiveLeaderPerms) {
          const updateResult = await this.db
            .update(schema.organisationLeaderPermissions)
            .set({
              invitesUsedThisMonth: sql`${schema.organisationLeaderPermissions.invitesUsedThisMonth} + 1`,
              updatedAt: toUTC(),
            })
            .where(
              and(
                eq(
                  schema.organisationLeaderPermissions.id,
                  effectiveLeaderPerms.id
                ),
                isNull(schema.organisationLeaderPermissions.deletedAt),
                or(
                  isNull(
                    schema.organisationLeaderPermissions.maxInvitesPerMonth
                  ),
                  sql`${schema.organisationLeaderPermissions.invitesUsedThisMonth} < ${schema.organisationLeaderPermissions.maxInvitesPerMonth}`
                )
              )
            )
            .returning();

          if (updateResult.length === 0) {
            results.push({
              email: normalizedEmail,
              error: "Monthly invite limit reached",
            });
            continue;
          }
          incrementedForThisContact = true;
        }

        let couponCode: string | undefined;
        let stripeCustomerId: string | undefined;

        if (isPaidPlan) {
          try {
            // 1. Create Stripe Customer (Lead)
            const customer = await this.stripeService.createCustomer(
              normalizedEmail,
              undefined,
              {
                source: "invite_flow_legacy",
                sender_id: userId,
                plan_id: planId,
              }
            );
            stripeCustomerId = customer.id;

            // 2. Create specific coupon with expiry
            const pseudoInviteId = crypto.randomUUID();
            const expiresAt = toUTC();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

            const couponResult =
              await this.stripeService.createCustomerSpecificCoupon({
                inviteId: pseudoInviteId,
                email: normalizedEmail,
                planId,
                expiresAt,
                stripeCustomerId,
                stripeProductId: plan.stripePlanId,
              });
            couponCode = couponResult.code;
          } catch (couponError) {
            this.logger.error("Failed to create Stripe resources", couponError);
            throw new Error("Failed to generate promo code");
          }
        }

        // Generate JWT Token
        const payload = {
          email: normalizedEmail,
          senderUserId: userId,
          senderEmail: sender.email,
          planId,
          couponCode,
          stripeCustomerId,
          organisationId: finalOrganisationId,
        };

        const token = await this.jwtService.signAsync(payload, {
          secret: this.jwtConfiguration.accessTokenSecret,
          expiresIn: "1d",
        });

        const inviteLink = `${appConfig.frontendUrl}/accept-invite/${token}`;

        const emailResult = await this.emailsService.sendInviteEmail(
          normalizedEmail,
          `${sender.firstName} ${sender.lastName}`,
          inviteLink
        );

        if (!emailResult.success) {
          throw new Error(emailResult.error || "Failed to send email");
        }

        const invitedAtLegacy = toUTC();
        results.push({ email: normalizedEmail, inviteLink });
        legacyInvitedPayload.push({
          email: normalizedEmail,
          fullName: "-",
          subscriptionPlan: plan.name,
          invitedAt: invitedAtLegacy,
          subscriptionPlanId: plan.id,
          expiresAt: this.getJwtLinkExpiresAt(token),
          organisationId: finalOrganisationId,
        });
      } catch (err) {
        if (incrementedForThisContact && effectiveLeaderPerms) {
          // Revert the increment if subsequent steps failed
          await this.db
            .update(schema.organisationLeaderPermissions)
            .set({
              invitesUsedThisMonth: sql`GREATEST(0, ${schema.organisationLeaderPermissions.invitesUsedThisMonth} - 1)`,
              updatedAt: toUTC(),
            })
            .where(
              and(
                eq(
                  schema.organisationLeaderPermissions.id,
                  effectiveLeaderPerms.id
                ),
                isNull(schema.organisationLeaderPermissions.deletedAt)
              )
            );
        }
        results.push({
          email: normalizedEmail,
          error: err instanceof Error ? err.message : "Internal error",
        });
      }
    }

    // 4. Update progress
    if (legacyInvitedPayload.length > 0) {
      try {
        await this.referralsService.updateInvitedUsers(
          userId,
          legacyInvitedPayload
        );
        this.logger.log(
          `Successfully updated referral progress for ${legacyInvitedPayload.length} invited users (legacy/raw emails)`
        );
      } catch (error) {
        this.logger.error(
          `Failed to update referral progress after sending invites (legacy/raw emails): ${error instanceof Error ? error.message : "Unknown error"}`,
          error instanceof Error ? error.stack : undefined
        );
        // Don't fail the entire request if referral progress update fails
        // The invites were already sent successfully
      }
    }

    return results;
  }

  /**
   * Generate a stateless invite link
   */
  async generateInviteLink(
    userId: string,
    targetEmail: string,
    planId: string,
    organisationId?: string
  ): Promise<string> {
    const results = await this.generateInviteLinks(
      userId,
      [targetEmail],
      planId,
      organisationId
    );
    if (results[0].error) {
      throw new BadRequestException(results[0].error);
    }
    return results[0].inviteLink!;
  }

  /**
   * Resend invite email with a new JWT link for a contact previously invited from My Contacts.
   */
  async resendInviteForContact(
    userId: string,
    contactId: string
  ): Promise<{ email: string; inviteLink: string }> {
    const progress =
      await this.referralsService.getUserReferralProgress(userId);
    if (!progress) {
      throw new BadRequestException("No invite history found");
    }

    const contactIdNum = parseInt(contactId, 10);
    if (Number.isNaN(contactIdNum)) {
      throw new BadRequestException("Invalid contact id");
    }

    await this.contactsService.getContactById(userId, contactIdNum);

    const sensitiveData = await this.db.query.contactSensitiveData.findFirst({
      where: eq(schema.contactSensitiveData.contactId, contactIdNum),
    });

    if (!sensitiveData?.email) {
      throw new BadRequestException("No email found for this contact");
    }

    const originalEmail = await decryptData(sensitiveData.email);
    if (!originalEmail) {
      throw new BadRequestException("Failed to read contact email");
    }
    const normalizedEmail = originalEmail.toLowerCase().trim();

    const acceptedRaw = Array.isArray(progress.acceptedUsers)
      ? (progress.acceptedUsers as AnyType[])
      : [];
    if (
      acceptedRaw.some(
        (a: AnyType) => String(a.email || "").toLowerCase() === normalizedEmail
      )
    ) {
      throw new BadRequestException("This user has already joined");
    }

    const invitedRaw = Array.isArray(progress.invitedUsers)
      ? (progress.invitedUsers as AnyType[])
      : [];
    const contactIdStr = String(contactIdNum);
    let row = invitedRaw.find(
      (u: AnyType) =>
        u.contactId !== undefined &&
        u.contactId !== null &&
        String(u.contactId) === contactIdStr
    );
    if (!row) {
      row = invitedRaw.find(
        (u: AnyType) => String(u.email || "").toLowerCase() === normalizedEmail
      );
    }

    if (!row?.subscriptionPlanId) {
      throw new BadRequestException(
        "This invite cannot be resent automatically. Send a new invite from your contacts."
      );
    }

    const orgFromRow = row.organisationId;
    const orgId =
      orgFromRow !== undefined && orgFromRow !== null && orgFromRow !== ""
        ? String(orgFromRow)
        : undefined;

    const countryFromRow =
      typeof row.country === "string" &&
      isSupportedPayoutCountry(row.country.trim())
        ? row.country.trim().toUpperCase()
        : undefined;

    const results = await this.generateInvitesFromContactIds(
      userId,
      [contactId],
      String(row.subscriptionPlanId),
      orgId,
      undefined,
      undefined,
      { skipLeaderQuotaIncrement: true },
      countryFromRow
    );

    const first = results[0];
    if (!first?.inviteLink) {
      throw new BadRequestException(first?.error || "Resend failed");
    }

    return { email: first.email, inviteLink: first.inviteLink };
  }

  async getLeaderPermissions(userId: string) {
    const results = await this.db.query.organisationLeaderPermissions.findMany({
      where: and(
        eq(schema.organisationLeaderPermissions.userId, userId),
        isNull(schema.organisationLeaderPermissions.deletedAt)
      ),
      with: {
        organisation: {
          columns: {
            name: true,
          },
        },
      },
    });

    return results;
  }

  private async getOrganisationNameById(
    organisationId: string | null | undefined
  ): Promise<string | null> {
    if (!organisationId) return null;
    const org = await this.db.query.organisation.findFirst({
      where: and(
        eq(schema.organisation.id, organisationId),
        isNull(schema.organisation.deletedAt)
      ),
      columns: { name: true },
    });
    return org?.name ?? null;
  }

  private async withOrganisationName<
    T extends { organisationId: string | null },
  >(invite: T): Promise<T & { organisationName: string | null }> {
    const organisationName = await this.getOrganisationNameById(
      invite.organisationId
    );
    return { ...invite, organisationName };
  }

  /**
   * Get invite details by token (public, no auth required)
   * Supports both DB tokens and stateless JWT tokens
   */
  async getInviteByToken(token: string) {
    // 1. Try finding in DB first
    const invite = await this.db.query.userInvites.findFirst({
      where: and(
        eq(schema.userInvites.inviteToken, token),
        isNull(schema.userInvites.deletedAt)
      ),
      with: {
        subscriptionPlan: true,
      },
    });

    if (invite) {
      // For DB invites, if it's PENDING but past expiresAt, we treat it as EXPIRED
      if (
        invite.status === INVITE_STATUS.PENDING &&
        invite.expiresAt &&
        toUTC() > invite.expiresAt
      ) {
        // We don't update the DB here, just return the status as EXPIRED for the UI
        return await this.withOrganisationName({
          ...invite,
          status: INVITE_STATUS.EXPIRED,
        });
      }
      return await this.withOrganisationName(invite);
    }

    // 2. Try decoding as JWT
    let payload: InviteTokenPayload | null = null;
    let status: string = INVITE_STATUS.PENDING;

    try {
      payload = await this.jwtService.verifyAsync<InviteTokenPayload>(token, {
        secret: this.jwtConfiguration.accessTokenSecret,
      });
    } catch (e) {
      this.logger.error(`Error verifying invite token: ${e}`);
      // If verification fails, check if it's just expired but has a valid signature
      try {
        payload = await this.jwtService.verifyAsync<InviteTokenPayload>(token, {
          secret: this.jwtConfiguration.accessTokenSecret,
          ignoreExpiration: true,
        });
        status = INVITE_STATUS.EXPIRED;
      } catch (verifyError) {
        this.logger.error(
          `Error verifying expired invite token signature: ${verifyError}`
        );
        return null;
      }
    }

    if (!payload || !payload.email) {
      return null;
    }

    // Check if THIS email has already accepted ANY invite
    if (status === INVITE_STATUS.PENDING) {
      const duplicateCheck = await this.checkDuplicateAcceptance(payload.email);
      if (duplicateCheck.hasAccepted) {
        status = INVITE_STATUS.ACCEPTED;
      }
    }

    // 3. Fetch the plan from DB dynamically
    let plan;

    // Priority 1: Plan ID from JWT
    if (payload.planId) {
      plan = await this.db.query.subscriptionPlan.findFirst({
        where: and(
          eq(schema.subscriptionPlan.id, payload.planId),
          isNull(schema.subscriptionPlan.deletedAt)
        ),
      });
    }

    // Priority 2: System Default Plan (flagged in DB)
    if (!plan) {
      plan = await this.db.query.subscriptionPlan.findFirst({
        where: and(
          eq(schema.subscriptionPlan.defaultPlan, true),
          isNull(schema.subscriptionPlan.deletedAt)
        ),
      });
    }

    // Priority 3: Fallback to first active/non-deleted plan
    if (!plan) {
      plan = await this.db.query.subscriptionPlan.findFirst({
        where: isNull(schema.subscriptionPlan.deletedAt),
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      });
    }

    const virtualCountry =
      typeof payload.country === "string" &&
      isSupportedPayoutCountry(payload.country.trim())
        ? payload.country.trim().toUpperCase()
        : undefined;

    // Construct virtual invite using constants
    return await this.withOrganisationName({
      id: INVITE_CONSTANTS.VIRTUAL_ID,
      email: payload.email,
      invitedByUserId: payload.senderUserId || null,
      referralCreditedTo: payload.senderUserId || null,
      senderEmail: payload.senderEmail || null,
      inviteToken: token,
      inviteType: INVITE_TYPE.SYSTEM_INVITE,
      status,
      subscriptionPlanId: plan?.id || "",
      subscriptionPlan: plan,
      stripeCouponId: payload.couponCode,
      stripeCustomerId: payload.stripeCustomerId || null,
      organisationId: payload.organisationId || null,
      expiresAt: toUTC((payload.exp || 0) * 1000),
      createdAt: toUTC((payload.iat || 0) * 1000),
      updatedAt: toUTC(),
      deletedAt: null,
      acceptedAt: null,
      acceptedUserId: null,
      metadata: virtualCountry ? { country: virtualCountry } : null,
    } as unknown as UserInvite & { subscriptionPlan: AnyType });
  }

  /**
   * Find the organisation ID for a given user
   */
  async getUserOrganisationId(userId: string): Promise<string | null> {
    const member = await this.db.query.organisationMemberSchema.findFirst({
      where: eq(schema.organisationMemberSchema.userId, userId),
      columns: {
        organisationId: true,
      },
    });

    return member?.organisationId || null;
  }

  /**
   * Validate invite token and return invite details
   */
  async validateInviteToken(token: string): Promise<UserInvite> {
    const invite = await this.getInviteByToken(token);

    if (!invite) {
      throw new NotFoundException("Invite not found");
    }

    // Check for specific restriction statuses per requirement
    if (invite.status === INVITE_STATUS.ACCEPTED) {
      throw new BadRequestException("Invitation has already been accepted");
    }

    if (invite.status === INVITE_STATUS.CANCELLED) {
      throw new BadRequestException("Invitation has been cancelled");
    }

    if (
      invite.status === INVITE_STATUS.EXPIRED ||
      (invite.expiresAt && toUTC() > invite.expiresAt)
    ) {
      throw new BadRequestException("Invitation link has expired");
    }

    // If it reached here, status should be PENDING and not expired
    if (invite.status !== INVITE_STATUS.PENDING) {
      throw new BadRequestException(
        `Invite is in ${invite.status.toLowerCase()} state`
      );
    }

    return invite;
  }

  /**
   * Check if email matches invite email (case-insensitive, trimmed)
   */
  validateEmailMatch(
    inviteEmail: string,
    googleEmail: string
  ): {
    match: boolean;
    normalizedInvite: string;
    normalizedGoogle: string;
  } {
    const normalizedInvite = inviteEmail.toLowerCase().trim();
    const normalizedGoogle = googleEmail.toLowerCase().trim();

    return {
      match: normalizedInvite === normalizedGoogle,
      normalizedInvite,
      normalizedGoogle,
    };
  }

  /**
   * Check if invite is eligible for acceptance
   */
  async checkInviteEligibility(
    token: string,
    email: string
  ): Promise<{
    eligible: boolean;
    invite: UserInvite | null;
    reason?: string;
  }> {
    const invite = await this.getInviteByToken(token);

    if (!invite) {
      return {
        eligible: false,
        invite: null,
        reason: "INVITE_NOT_FOUND",
      };
    }

    // 1. Check if already accepted
    if (invite.status === INVITE_STATUS.ACCEPTED) {
      return {
        eligible: false,
        invite,
        reason: "DUPLICATE_ACCEPTANCE",
      };
    }

    // 2. Check if cancelled
    if (invite.status === INVITE_STATUS.CANCELLED) {
      return {
        eligible: false,
        invite,
        reason: "INVITE_CANCELLED",
      };
    }

    // 3. Check if expired
    if (
      invite.status === INVITE_STATUS.EXPIRED ||
      (invite.expiresAt && toUTC() > invite.expiresAt)
    ) {
      return {
        eligible: false,
        invite,
        reason: "INVITE_EXPIRED",
      };
    }

    // 4. Check email match
    const emailMatch = this.validateEmailMatch(invite.email, email);
    if (!emailMatch.match) {
      return {
        eligible: false,
        invite,
        reason: "EMAIL_MISMATCH",
      };
    }

    // 5. Check for duplicate acceptance (already accepted an invite with same email)
    const duplicateCheck = await this.checkDuplicateAcceptance(email);
    if (duplicateCheck.hasAccepted) {
      // If already accepted, we should return the REAL invite from DB if possible
      let dbInvite = invite;
      if (duplicateCheck.acceptedInviteId) {
        const found = await this.db.query.userInvites.findFirst({
          where: eq(schema.userInvites.id, duplicateCheck.acceptedInviteId),
          with: {
            subscriptionPlan: true,
          },
        });
        if (found) {
          dbInvite = found as AnyType;
        }
      }

      return {
        eligible: false,
        invite: dbInvite,
        reason: "DUPLICATE_ACCEPTANCE",
      };
    }

    // 6. Final sanity check for non-pending status
    if (invite.status !== INVITE_STATUS.PENDING) {
      return {
        eligible: false,
        invite,
        reason: "INVALID_STATE",
      };
    }

    return {
      eligible: true,
      invite,
    };
  }

  /**
   * Check if email has already accepted an invite
   */
  async checkDuplicateAcceptance(email: string): Promise<{
    hasAccepted: boolean;
    acceptedInviteId?: string;
  }> {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check in userInvites table (for admin invites and legacy records)
    const acceptedInvite = await this.db.query.userInvites.findFirst({
      where: and(
        eq(schema.userInvites.email, normalizedEmail),
        eq(schema.userInvites.status, INVITE_STATUS.ACCEPTED),
        isNull(schema.userInvites.deletedAt)
      ),
    });

    if (acceptedInvite) {
      return {
        hasAccepted: true,
        acceptedInviteId: acceptedInvite.id,
      };
    }

    // 2. Check in referralProgress table (for stateless invites)
    // We search the acceptedUsers JSONB array for the email
    const [statelessAccepted] = await this.db
      .select({ id: schema.referralProgress.id })
      .from(schema.referralProgress)
      .where(
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${schema.referralProgress.acceptedUsers}) AS u 
          WHERE LOWER(u->>'email') = ${normalizedEmail}
        )`
      )
      .limit(1);

    return {
      hasAccepted: !!statelessAccepted,
      acceptedInviteId: undefined, // Virtual ID or none
    };
  }

  /**
   * Accept invite (with email validation)
   */
  async acceptInvite(
    token: string,
    userId: string,
    googleEmail: string
  ): Promise<UserInvite> {
    // Validate invite and check eligibility
    const eligibility = await this.checkInviteEligibility(token, googleEmail);
    if (!eligibility.eligible || !eligibility.invite) {
      throw new BadRequestException(
        eligibility.reason === "EMAIL_MISMATCH"
          ? "Email does not match invite email"
          : eligibility.reason === "DUPLICATE_ACCEPTANCE"
            ? "This email has already accepted an invite"
            : "Invite is not eligible for acceptance"
      );
    }

    // Verify user exists before accepting
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      this.logger.error(
        `Attempted to accept invite for non-existent user ID: ${userId}`
      );
      throw new BadRequestException("User profile not found");
    }

    const { invite } = eligibility;
    const isVirtual = invite.id === INVITE_CONSTANTS.VIRTUAL_ID;

    // Handle Virtual Invite (id === 0n)
    let finalInvite: UserInvite;

    if (invite.id === INVITE_CONSTANTS.VIRTUAL_ID) {
      // For virtual (stateless) invites, do NOT insert into userInvites table per requirement
      // This ensures user-to-user invites remain stateless even after acceptance
      finalInvite = invite;
    } else {
      // Update existing invite status
      try {
        const [updated] = await this.db
          .update(schema.userInvites)
          .set({
            status: INVITE_STATUS.ACCEPTED,
            acceptedAt: toUTC(),
            acceptedUserId: userId,
            updatedAt: toUTC(),
          })
          .where(eq(schema.userInvites.id, invite.id))
          .returning();

        finalInvite = updated;
      } catch (error) {
        this.logger.error(
          `Failed to update invite status for invite ${invite.id} (user: ${userId}). Error: ${error}`,
          error instanceof Error ? error.stack : undefined
        );
        throw error;
      }
    }

    // Log verification attempt (only if we have a real invite record due to DB foreign key constraints)
    if (finalInvite.id !== INVITE_CONSTANTS.VIRTUAL_ID) {
      await this.logVerificationAttempt(
        finalInvite.id,
        userId,
        VERIFICATION_TYPE.EMAIL_MATCH,
        VERIFICATION_STATUS.PASSED,
        {
          inviteEmail: invite.email,
          googleEmail,
          matched: true,
          isVirtualInvite: isVirtual,
        }
      );
    } else {
      this.logger.log(
        `Stateless invite accepted for user ${userId} (Email: ${googleEmail})`
      );
    }

    // Prepare stateless data for queue if necessary
    const statelessData =
      finalInvite.id === INVITE_CONSTANTS.VIRTUAL_ID &&
      invite.invitedByUserId &&
      invite.subscriptionPlanId
        ? {
            senderUserId: invite.invitedByUserId,
            planId: invite.subscriptionPlanId,
            planName:
              (invite as AnyType).subscriptionPlan?.name || "Premium Plan",
            email: invite.email,
          }
        : undefined;

    // Trigger referral progress update
    await this.referralQueueService.enqueueReferralProgressUpdate(
      finalInvite.id,
      userId,
      statelessData
    );

    await this.sendGate.clearUnsubscribedSuppression(googleEmail);

    return finalInvite;
  }

  /**
   * Log verification attempt
   */
  async logVerificationAttempt(
    inviteId: string,
    userId: string | null,
    type: string,
    status: string,
    data: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
    fraudSignals?: string[]
  ): Promise<void> {
    await this.db.insert(schema.inviteVerificationLogs).values({
      inviteId,
      userId: userId || null,
      verificationType: type,
      verificationStatus: status,
      verificationData: data,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      fraudSignals: fraudSignals || null,
    });
  }
}
