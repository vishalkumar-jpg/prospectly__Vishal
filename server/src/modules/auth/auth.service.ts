import {
  Injectable,
  UnauthorizedException,
  Logger,
  Optional,
  ConflictException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ProfilesService } from "modules/profiles/profiles.service";
import { ModuleAccessService } from "modules/module-access/module-access.service";
import { OrganizationLookupService } from "modules/profiles/completion/organization-lookup.service";
import { CryptoService } from "shared/crypto.service";
import { RefreshTokenService } from "services/refreshTokenService";
import { GoogleContactsQueueService } from "modules/contact-queue/google/google-contacts-queue.service";
import { MicrosoftContactsQueueService } from "modules/contact-queue/microsoft/microsoft-contacts-queue.service";
import { ContactsImportService } from "modules/contact-queue/contacts-import.service";
import { ContactsProviderTokensService } from "modules/contact-queue/contacts-provider-tokens.service";
import { CalendarService } from "modules/calendar/calendar.service";
import { OnboardingService } from "modules/onboarding/onboarding.service";
import { StripeQueueService } from "modules/stripe/stripe-queue/stripe-queue.service";
import { ConnectorOriginsService } from "modules/recruitment/connector-origins/connector-origins.service";
import { MarketplaceBrowseService } from "modules/global-marketplace/services/marketplace-browse.service";
import { ContactSourceStatusService } from "modules/contact-source-status/contact-source-status.service";
import { UserType } from "modules/profiles/profiles.constants";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import { normalizeImportAccountEmail } from "utils/contact-import-account.utils";
import { computeGettingStartedProgress } from "./auth-getting-started-progress.helper";
import {
  CreateNewGoogleContactsImport,
  CreateNewMicrosoftContactsImport,
  GenerateTokens,
  GettingStartedProgressDto,
  HandleCalendarConnection,
  HandleMicrosoftCalendarConnection,
  LoginGoogleUser,
  LoginMicrosoftUser,
  OriginContext,
} from "./auth.types";
import { AUTH_MESSAGES } from "./auth.constants";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly profilesService: ProfilesService,
    private readonly cryptoService: CryptoService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional()
    private readonly googleContactsQueueService: GoogleContactsQueueService,
    @Optional()
    private readonly microsoftContactsQueueService:
      | MicrosoftContactsQueueService
      | undefined,
    private readonly contactsImportService: ContactsImportService,
    private readonly contactsProviderTokensService: ContactsProviderTokensService,
    private readonly calendarService: CalendarService,
    @Optional()
    private readonly stripeQueueService: StripeQueueService,
    @Inject(forwardRef(() => OnboardingService))
    private readonly onboardingService: OnboardingService,
    private readonly connectorOriginsService: ConnectorOriginsService,
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly contactSourceStatusService: ContactSourceStatusService,
    @Inject(forwardRef(() => MarketplaceBrowseService))
    private readonly marketplaceBrowseService: MarketplaceBrowseService,
    private readonly moduleAccessService: ModuleAccessService,
    private readonly organizationLookupService: OrganizationLookupService
  ) {}

  private assertUserIsActive(user: { isActive?: boolean | null }): void {
    if (user.isActive !== true) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.USER_ACCOUNT_INACTIVE
      );
    }
  }

  private async assertUserIdIsActive(userId: string): Promise<void> {
    const [row] = await this.db
      .select({ isActive: schema.users.isActive })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!row || row.isActive !== true) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.USER_ACCOUNT_INACTIVE
      );
    }
  }

  /**
   * Validate that an OAuth signup carries a real public-page provenance.
   * Returns true iff the (jobId|requestId, sharerCode) pair resolves to a
   * real share row (jobs) or publicly-visible request. Without a valid
   * origin, new-user signup is blocked with REGISTRATION_REQUIRES_INVITE.
   */
  private async validatePublicSignupOrigin(
    origin: OriginContext | undefined
  ): Promise<boolean> {
    if (!origin) return false;
    if (origin.jobId && origin.sharerCode) {
      return this.connectorOriginsService.isValidJobShare(
        this.db,
        origin.jobId,
        origin.sharerCode
      );
    }
    if (origin.requestId && origin.sharerCode) {
      return this.marketplaceBrowseService.isValidPublicRequest(
        origin.requestId,
        origin.sharerCode
      );
    }
    if (origin.consentToken) {
      return this.isValidConsentToken(origin.consentToken);
    }
    return false;
  }

  /**
   * Validate a public consent JWT used to gate signup from /consent/:token.
   * Consent tokens are signed with `jwt.accessTokenSecret` (same as access
   * tokens), so the shape check is what disambiguates — a real consent
   * token always carries matchId + jobId + connectorUserId claims. Access
   * tokens use { userId, email, tokenType } and fail this check.
   */
  private async isValidConsentToken(token: string): Promise<boolean> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        matchId?: unknown;
        jobId?: unknown;
        connectorUserId?: unknown;
      }>(token, {
        secret: this.configService.get("jwt.accessTokenSecret"),
      });
      return (
        typeof payload?.matchId === "string" &&
        typeof payload?.jobId === "string" &&
        typeof payload?.connectorUserId === "string"
      );
    } catch {
      return false;
    }
  }

  /**
   * Login or register a user using Google account details.
   * If a profile with the given email does not exist, a new one is created
   * with a random password hash and email marked as verified.
   * For new users only, this will also setup Stripe customer, Google Calendar,
   * and Google Contacts import if the respective scopes are granted.
   */
  private async registerNewGoogleUser(
    googleUser: LoginGoogleUser,
    email: string
  ): Promise<{
    user: NonNullable<
      Awaited<ReturnType<ProfilesService["getProfileByEmail"]>>
    >;
    isNewUser: true;
  }> {
    const { originContext, googleTokens, calendarTokens } = googleUser;
    const isAllowed = await this.validatePublicSignupOrigin(originContext);
    if (!isAllowed) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.REGISTRATION_REQUIRES_INVITE
      );
    }

    const fullName =
      googleUser.fullName ||
      `${googleUser.firstName || ""} ${googleUser.lastName || ""}`.trim() ||
      undefined;

    const user = await this.profilesService.createProfile({
      email,
      firstName: googleUser.firstName || undefined,
      lastName: googleUser.lastName || undefined,
      fullName,
      profilePhotoUrl: googleUser.picture || undefined,
      type: UserType.USER,
    });

    if (
      originContext?.jobId &&
      originContext?.sharerCode &&
      originContext?.isConnectorSignup
    ) {
      await this.connectorOriginsService.createOriginIfNew(
        this.db,
        user.id,
        originContext.jobId,
        originContext.sharerCode
      );
    }

    await this.setupGoogleServicesForNewUser({
      userId: user.id,
      email,
      fullName,
      googleTokens,
      calendarTokens,
    });

    return { user, isNewUser: true };
  }

  private async applyExistingGoogleUserScopes(
    userId: string,
    email: string,
    googleUser: LoginGoogleUser
  ): Promise<void> {
    const { googleTokens, calendarTokens, googleContactsScopeGranted } =
      googleUser;

    if (googleTokens || calendarTokens) {
      await this.setupGoogleServicesForExistingUser({
        userId,
        email,
        googleTokens,
        calendarTokens,
      });
    }

    if (!googleContactsScopeGranted) {
      return;
    }

    try {
      await this.contactsProviderTokensService.backfillNullEmailForActiveProviderAccount(
        userId,
        "google",
        email
      );
    } catch (error) {
      this.logger.error(
        `Failed to backfill Google contacts token email for user ${userId}:`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  async loginWithGoogle(googleUser: LoginGoogleUser) {
    const { email } = googleUser;

    if (!email) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.GOOGLE_ACCOUNT_DOES_NOT_HAVE_A_VALID_EMAIL
      );
    }

    const existingUser = await this.profilesService.getProfileByEmail(email);
    let isNewUser = false;
    let user = existingUser;

    if (!user) {
      const registered = await this.registerNewGoogleUser(googleUser, email);
      user = registered.user;
      isNewUser = registered.isNewUser;
    } else {
      this.assertUserIsActive(user);
      await this.applyExistingGoogleUserScopes(user.id, email, googleUser);
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      email,
      recordLastLogin: true,
    });

    return {
      user,
      isNewUser,
      ...tokens,
    };
  }

  /**
   * Login or register a user using an invite token and Google account details.
   * This method handles the invite signup flow, token generation, and service setup.
   *
   * @param params - Object containing invite token, user info from Google, and OAuth tokens
   * @returns Auth result including user, tokens, and invite-specific parameters
   */
  async loginWithGoogleInvite(params: {
    token: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    picture?: string;
    googleTokens?: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
      scope?: string;
    };
    calendarTokens?: {
      accessToken: string;
      refreshToken?: string;
      expiryDate?: number;
      scope?: string;
    };
  }) {
    const {
      token,
      email,
      firstName,
      lastName,
      fullName,
      picture,
      googleTokens,
      calendarTokens,
    } = params;

    // Step 1: Validate that the Google account provides a valid email
    if (!email) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.GOOGLE_ACCOUNT_DOES_NOT_HAVE_A_VALID_EMAIL
      );
    }

    // Step 2: Delegate invite signup and service setup to OnboardingService
    // This process creates the user profile, sets up Stripe customer,
    // connects Google Calendar, and initiates Google Contacts import.
    const result = await this.onboardingService.handleInviteSignup(
      token,
      { email, firstName, lastName, fullName, picture },
      googleTokens,
      calendarTokens
    );

    // Step 3: Generate authentication tokens (Access, Refresh, CSRF) for the user
    const tokensRes = await this.generateTokens({
      userId: result.user.id,
      email: result.user.email,
      recordLastLogin: true,
    });

    // Step 4: Prepare metadata about the invite acceptance and subscription status
    // These parameters are used by the frontend to show appropriate success messages.
    const inviteAccepted = result.inviteAccepted !== false;
    const subscriptionCreated =
      result.subscriptionProvisioned ?? !!result.subscription;
    const emailMismatch =
      result.inviteRejectReason === "EMAIL_MISMATCH"
        ? "&email_mismatch=true"
        : "";
    const inviteParams = `invite_accepted=${inviteAccepted}&subscription_created=${subscriptionCreated}${emailMismatch}`;

    // Step 5: Return comprehensive auth result
    return {
      user: result.user,
      isNewUser: result.isNewUser,
      inviteParams,
      ...tokensRes,
    };
  }

  /**
   * Setup Google services for new users only
   * This includes: Stripe customer creation, Google Calendar connection, and Google Contacts import
   * @param userId - User ID
   * @param email - User's email address
   * @param fullName - User's full name
   * @param googleTokens - OAuth tokens for Google Contacts (optional)
   * @param calendarTokens - OAuth tokens for Google Calendar (optional)
   */
  async setupGoogleServicesForNewUser({
    userId,
    email,
    fullName,
    googleTokens,
    calendarTokens,
  }: {
    userId: string;
    email: string;
    fullName?: string;
    googleTokens?: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
      scope?: string;
    };
    calendarTokens?: {
      accessToken: string;
      refreshToken?: string;
      expiryDate?: number;
      scope?: string;
    };
  }): Promise<void> {
    // 1. Create Stripe customer (background job)
    this.createStripeCustomerBackground(userId, email, fullName);

    // 2. Connect Google Calendar (scope already checked in controller)
    if (calendarTokens?.accessToken) {
      await this.handleCalendarConnection({
        userId,
        tokens: {
          accessToken: calendarTokens.accessToken,
          refreshToken: calendarTokens.refreshToken,
          expiryDate: calendarTokens.expiryDate,
        },
        email,
      });
    }

    // 3. Import Google Contacts (scope already checked in controller)
    if (googleTokens) {
      await this.createNewGoogleContactsImport({
        userId,
        email,
        googleTokens,
        existingTokenRecordId: undefined, // New users won't have existing tokens
      });
    }
  }

  /**
   * Setup Google services for existing users who re-login with newly approved scopes
   * This handles calendar connection and contacts import for users who previously logged in without approving scopes
   * @param userId - User ID
   * @param email - User's email address
   * @param googleTokens - OAuth tokens for Google Contacts (optional)
   * @param calendarTokens - OAuth tokens for Google Calendar (optional)
   */
  private async connectGoogleCalendarForExistingUser(
    userId: string,
    email: string,
    calendarTokens: {
      accessToken: string;
      refreshToken?: string;
      expiryDate?: number;
      scope?: string;
    }
  ): Promise<void> {
    try {
      const activeIntegration =
        await this.calendarService.getActiveCalendarIntegration(userId);

      if (!activeIntegration) {
        await this.handleCalendarConnection({
          userId,
          tokens: {
            accessToken: calendarTokens.accessToken,
            refreshToken: calendarTokens.refreshToken,
            expiryDate: calendarTokens.expiryDate,
          },
          email,
        });
        this.logger.log(
          `Connected Google Calendar for existing user ${userId} after scope approval`
        );
        return;
      }

      if (activeIntegration.provider !== "google") {
        return;
      }

      await this.calendarService.connectCalendarFromTokens(
        userId,
        {
          accessToken: calendarTokens.accessToken,
          refreshToken: calendarTokens.refreshToken,
          expiryDate: calendarTokens.expiryDate,
        },
        email
      );
      this.logger.log(
        `Updated Google Calendar tokens for existing user ${userId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to setup calendar for existing user ${userId}:`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  private async importGoogleContactsForExistingUser(
    userId: string,
    email: string,
    googleTokens: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
      scope?: string;
    }
  ): Promise<void> {
    try {
      const tokenRecordId = await this.persistProviderTokens(
        userId,
        email,
        googleTokens,
        "google"
      );

      if (
        await this.shouldSkipContactsImport(userId, "google", tokenRecordId)
      ) {
        this.logger.log(
          `Google contacts tokens persisted for existing user ${userId}, skipping re-import`
        );
        return;
      }

      await this.createNewGoogleContactsImport({
        userId,
        email,
        googleTokens,
        existingTokenRecordId: tokenRecordId,
      });

      this.logger.log(
        `Updated Google contacts tokens and queued import for existing user ${userId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to setup contacts for existing user ${userId}:`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  async setupGoogleServicesForExistingUser({
    userId,
    email,
    googleTokens,
    calendarTokens,
  }: {
    userId: string;
    email: string;
    googleTokens?: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
      scope?: string;
    };
    calendarTokens?: {
      accessToken: string;
      refreshToken?: string;
      expiryDate?: number;
      scope?: string;
    };
  }): Promise<void> {
    if (calendarTokens?.accessToken) {
      await this.connectGoogleCalendarForExistingUser(
        userId,
        email,
        calendarTokens
      );
    }

    if (googleTokens) {
      await this.importGoogleContactsForExistingUser(
        userId,
        email,
        googleTokens
      );
    }
  }

  /**
   * Login or register a user using an invite token and Microsoft account details.
   * This method handles the invite signup flow, token generation, and service setup.
   *
   * @param params - Object containing invite token, user info from Microsoft, and OAuth tokens
   * @returns Auth result including user, tokens, and invite-specific parameters
   */
  async loginWithMicrosoftInvite(params: {
    token: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    picture?: string | null;
    microsoftTokens?: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
      scope?: string;
    };
    calendarTokens?: {
      accessToken: string;
      refreshToken?: string;
      expiryDate?: number;
      scope?: string;
    };
  }) {
    const {
      token,
      email,
      firstName,
      lastName,
      fullName,
      picture,
      microsoftTokens,
      calendarTokens,
    } = params;

    // Step 1: Validate that the Microsoft account provides a valid email
    if (!email) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.MICROSOFT_ACCOUNT_DOES_NOT_HAVE_A_VALID_EMAIL
      );
    }

    // Step 2: Delegate invite signup and service setup to OnboardingService
    const result = await this.onboardingService.handleInviteSignup(
      token,
      { email, firstName, lastName, fullName, picture: picture || undefined },
      undefined, // googleTokens
      calendarTokens,
      microsoftTokens // Passing as 4th arg if possible, or I'll need to update OnboardingService
    );

    // Step 3: Generate authentication tokens
    const tokensRes = await this.generateTokens({
      userId: result.user.id,
      email: result.user.email,
      recordLastLogin: true,
    });

    const inviteAccepted = result.inviteAccepted !== false;
    const subscriptionCreated =
      result.subscriptionProvisioned ?? !!result.subscription;
    const emailMismatch =
      result.inviteRejectReason === "EMAIL_MISMATCH"
        ? "&email_mismatch=true"
        : "";
    const inviteParams = `invite_accepted=${inviteAccepted}&subscription_created=${subscriptionCreated}${emailMismatch}`;

    return {
      user: result.user,
      isNewUser: result.isNewUser,
      inviteParams,
      ...tokensRes,
    };
  }
  /**
   * Login or register a user using Microsoft account details.
   * If a profile with the given email does not exist, a new one is created.
   * For new users only, this will also setup Stripe customer, Microsoft Calendar,
   * and Microsoft Contacts import if the respective scopes are granted.
   */
  async loginWithMicrosoft(microsoftUser: LoginMicrosoftUser) {
    const { email, microsoftTokens, calendarTokens, originContext } =
      microsoftUser;

    if (!email) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.MICROSOFT_ACCOUNT_DOES_NOT_HAVE_A_VALID_EMAIL
      );
    }

    let user = await this.profilesService.getProfileByEmail(email);
    let isNewUser = false;

    if (!user) {
      // Signup is gated on a verified public-page provenance: either the
      // public job page (jobId + sharerCode) or the public request page
      // (requestId + sharerCode). Everything else still requires an invite.
      const isAllowed = await this.validatePublicSignupOrigin(originContext);
      if (!isAllowed) {
        throw new UnauthorizedException(
          AUTH_MESSAGES.ERROR.REGISTRATION_REQUIRES_INVITE
        );
      }

      isNewUser = true;
      const fullName =
        microsoftUser.fullName ||
        `${microsoftUser.firstName || ""} ${microsoftUser.lastName || ""}`.trim() ||
        undefined;

      user = await this.profilesService.createProfile({
        email,
        firstName: microsoftUser.firstName || undefined,
        lastName: microsoftUser.lastName || undefined,
        fullName,
        profilePhotoUrl: microsoftUser.picture || undefined,
        type: UserType.USER,
      });

      // Record marketplace-split origin only for the "I Have a Candidate"
      // (connector) flow. See loginWithGoogle for the full rationale.
      // Best-effort — never fails signup.
      if (
        originContext?.jobId &&
        originContext?.sharerCode &&
        originContext?.isConnectorSignup
      ) {
        await this.connectorOriginsService.createOriginIfNew(
          this.db,
          user.id,
          originContext.jobId,
          originContext.sharerCode
        );
      }

      // Setup all Microsoft services for new users only
      await this.setupMicrosoftServicesForNewUser({
        userId: user.id,
        email,
        fullName,
        microsoftTokens,
        calendarTokens,
      });
    } else {
      this.assertUserIsActive(user);
      // For existing users, process newly approved scopes
      if (microsoftTokens || calendarTokens) {
        await this.setupMicrosoftServicesForExistingUser({
          userId: user.id,
          email,
          microsoftTokens,
          calendarTokens,
        });
      }
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      email,
      recordLastLogin: true,
    });

    return {
      user,
      isNewUser,
      ...tokens,
    };
  }

  /**
   * Setup Microsoft services for new users only
   * This includes: Stripe customer creation, Microsoft Calendar connection, and Microsoft Contacts import
   * @param userId - User ID
   * @param email - User's email address
   * @param fullName - User's full name
   * @param microsoftTokens - OAuth tokens for Microsoft Contacts (optional)
   * @param calendarTokens - OAuth tokens for Microsoft Calendar (optional)
   */
  async setupMicrosoftServicesForNewUser({
    userId,
    email,
    fullName,
    microsoftTokens,
    calendarTokens,
  }: {
    userId: string;
    email: string;
    fullName?: string;
    microsoftTokens?: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
      scope?: string;
    };
    calendarTokens?: {
      accessToken: string;
      refreshToken?: string;
      expiryDate?: number;
      scope?: string;
    };
  }): Promise<void> {
    // 1. Create Stripe customer (background job)
    this.createStripeCustomerBackground(userId, email, fullName);

    // 2. Connect Microsoft Calendar (scope already checked in controller)
    if (calendarTokens?.accessToken) {
      await this.handleMicrosoftCalendarConnection({
        userId,
        tokens: {
          accessToken: calendarTokens.accessToken,
          refreshToken: calendarTokens.refreshToken,
          expiryDate: calendarTokens.expiryDate,
        },
        email,
      });
    }

    // 3. Import Microsoft Contacts (scope already checked in controller)
    if (microsoftTokens) {
      await this.createNewMicrosoftContactsImport({
        userId,
        email,
        microsoftTokens,
        existingTokenRecordId: undefined, // New users won't have existing tokens
      });
    }
  }

  /**
   * Setup Microsoft services for existing users who re-login with newly approved scopes
   * This handles calendar connection and contacts import for users who previously logged in without approving scopes
   * @param userId - User ID
   * @param email - User's email address
   * @param microsoftTokens - OAuth tokens for Microsoft Contacts (optional)
   * @param calendarTokens - OAuth tokens for Microsoft Calendar (optional)
   */
  private async connectMicrosoftCalendarForExistingUser(
    userId: string,
    email: string,
    calendarTokens: {
      accessToken: string;
      refreshToken?: string;
      expiryDate?: number;
      scope?: string;
    }
  ): Promise<void> {
    try {
      const activeIntegration =
        await this.calendarService.getActiveCalendarIntegration(userId);

      if (!activeIntegration) {
        await this.handleMicrosoftCalendarConnection({
          userId,
          tokens: {
            accessToken: calendarTokens.accessToken,
            refreshToken: calendarTokens.refreshToken,
            expiryDate: calendarTokens.expiryDate,
          },
          email,
        });
        this.logger.log(
          `Connected Microsoft Calendar for existing user ${userId} after scope approval`
        );
        return;
      }

      if (activeIntegration.provider !== "microsoft") {
        return;
      }

      await this.calendarService.saveMicrosoftTokens(userId, {
        accessToken: calendarTokens.accessToken,
        refreshToken: calendarTokens.refreshToken,
        expiryDate: calendarTokens.expiryDate,
        email,
      });
      this.logger.log(
        `Updated Microsoft Calendar tokens for existing user ${userId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to setup calendar for existing user ${userId}:`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  private async importMicrosoftContactsForExistingUser(
    userId: string,
    email: string,
    microsoftTokens: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
      scope?: string;
    }
  ): Promise<void> {
    try {
      const tokenRecordId = await this.persistProviderTokens(
        userId,
        email,
        microsoftTokens,
        "microsoft"
      );

      if (
        await this.shouldSkipContactsImport(userId, "microsoft", tokenRecordId)
      ) {
        this.logger.log(
          `Microsoft contacts tokens persisted for existing user ${userId}, skipping re-import`
        );
        return;
      }

      await this.createNewMicrosoftContactsImport({
        userId,
        email,
        microsoftTokens,
        existingTokenRecordId: tokenRecordId,
      });

      this.logger.log(
        `Updated Microsoft contacts tokens and queued import for existing user ${userId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to setup contacts for existing user ${userId}:`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  async setupMicrosoftServicesForExistingUser({
    userId,
    email,
    microsoftTokens,
    calendarTokens,
  }: {
    userId: string;
    email: string;
    microsoftTokens?: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
      scope?: string;
    };
    calendarTokens?: {
      accessToken: string;
      refreshToken?: string;
      expiryDate?: number;
      scope?: string;
    };
  }): Promise<void> {
    if (calendarTokens?.accessToken) {
      await this.connectMicrosoftCalendarForExistingUser(
        userId,
        email,
        calendarTokens
      );
    }

    if (microsoftTokens) {
      await this.importMicrosoftContactsForExistingUser(
        userId,
        email,
        microsoftTokens
      );
    }
  }

  /**
   * Handle Microsoft Calendar connection during sign-in
   * Note: Calendar scope should be checked before calling this method
   *
   * Important: Only one calendar provider can be active at a time per user.
   * If the user already has an active calendar provider (e.g., Google),
   * we will NOT auto-connect Microsoft Calendar during sign-in to respect the
   * user's explicit choice.
   *
   * @param userId - User ID
   * @param tokens - OAuth tokens from Microsoft (accessToken is required)
   * @param email - User's email address
   */
  async handleMicrosoftCalendarConnection({
    userId,
    tokens,
    email,
  }: HandleMicrosoftCalendarConnection): Promise<void> {
    try {
      // Check if user already has any active calendar integration
      // Only one calendar provider can be active at a time. If another provider
      // (e.g., Google) is already active, we should not auto-connect Microsoft
      // during sign-in to respect the user's explicit choice.
      const activeIntegration =
        await this.calendarService.getActiveCalendarIntegration(userId);

      if (activeIntegration) {
        return;
      }

      // Check if user already has an active Microsoft Calendar integration
      const existingMicrosoftTokens =
        await this.calendarService.getMicrosoftTokens(userId);

      if (existingMicrosoftTokens) {
        return;
      }

      // No active calendar exists, proceed with auto-connection
      await this.calendarService.saveMicrosoftTokens(userId, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: tokens.expiryDate,
        email,
      });
    } catch (error) {
      this.logger.error(
        AUTH_MESSAGES.ERROR.FAILED_TO_CONNECT_MICROSOFT_CALENDAR(userId),
        error instanceof Error ? error.stack : error
      );
    }
  }

  /**
   * Persist provider tokens to contacts_provider_tokens (upsert by normalized login email).
   */
  private async persistProviderTokens(
    userId: string,
    email: string,
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiryDate?: number;
    },
    providerName: "google" | "microsoft"
  ): Promise<string> {
    const normalized = normalizeImportAccountEmail(email);
    if (!normalized) {
      throw new Error(
        `Cannot persist ${providerName} contacts tokens without login email`
      );
    }
    return this.contactsProviderTokensService.getOrCreateTokenRecord(
      userId,
      providerName,
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiryDate
          ? toUTC(tokens.expiryDate)
          : undefined,
        email: normalized,
        isPrimary: true,
      }
    );
  }

  /**
   * Skip re-import on login when this token row already has a completed import.
   */
  private async shouldSkipContactsImport(
    userId: string,
    provider: "google" | "microsoft",
    tokenRecordId: string
  ): Promise<boolean> {
    const latestImport =
      await this.contactsImportService.getLatestContactsImport(
        userId,
        provider,
        tokenRecordId
      );

    if (latestImport && latestImport.status === "completed") {
      return true;
    }

    return false;
  }

  /**
   * Create new Microsoft Contacts token record and queue import job
   * @param userId - User ID
   * @param email - User's email address
   * @param microsoftTokens - OAuth tokens from Microsoft
   */
  private async createNewMicrosoftContactsImport({
    userId,
    email,
    microsoftTokens,
    existingTokenRecordId,
  }: CreateNewMicrosoftContactsImport): Promise<void> {
    // Create token record in contacts_provider_tokens
    let tokenRecordId = existingTokenRecordId;

    if (!tokenRecordId) {
      tokenRecordId =
        await this.contactsProviderTokensService.getOrCreateTokenRecord(
          userId,
          "microsoft",
          {
            accessToken: microsoftTokens.accessToken,
            refreshToken: microsoftTokens.refreshToken,
            tokenExpiresAt: microsoftTokens.expiryDate
              ? toUTC(microsoftTokens.expiryDate)
              : undefined,
            email: normalizeImportAccountEmail(email) || email,
            isPrimary: true,
          }
        );
    }

    // Create contacts import record linked to token record
    let importRecordId: string;
    try {
      importRecordId = await this.contactsImportService.createContactsImport({
        userId,
        provider: "microsoft",
        tokenId: tokenRecordId,
        status: "pending",
        email,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        return;
      }
      throw error;
    }

    // Queue background import job using the import record ID
    try {
      if (!this.microsoftContactsQueueService) {
        throw new Error("Background jobs disabled - Redis not configured");
      }
      await this.microsoftContactsQueueService.queueImportJob(
        userId,
        importRecordId
      );
    } catch (error) {
      this.logger.error(
        AUTH_MESSAGES.ERROR.FAILED_TO_QUEUE_MICROSOFT_CONTACTS(userId, error),
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  async getCurrentUser(userId: string) {
    const user = await this.profilesService.getProfile(userId);

    if (!user) {
      throw new UnauthorizedException(AUTH_MESSAGES.ERROR.USER_NOT_FOUND);
    }

    this.assertUserIsActive(user);

    const [accessibleModules, hasOrganisation] = await Promise.all([
      this.moduleAccessService.getAccessibleModules(userId),
      this.organizationLookupService.hasMembership(userId),
    ]);

    return { ...user, accessibleModules, hasOrganisation };
  }

  async refreshTokens(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken, {
      secret: this.configService.get("jwt.refreshTokenSecret"),
      issuer: "prospectly",
    });

    if (payload.tokenType !== "refresh") {
      throw new UnauthorizedException(AUTH_MESSAGES.ERROR.INVALID_TOKEN_TYPE);
    }

    const isValid =
      await this.refreshTokenService.isRefreshTokenValid(refreshToken);

    if (!isValid) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.INVALID_REFRESH_TOKEN
      );
    }

    await this.assertUserIdIsActive(payload.userId);

    const tokens = await this.generateTokens({
      userId: payload.userId,
      email: payload.email,
    });

    await this.refreshTokenService.invalidateRefreshToken(refreshToken);

    return tokens;
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.refreshTokenService.invalidateRefreshToken(refreshToken);
    }
  }

  /**
   * Handle Google Calendar connection during sign-in
   * Note: Calendar scope should be checked before calling this method
   *
   * Important: Only one calendar provider can be active at a time per user.
   * If the user already has an active calendar provider (e.g., Microsoft),
   * we will NOT auto-connect Google Calendar during sign-in to respect the
   * user's explicit choice.
   *
   * @param userId - User ID
   * @param tokens - OAuth tokens from Google (accessToken is required)
   * @param email - User's email address
   */
  async handleCalendarConnection({
    userId,
    tokens,
    email,
  }: HandleCalendarConnection): Promise<void> {
    try {
      // Check if user already has any active calendar integration
      // Only one calendar provider can be active at a time. If another provider
      // (e.g., Microsoft) is already active, we should not auto-connect Google
      // during sign-in to respect the user's explicit choice.
      const activeIntegration =
        await this.calendarService.getActiveCalendarIntegration(userId);

      if (activeIntegration) {
        return;
      }

      // Check if user already has an active Google Calendar integration
      // (This check is redundant given the above, but kept for explicit clarity)
      const existingGoogleTokens =
        await this.calendarService.getGoogleTokens(userId);

      if (existingGoogleTokens) {
        return;
      }

      // No active calendar exists, proceed with auto-connection
      await this.calendarService.connectCalendarFromTokens(
        userId,
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiryDate: tokens.expiryDate,
        },
        email
      );

      this.logger.log(
        `Auto-connected Google Calendar for user ${userId} during sign-in`
      );
    } catch (error) {
      this.logger.error(
        AUTH_MESSAGES.ERROR.FAILED_TO_CONNECT_CALENDAR(userId),
        error instanceof Error ? error.stack : error
      );
    }
  }

  async generateTokens({ userId, email, recordLastLogin }: GenerateTokens) {
    await this.assertUserIdIsActive(userId);

    const accessToken = this.jwtService.sign(
      { userId, email, tokenType: "access" },
      {
        secret: this.configService.get("jwt.accessTokenSecret"),
        expiresIn: this.configService.get("jwt.accessTokenExpiry"),
        issuer: "prospectly",
      }
    );

    const refreshTokenExpiry = this.configService.get("jwt.refreshTokenExpiry");

    const refreshToken = this.jwtService.sign(
      { userId, email, tokenType: "refresh" },
      {
        secret: this.configService.get("jwt.refreshTokenSecret"),
        expiresIn: refreshTokenExpiry,
        issuer: "prospectly",
      }
    );

    // Derive the stored expiry from the token's own `exp` claim so the DB
    // record always matches the signed token's lifetime — single source of
    // truth, no drift if the configured expiry changes later.
    const { exp } = this.jwtService.decode(refreshToken) as { exp: number };
    const refreshTokenExpiresAt = toUTC(exp * 1000);

    await this.refreshTokenService.storeRefreshToken(
      refreshToken,
      userId,
      refreshTokenExpiresAt
    );

    if (recordLastLogin) {
      try {
        await this.profilesService.recordLastLoginAt(userId);
      } catch (error) {
        this.logger.error(`AUTH_SERVICE :: generateTokens : ERROR : ${error}`);
      }
    }

    const csrfToken = this.cryptoService.generateCSRFToken();

    return { accessToken, refreshToken, csrfToken };
  }

  /**
   * Create new Google Contacts token record and queue import job
   * @param userId - User ID
   * @param email - User's email address
   * @param googleTokens - OAuth tokens from Google
   */
  private async createNewGoogleContactsImport({
    userId,
    email,
    googleTokens,
    existingTokenRecordId,
  }: CreateNewGoogleContactsImport): Promise<void> {
    // Create token record in contacts_provider_tokens
    let tokenRecordId = existingTokenRecordId;

    if (!tokenRecordId) {
      tokenRecordId =
        await this.contactsProviderTokensService.getOrCreateTokenRecord(
          userId,
          "google",
          {
            accessToken: googleTokens.accessToken,
            refreshToken: googleTokens.refreshToken,
            tokenExpiresAt: googleTokens.expiryDate
              ? toUTC(googleTokens.expiryDate)
              : undefined,
            email: normalizeImportAccountEmail(email) || email,
            isPrimary: true,
          }
        );
    }

    // Create contacts import record linked to token record
    let importRecordId: string;
    try {
      importRecordId = await this.contactsImportService.createContactsImport({
        userId,
        provider: "google",
        tokenId: tokenRecordId,
        status: "pending",
        email,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.log(
          `Google Contacts import already in progress for user ${userId}, skipping new import creation.`
        );
        return;
      }
      throw error;
    }

    // Queue background import job using the import record ID
    try {
      if (!this.googleContactsQueueService) {
        throw new Error("Background jobs disabled - Redis not configured");
      }
      await this.googleContactsQueueService.queueImportJob(
        userId,
        importRecordId
      );
    } catch (error) {
      this.logger.error(
        AUTH_MESSAGES.ERROR.FAILED_TO_QUEUE_GOOGLE_CONTACTS(userId, error),
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  private async createStripeCustomerBackground(
    userId: string,
    email: string,
    fullName?: string
  ) {
    try {
      if (!this.stripeQueueService) {
        this.logger.warn(
          "Background jobs disabled - Redis not configured. Skipping Stripe customer creation queue."
        );
        return;
      }
      await this.stripeQueueService.queueCreateCustomer(
        userId,
        email,
        fullName
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue Stripe customer creation for user ${userId}: ${error}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Update user's profile photo URL (used after uploading to S3)
   */
  async updateUserProfilePhoto(
    userId: string,
    profilePhotoUrl: string
  ): Promise<void> {
    await this.profilesService.updateProfile(userId, {
      profilePhotoUrl,
    });
    this.logger.log(`AUTH_SERVICE :: Updated profile photo for user ${userId}`);
  }

  async getGettingStartedProgress(
    userId: string
  ): Promise<GettingStartedProgressDto> {
    const hasRecruitingAccess = await this.moduleAccessService.hasModuleAccess(
      userId,
      "recruiting"
    );
    return computeGettingStartedProgress(userId, {
      db: this.db,
      contactsImportService: this.contactsImportService,
      contactSourceStatusService: this.contactSourceStatusService,
      hasRecruitingAccess,
    });
  }
}
