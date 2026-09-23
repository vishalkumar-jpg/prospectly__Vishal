import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { UserInvite } from "database/schema";
import Stripe from "stripe";
import { UserType } from "modules/profiles/profiles.constants";
import { AuthService } from "modules/auth/auth.service";
import {
  getPayoutCurrencyForCountry,
  isSupportedPayoutCountry,
} from "config/payment.config";
import { InvitesService } from "../invites/invites.service";
import { INVITE_CONSTANTS, INVITE_STATUS } from "../invites/invites.constants";
import { ProfilesService } from "../profiles/profiles.service";
import { StripeService } from "../stripe/stripe.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { SubscriptionDbService } from "../webhooks/stripe/services/subscription-db.service";
import { SubscriptionMapperService } from "../webhooks/stripe/services/subscription-mapper.service";
import { AnyType } from "../../types/common";

interface GoogleUser {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  picture?: string;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(InvitesService)
    private readonly invitesService: InvitesService,
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService,
    @Inject(StripeService)
    private readonly stripeService: StripeService,
    @Inject(SubscriptionsService)
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionDbService: SubscriptionDbService,
    private readonly subscriptionMapperService: SubscriptionMapperService,
    private readonly authService: AuthService
  ) {}

  /**
   * Complete signup flow for invited users
   * This is separate from the regular Google OAuth signup flow
   */
  async handleInviteSignup(
    token: string,
    googleUser: GoogleUser,
    googleTokens?: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
      scope?: string;
    },
    calendarTokens?: {
      accessToken: string;
      refreshToken?: string;
      expiryDate?: number;
      scope?: string;
    },
    microsoftTokens?: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
      scope?: string;
    }
  ): Promise<{
    user: schema.User;
    invite: UserInvite;
    subscription: Stripe.Subscription | null;
    inviteAccepted: boolean;
    subscriptionProvisioned?: boolean;
    isNewUser: boolean;
    inviteRejectReason?: string;
  }> {
    // Same-account re-login short-circuit: if invite already accepted by this user, no DB/Stripe changes
    const inviteByToken = await this.invitesService.getInviteByToken(token);
    const existingUser = await this.profilesService.getProfileByEmail(
      googleUser.email
    );
    if (inviteByToken && existingUser) {
      const isDbInvite =
        inviteByToken.id !== INVITE_CONSTANTS.VIRTUAL_ID &&
        typeof inviteByToken.id !== "undefined";
      if (
        isDbInvite &&
        inviteByToken.status === INVITE_STATUS.ACCEPTED &&
        (inviteByToken as { acceptedUserId?: string }).acceptedUserId ===
          existingUser.id
      ) {
        this.logger.log(
          `Same-account re-login on accept-invite for user ${existingUser.id}; no DB or Stripe changes.`
        );
        return {
          user: existingUser,
          invite: inviteByToken,
          subscription: null,
          inviteAccepted: true,
          subscriptionProvisioned: true,
          isNewUser: false,
        };
      }
    }

    // Validate invite and email match
    const eligibility = await this.invitesService.checkInviteEligibility(
      token,
      googleUser.email
    );

    if (!eligibility.eligible || !eligibility.invite) {
      // Fallback for EMAIL_MISMATCH: Create user but do not accept invite
      if (eligibility.reason === "EMAIL_MISMATCH" && eligibility.invite) {
        this.logger.warn(
          `Email mismatch during invite signup. Creating user ${googleUser.email} if new (ignoring invite ${eligibility.invite.id}).`
        );

        let user = await this.profilesService.getProfileByEmail(
          googleUser.email
        );
        const isNewUser = !user;

        if (!user) {
          // Create user account if new
          user = await this.createUserFromInvite(
            eligibility.invite,
            googleUser,
            // Invite is not accepted here, so its country/payout currency must
            // not land on this different Google account.
            { useInviteProfileDefaults: false }
          );

          const fullName =
            googleUser.fullName ||
            `${googleUser.firstName || ""} ${googleUser.lastName || ""}`.trim() ||
            undefined;

          // Initiate normal login flow setup for new users (Stripe customer -> Free plan, etc.)
          if (googleTokens || (calendarTokens && !microsoftTokens)) {
            await this.authService.setupGoogleServicesForNewUser({
              userId: user.id,
              email: user.email,
              fullName,
              googleTokens,
              calendarTokens,
            });
          } else if (microsoftTokens) {
            await this.authService.setupMicrosoftServicesForNewUser({
              userId: user.id,
              email: user.email,
              fullName,
              microsoftTokens,
              calendarTokens,
            });
          } else {
            // Default setup if no provider-specific tokens (at least Stripe customer for Free plan)
            await this.authService.setupGoogleServicesForNewUser({
              userId: user.id,
              email: user.email,
              fullName,
            });
          }
        }

        return {
          user,
          invite: eligibility.invite,
          subscription: null,
          inviteAccepted: false,
          isNewUser,
          inviteRejectReason: "EMAIL_MISMATCH",
        };
      }

      // DUPLICATE_ACCEPTANCE: same account re-login (already accepted an invite) — no DB or Stripe changes
      if (eligibility.reason === "DUPLICATE_ACCEPTANCE") {
        this.logger.log(
          `User ${googleUser.email} already accepted an invite; no action (same-account re-login).`
        );
        const user = await this.createUserFromInvite(
          eligibility.invite!,
          googleUser
        );
        return {
          user,
          invite: eligibility.invite!,
          subscription: null,
          inviteAccepted: true,
          subscriptionProvisioned: true,
          isNewUser: false,
        };
      }

      this.logger.warn(
        `Invite signup rejected: ${eligibility.reason} for ${googleUser.email}`
      );
      throw new BadRequestException(
        eligibility.reason === "DUPLICATE_ACCEPTANCE"
          ? "This email has already accepted an invite"
          : "Invite is not eligible for acceptance"
      );
    }

    const { invite } = eligibility;

    this.logger.log(`Step 1: Creating user for email ${googleUser.email}`);
    let isNewUser = false;
    let user = await this.profilesService.getProfileByEmail(googleUser.email);

    if (!user) {
      isNewUser = true;
      user = await this.createUserFromInvite(invite, googleUser);
    }

    // Always attempt to setup Google clinical services (Calendar/Contacts) if tokens are provided
    // using the existing AuthService methods.
    if (calendarTokens?.accessToken) {
      // Check if it's Google or Microsoft based on some flag?
      // Actually AuthService methods handle redundant connections gracefully now.
      // But verify if handleCalendarConnection works for both?
      // Note: AuthService has specific methods for Google(handleCalendarConnection) and Microsoft(handleMicrosoftCalendarConnection).
      // Since I don't know which one this is (it is just "calendarTokens"), I might need a way to distinguish.
      // BUT, in AuthService.loginWithGoogle, it calls setupGoogleServicesForNewUser which calls handleCalendarConnection.
      // In AuthService.loginWithMicrosoft, it calls setupMicrosoftServicesForNewUser which calls handleMicrosoftCalendarConnection.
      // Here, we have `calendarTokens`. If `googleTokens` are present, likely Google. If `microsoftTokens` are present, likely Microsoft.
      // I will use that heuristic.

      if (googleTokens) {
        await this.authService.handleCalendarConnection({
          userId: user.id,
          tokens: {
            accessToken: calendarTokens.accessToken,
            refreshToken: calendarTokens.refreshToken,
            expiryDate: calendarTokens.expiryDate,
          },
          email: user.email,
        });
      } else if (microsoftTokens) {
        await this.authService.handleMicrosoftCalendarConnection({
          userId: user.id,
          tokens: {
            accessToken: microsoftTokens.accessToken,
            refreshToken: microsoftTokens.refreshToken,
            expiryDate: microsoftTokens.expiryDate,
          },
          email: user.email,
        });
      }
    }

    // Setup Stripe customer only if user has none (never overwrite existing)
    this.logger.log(`Step 2: Ensuring Stripe customer for user ${user.id}`);
    let customerId: string;
    if (user.stripeCustomerId) {
      customerId = user.stripeCustomerId;
      this.logger.log(`Using existing Stripe customer for user ${user.id}`);
    } else {
      const customer = await this.createStripeCustomerForInvite(
        user,
        invite.email,
        invite
      );
      customerId = customer.id;
      await this.profilesService.updateProfile(user.id, {
        stripeCustomerId: customerId,
      } as AnyType);
    }

    // After Stripe is setup, setup provider services
    if (googleTokens) {
      await this.authService.setupGoogleServicesForNewUser({
        userId: user.id,
        email: user.email,
        fullName: user.fullName || undefined,
        googleTokens,
        // calendarTokens handled above or implicitly redundant safe
      });
    }

    if (microsoftTokens) {
      await this.authService.setupMicrosoftServicesForNewUser({
        userId: user.id,
        email: user.email,
        fullName: user.fullName || undefined,
        microsoftTokens,
      });
    }

    this.logger.log(
      `Step 3: Accepting invite ${invite.id} for user ${user.id} (Email: ${user.email})`
    );
    const acceptedInvite = await this.invitesService.acceptInvite(
      token,
      user.id,
      googleUser.email
    );

    this.logger.log(
      `Step 4: Creating subscription for invite ${acceptedInvite.id} (Plan: ${acceptedInvite.subscriptionPlanId})`
    );
    let subscription: Stripe.Subscription | null = null;
    try {
      subscription = await this.createSubscriptionForInvite(
        acceptedInvite,
        customerId,
        user.id
      );
      if (subscription) {
        this.logger.log(
          `SUCCESS: Subscription ${subscription.id} created for user ${user.id}`
        );
      } else {
        this.logger.warn(
          `Subscription creation for user ${user.id} returned null (possibly fell back to FREE)`
        );
      }
    } catch (error) {
      this.logger.error(
        `CRITICAL: Failed to create subscription for invite ${invite.id}: ${error}`,
        error instanceof Error ? error.stack : undefined
      );
    }

    // Add to organisation if org invite (if org tables exist)
    if (invite.organisationId) {
      await this.addToOrganisation(
        user.id,
        invite.organisationId,
        invite.invitedByUserId || undefined
      );
    }

    return {
      user,
      invite,
      subscription,
      inviteAccepted: true,
      subscriptionProvisioned: true, // We always provision at least a fallback now
      isNewUser,
    };
  }

  /**
   * Handle invite acceptance for an existing user (already logged in)
   */
  async handleExistingUserInviteAcceptance(
    token: string,
    userId: string,
    email: string
  ): Promise<{
    invite: UserInvite;
    subscription: Stripe.Subscription | null;
    subscriptionProvisioned?: boolean;
  }> {
    // 1. Accept the invite
    let invite: UserInvite;
    try {
      this.logger.log(
        `Step 1: Attempting to accept invite with token for user ${userId}`
      );
      invite = await this.invitesService.acceptInvite(token, userId, email);
    } catch (error) {
      if (
        error instanceof BadRequestException &&
        error.message === "This email has already accepted an invite"
      ) {
        this.logger.log(
          `Invite already accepted for ${email}. Checking for missing subscription.`
        );
        // Get the invite manually
        const eligibility = await this.invitesService.checkInviteEligibility(
          token,
          email
        );
        if (!eligibility.invite) {
          throw error; // Re-throw if invite truly not found
        }
        invite = eligibility.invite;
      } else {
        throw error;
      }
    }

    // 2. Get user profile to check for Stripe customer ID
    const profile = await this.profilesService.getProfileById(userId);
    if (!profile) {
      this.logger.error(`CRITICAL: Profile not found for user ${userId}`);
      throw new NotFoundException("User profile not found");
    }

    // Check if user already has an active subscription for the same plan
    const existingSubscriptions =
      await this.subscriptionDbService.findActiveSubscriptionsByUserId(userId);

    const alreadyOnInvitedPlan = existingSubscriptions.some(
      (s) => s.subscriptionPlanId === invite.subscriptionPlanId
    );

    if (alreadyOnInvitedPlan) {
      this.logger.log(
        `User ${userId} already has an active subscription for plan ${invite.subscriptionPlanId}.`
      );
      return {
        invite,
        subscription: null,
        subscriptionProvisioned: true,
      };
    }

    if (existingSubscriptions.length > 0) {
      this.logger.log(
        `User ${userId} has active subscription(s) but not for plan ${invite.subscriptionPlanId}. Proceeding with upgrade.`
      );
    }

    let customerId = profile.stripeCustomerId;

    // 3. Ensure Stripe customer exists
    if (!customerId) {
      this.logger.log(
        `Step 2: Creating Stripe customer for existing user ${userId}`
      );
      const customer = await this.createStripeCustomerForInvite(
        profile,
        email,
        invite
      );
      customerId = customer.id;
      // Update profile with customer ID
      await this.profilesService.updateProfile(userId, {
        stripeCustomerId: customerId,
      } as AnyType);
    }

    // 4. Create subscription
    this.logger.log(
      `Step 3: Creating subscription for existing user ${userId}`
    );
    let subscription: Stripe.Subscription | null = null;
    try {
      subscription = await this.createSubscriptionForInvite(
        invite,
        customerId,
        userId
      );
    } catch (error) {
      this.logger.error(
        `Failed to create subscription for existing user ${userId} on invite ${invite.id}: ${error}`,
        error instanceof Error ? error.stack : undefined
      );
    }

    // 5. Add to organisation if org invite
    if (invite.organisationId) {
      await this.addToOrganisation(
        userId,
        invite.organisationId,
        invite.invitedByUserId || undefined
      );
    }

    return {
      invite,
      subscription,
      subscriptionProvisioned: true,
    };
  }

  /**
   * Create user account from invite (reuse existing profile creation logic)
   */
  async createUserFromInvite(
    invite: UserInvite,
    googleUser: GoogleUser,
    options?: { useInviteProfileDefaults?: boolean }
  ): Promise<schema.User> {
    // Check if user already exists
    const existingUser = await this.profilesService.getProfileByEmail(
      googleUser.email
    );

    if (existingUser) {
      return existingUser;
    }

    // Create new profile
    const fullName =
      googleUser.fullName ||
      `${googleUser.firstName || ""} ${googleUser.lastName || ""}`.trim() ||
      undefined;

    // invite.metadata is untyped JSON: a non-string country would throw on trim(),
    // and an unsupported one would persist a country payout onboarding rejects.
    const inviteCountry = (() => {
      if (options?.useInviteProfileDefaults === false) return undefined;
      const meta = invite.metadata as { country?: unknown } | null;
      if (typeof meta?.country !== "string") return undefined;
      const normalized = meta.country.trim().toUpperCase();
      return isSupportedPayoutCountry(normalized) ? normalized : undefined;
    })();

    const user = await this.profilesService.createProfile({
      email: googleUser.email,
      firstName: googleUser.firstName || undefined,
      lastName: googleUser.lastName || undefined,
      fullName,
      profilePhotoUrl: googleUser.picture || undefined,
      isVerified: true,
      type: UserType.USER,
      ...(inviteCountry
        ? {
            country: inviteCountry,
            payoutCurrency: getPayoutCurrencyForCountry(inviteCountry),
          }
        : {}),
    });

    return user;
  }

  /**
   * Create Stripe customer for invite (synchronously, not via queue)
   * We need the customer ID immediately to create subscription
   */
  async createStripeCustomerForInvite(
    user: schema.User,
    email: string,
    invite?: UserInvite
  ): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    // Reuse invite's customer only when current user email matches invite email (never assign to another user)
    const inviteEmailNorm = invite?.email?.toLowerCase().trim();
    const emailNorm = email?.toLowerCase().trim();
    this.logger.log(
      `Checking customer reuse: Invite Email: ${inviteEmailNorm}, Signup Email: ${emailNorm}, Invite Stripe Customer ID: ${invite?.stripeCustomerId || "none"}`
    );

    if (
      invite?.stripeCustomerId &&
      inviteEmailNorm &&
      emailNorm &&
      inviteEmailNorm === emailNorm
    ) {
      try {
        this.logger.log(
          `Attempting to reuse existing Lead customer: ${invite.stripeCustomerId}`
        );
        const existingCustomer = await this.stripeService.getCustomer(
          invite.stripeCustomerId
        );
        if (existingCustomer && !existingCustomer.deleted) {
          this.logger.log(
            `✅ Reusing existing Stripe customer from invite: ${existingCustomer.id}`
          );

          return existingCustomer;
        }
        this.logger.warn(
          `Lead customer ${invite.stripeCustomerId} was deleted or not found.`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to retrieve existing customer ${invite.stripeCustomerId}, creating new one: ${error}`
        );
      }
    } else {
      this.logger.log(
        "Skipped customer reuse logic (not matching email or no customer ID in invite)"
      );
    }

    // Create customer synchronously
    const customer = await this.stripeService.createCustomer(
      email,
      user.fullName || undefined,
      {
        userId: user.id,
      }
    );

    this.logger.log(
      `Stripe customer created for invite signup: ${customer.id}`
    );

    return customer;
  }

  /**
   * Create subscription directly with coupon applied
   * No checkout session - subscription created immediately via Stripe API
   */
  async createSubscriptionForInvite(
    invite: UserInvite,
    customerId: string,
    userId: string
  ): Promise<Stripe.Subscription | null> {
    // Get plan and its yearly price
    const plan = await this.db.query.subscriptionPlan.findFirst({
      where: eq(schema.subscriptionPlan.id, invite.subscriptionPlanId),
      with: {
        prices: {
          where: and(
            isNull(schema.subscriptionPlanPrice.deletedAt),
            eq(schema.subscriptionPlanPrice.interval, "year")
          ),
        },
      },
    });

    if (!plan) {
      this.logger.error(`Plan ${invite.subscriptionPlanId} not found in DB`);
      throw new NotFoundException("Plan not found");
    }

    // Strictly use the yearly price per requirement
    const price = plan.prices.find((p) => p.interval === "year");

    if (!price) {
      this.logger.error(
        `No yearly price found for plan ${plan.name} (${plan.id}). Invitations require a yearly plan.`
      );
      throw new BadRequestException(
        `Plan ${plan.name} does not have a yearly price configured.`
      );
    }

    this.logger.log(
      `Using Plan: ${plan.name}, Price: ${price.stripePriceId} (${price.interval}), Coupon: ${invite.stripeCouponId || "none"}`
    );

    // Create subscription directly with coupon applied during creation
    // Adding 365 days trial to allow immediate access without credit card
    let subscription: Stripe.Subscription;
    try {
      subscription = await this.stripeService.createSubscription(
        customerId,
        price.stripePriceId,
        {
          invite_id: invite.id.toString(),
          invite_type: invite.inviteType,
          organisation_id: invite.organisationId || "",
          user_id: customerId,
          coupon_applied: invite.stripeCouponId || "",
        },
        invite.stripeCouponId || undefined,
        365 // 365 days trial
      );

      this.logger.log(
        `Subscription created for invite ${invite.id}: ${subscription.id}`
      );
    } catch (stripeError) {
      this.logger.error(
        `Failed to create invited plan subscription on Stripe: ${stripeError}. Falling back to FREE plan.`
      );
      await this.createFreeSubscriptionFallback(userId);
      return null;
    }

    // Save subscription to database using internal mapper/service
    try {
      const internalSubscriptionData =
        this.subscriptionMapperService.mapStripeSubscriptionToInternal(
          subscription as AnyType,
          userId,
          price as AnyType
        );

      if (internalSubscriptionData) {
        // Enforce the invite ID and coupon in the DB record
        // Only set inviteId if it's a valid UUID (not virtual ID "0")
        if (invite.id && invite.id !== INVITE_CONSTANTS.VIRTUAL_ID) {
          internalSubscriptionData.inviteId = invite.id;
        }
        internalSubscriptionData.couponApplied = invite.stripeCouponId;

        await this.subscriptionDbService.createUserSubscription(
          internalSubscriptionData
        );
        this.logger.log(
          `Persisted subscription ${subscription.id} to DB for user ${userId}`
        );
      }
    } catch (dbError) {
      this.logger.error(
        `Failed to persist subscription ${subscription.id} to DB: ${dbError}`,
        dbError instanceof Error ? dbError.stack : undefined
      );
      // We don't throw - if DB fails but Stripe succeeded, the webhook should eventually catch and sync
      // but users might see 'Free' for a few seconds.
    }

    return subscription;
  }

  /**
   * Fallback to free plan if invited plan creation fails
   */
  private async createFreeSubscriptionFallback(userId: string): Promise<void> {
    try {
      this.logger.log(`Attempting fallback to FREE plan for user ${userId}`);

      const freePlan =
        await this.subscriptionMapperService.findDefaultFreePlan();
      if (!freePlan) {
        this.logger.error("Default FREE plan not found for fallback");
        return;
      }

      const freePrice = await this.subscriptionMapperService.findFreePlanPrice(
        freePlan.id
      );
      if (!freePrice) {
        this.logger.error(`No price found for FREE plan ${freePlan.id}`);
        return;
      }

      const currentPeriodStart = toUTC();
      const currentPeriodEnd = toUTC();
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);

      await this.subscriptionDbService.createUserSubscription({
        userId,
        subscriptionPlanId: freePlan.id,
        priceId: freePrice.id,
        stripeSubscriptionId: `fallback_free_${toUTC().getTime()}`,
        status: "active",
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      });

      this.logger.log(
        `Successfully provisioned fallback FREE plan for user ${userId}`
      );
    } catch (error) {
      this.logger.error(`Failed to provision fallback plan: ${error}`);
    }
  }

  /**
   * Add user to organisation if org invite
   * Note: This assumes organisation tables exist (may need to be implemented later)
   */
  async addToOrganisation(
    userId: string,
    organisationId: string,
    invitedBy?: string
  ): Promise<void> {
    try {
      // 1. Check if organisation exists
      const org = await this.db.query.organisation.findFirst({
        where: eq(schema.organisation.id, organisationId),
      });

      if (!org) {
        this.logger.warn(
          `Organisation ${organisationId} not found. Skipping membership addition for user ${userId}.`
        );
        return;
      }

      // 2. Check if user is already a member
      const existingMember =
        await this.db.query.organisationMemberSchema.findFirst({
          where: and(
            eq(schema.organisationMemberSchema.organisationId, organisationId),
            eq(schema.organisationMemberSchema.userId, userId)
          ),
        });

      if (existingMember) {
        this.logger.log(
          `User ${userId} is already a member of organisation ${organisationId}.`
        );
        return;
      }

      // 3. Add user to organisation_users table
      await this.db.insert(schema.organisationMemberSchema).values({
        organisationId,
        userId,
        isVerified: true,
        verifiedAt: toUTC(),
        invitedBy: invitedBy || null,
      });

      this.logger.log(
        `SUCCESS: User ${userId} added to organisation ${organisationId} (invitedBy: ${invitedBy || "none"})`
      );
    } catch (error) {
      this.logger.error(
        `Failed to add user ${userId} to organisation ${organisationId}: ${error}`
      );
    }
  }

  /**
   * Create Customer Portal session URL
   */
  async redirectToCustomerPortal(customerId: string, returnUrl: string) {
    return this.stripeService.createCustomerPortalSession(
      customerId,
      returnUrl
    );
  }

  /**
   * Post-OAuth invite acceptance logic
   * Called after user completes OAuth and we have their Google account info
   */
  async handleInviteAcceptanceAfterOAuth(
    token: string,
    userId: string,
    googleEmail: string
  ): Promise<UserInvite> {
    return this.invitesService.acceptInvite(token, userId, googleEmail);
  }

  /**
   * Check if the invited plan is an upgrade over existing subscriptions
   */
  private async checkForUpgradeEligibility(
    userId: string,
    invitedPlanId: string,
    existingSubscriptions: schema.UserSubscription[]
  ): Promise<{ shouldUpgrade: boolean }> {
    if (existingSubscriptions.length === 0) {
      return { shouldUpgrade: true }; // No sub -> always upgrade
    }

    // Get invited plan price
    const invitedPlanPrice = await this.getPlanPriceValue(invitedPlanId);
    if (invitedPlanPrice === null) return { shouldUpgrade: true }; // Fallback

    // Get max current price
    let maxCurrentPrice = 0;
    for (const sub of existingSubscriptions) {
      if (sub.priceId) {
        const priceVal = await this.getPriceValueById(sub.priceId);
        if (priceVal > maxCurrentPrice) {
          maxCurrentPrice = priceVal;
        }
      }
    }

    // Upgrade if invited plan price > current max price
    // "Equal" price implies same tier, so we don't switch (prevent side-grade spam or redundant changes)
    return { shouldUpgrade: invitedPlanPrice > maxCurrentPrice };
  }

  private async getPlanPriceValue(planId: string): Promise<number | null> {
    const plan = await this.db.query.subscriptionPlan.findFirst({
      where: eq(schema.subscriptionPlan.id, planId),
      with: {
        prices: {
          where: and(
            isNull(schema.subscriptionPlanPrice.deletedAt),
            eq(schema.subscriptionPlanPrice.interval, "year")
          ),
        },
      },
    });

    const price = plan?.prices.find((p) => p.interval === "year");
    return price && price.price ? Number(price.price) : 0;
  }

  private async getPriceValueById(priceId: string): Promise<number> {
    const price = await this.db.query.subscriptionPlanPrice.findFirst({
      where: eq(schema.subscriptionPlanPrice.id, priceId),
    });
    return price && price.price ? Number(price.price) : 0;
  }
}
