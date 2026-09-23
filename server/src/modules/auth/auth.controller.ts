import {
  Controller,
  Post,
  Get,
  Res,
  Req,
  UseGuards,
  Inject,
  Query,
  Logger,
  UnauthorizedException,
  HttpException,
  Optional,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "decorators/public.decorator";
import { CurrentUser } from "decorators/current-user.decorator";
import { google } from "googleapis";
import { setAuthCookies, clearAuthCookies, generateNonce } from "utils/auth";
import { toUTC } from "utils/dayjs";
import { normalizeImportAccountEmail } from "utils/contact-import-account.utils";
import { getGoogleUserEmailFromOAuthTokens } from "utils/google-oauth-user-email.utils";
import { oauthConfig } from "config/oauth.config";
import { appConfig } from "config/app.config";
import { ContactsProviderTokensService } from "modules/contact-queue/contacts-provider-tokens.service";
import { ContactsImportService } from "modules/contact-queue/contacts-import.service";
import { GoogleContactsQueueService } from "modules/contact-queue/google/google-contacts-queue.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import responseUtils from "utils/response.utils";
import { ApiSwaggerResponse } from "modules/swagger/swagger.decorator";
import { MessageResponse } from "modules/swagger/dtos/response.dtos";
import { Response, Request } from "express";
import { S3Service } from "shared/s3.service";
import { CONTACTS_MESSAGES } from "modules/contacts/contacts.constants";
import { ApiTagsEnum } from "constants/api-tags.constants";
import {
  AUTH_MESSAGES,
  OAUTH_REDIRECT_SAFE_ERROR_MESSAGES,
} from "./auth.constants";
import { AuthService } from "./auth.service";
import { AuthClaimFlowService } from "./auth-claim-flow.service";
import { OriginContext } from "./auth.types";
import { OnboardingService } from "../onboarding/onboarding.service";

type DecodedOAuthState = {
  csrf: string;
  invite_token: string | undefined;
  returnTo: string | undefined;
  originJobId: string | undefined;
  originRequestId: string | undefined;
  originRef: string | undefined;
  connectorSignup: string | undefined;
  consentToken: string | undefined;
};

type OAuthCallbackAuthResult = {
  user: AnyType;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  isNewUser?: boolean;
  _claimFlowInfo?: {
    isClaimFlow: boolean;
    skipClaimRedirect: string | null;
    returnTo: string | null;
  };
};

type ProviderOAuthTokenBundle = {
  googleTokens?: {
    accessToken: string;
    refreshToken: string;
    expiryDate?: number;
    scope?: string;
  };
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
  hasContactsScope: boolean;
};

const OAUTH_STATE_OPTIONAL_STRING_KEYS = [
  "invite_token",
  "returnTo",
  "originJobId",
  "originRequestId",
  "originRef",
  "connectorSignup",
  "consentToken",
] as const;

const INVALID_OAUTH_STATE = () =>
  new UnauthorizedException(AUTH_MESSAGES.ERROR.INVALID_STATE_OR_CSRF_TOKEN);

function optionalOAuthStateString(
  stateData: Record<string, unknown>,
  key: (typeof OAUTH_STATE_OPTIONAL_STRING_KEYS)[number]
): string | undefined {
  const value = stateData[key];
  return value === undefined ? undefined : (value as string);
}

function assertOAuthStateOptionalStrings(
  stateData: Record<string, unknown>
): void {
  for (const key of OAUTH_STATE_OPTIONAL_STRING_KEYS) {
    const value = stateData[key];
    if (value !== undefined && typeof value !== "string") {
      throw INVALID_OAUTH_STATE();
    }
  }
}

function decodeOAuthStateFromEncoded(encoded: string): DecodedOAuthState {
  try {
    const json = Buffer.from(encoded, "base64").toString("utf8");
    const stateData = JSON.parse(json) as Record<string, unknown>;

    if (typeof stateData?.csrf !== "string") {
      throw INVALID_OAUTH_STATE();
    }

    assertOAuthStateOptionalStrings(stateData);

    return {
      csrf: stateData.csrf as string,
      invite_token: optionalOAuthStateString(stateData, "invite_token"),
      returnTo: optionalOAuthStateString(stateData, "returnTo"),
      originJobId: optionalOAuthStateString(stateData, "originJobId"),
      originRequestId: optionalOAuthStateString(stateData, "originRequestId"),
      originRef: optionalOAuthStateString(stateData, "originRef"),
      connectorSignup: optionalOAuthStateString(stateData, "connectorSignup"),
      consentToken: optionalOAuthStateString(stateData, "consentToken"),
    };
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    throw INVALID_OAUTH_STATE();
  }
}

function buildOriginContextFromOAuthState(
  stateData: DecodedOAuthState
): OriginContext | undefined {
  const {
    originRef,
    originJobId,
    originRequestId,
    consentToken,
    connectorSignup,
  } = stateData;

  if (originRef && originJobId) {
    return {
      jobId: originJobId,
      sharerCode: originRef,
      isConnectorSignup: connectorSignup === "true",
    };
  }

  if (originRef && originRequestId) {
    return { requestId: originRequestId, sharerCode: originRef };
  }

  if (consentToken) {
    return { consentToken };
  }

  return undefined;
}

function extractGoogleProviderTokens(tokens: {
  scope?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}): ProviderOAuthTokenBundle {
  const hasContactsScope =
    tokens.scope?.includes(oauthConfig.google.contactsScopes[0]) || false;
  const hasCalendarScope =
    tokens.scope?.includes(
      "https://www.googleapis.com/auth/calendar.readonly"
    ) ||
    tokens.scope?.includes("https://www.googleapis.com/auth/calendar.events") ||
    false;

  const googleTokens =
    hasContactsScope && tokens.refresh_token
      ? {
          accessToken: tokens.access_token || "",
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date || undefined,
          scope: tokens.scope || undefined,
        }
      : undefined;

  const calendarTokens =
    hasCalendarScope && tokens.access_token && tokens.refresh_token
      ? {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date || undefined,
          scope: tokens.scope || undefined,
        }
      : undefined;

  return { googleTokens, calendarTokens, hasContactsScope };
}

function extractMicrosoftProviderTokens(
  tokens: {
    scope?: string;
    access_token?: string;
    refresh_token?: string;
  },
  expiryDate?: number
): ProviderOAuthTokenBundle {
  const hasContactsScope = tokens.scope?.includes("Contacts.Read") || false;
  const hasCalendarScope =
    tokens.scope?.includes("Calendars.ReadWrite") ||
    tokens.scope?.includes("Calendars.Read") ||
    false;

  const microsoftTokens =
    hasContactsScope && tokens.refresh_token
      ? {
          accessToken: tokens.access_token || "",
          refreshToken: tokens.refresh_token,
          expiryDate,
          scope: tokens.scope || undefined,
        }
      : undefined;

  const calendarTokens =
    hasCalendarScope && tokens.access_token && tokens.refresh_token
      ? {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate,
          scope: tokens.scope || undefined,
        }
      : undefined;

  return { microsoftTokens, calendarTokens, hasContactsScope };
}

@ApiTags(ApiTagsEnum.Auth)
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(AuthService)
    private authService: AuthService,
    @Inject(ContactsProviderTokensService)
    private contactsProviderTokensService: ContactsProviderTokensService,
    @Inject(ContactsImportService)
    private contactsImportService: ContactsImportService,
    @Optional()
    @Inject(GoogleContactsQueueService)
    private googleContactsQueueService: GoogleContactsQueueService | null,
    @Inject(OnboardingService)
    private onboardingService: OnboardingService,
    @Optional()
    @Inject(S3Service)
    private s3Service: S3Service | null,
    @Optional()
    @Inject(AuthClaimFlowService)
    private authClaimFlowService: AuthClaimFlowService | null,
    @Inject(ProfilesService)
    private profilesService: ProfilesService
  ) {}

  /**
   * Validate returnTo parameter to prevent open redirect attacks
   * Only allows paths that start with / and don't start with // (protocol-relative URLs)
   */
  private isValidReturnTo(returnTo: string): boolean {
    // Only allow paths, not full URLs or protocol-relative URLs
    if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
      return false;
    }
    // Prevent URLs with embedded credentials or other schemes
    if (returnTo.includes("://") || returnTo.includes("@")) {
      return false;
    }
    // Allow only specific known routes for security
    const allowedPrefixes = [
      "/verify-connection",
      "/dashboard",
      "/accept-invite",
      "/getting-started",
      "/recruiting",
      "/prospecting",
    ];
    return allowedPrefixes.some((prefix) => returnTo.startsWith(prefix));
  }

  private redirectToSignInWithError(
    res: Response,
    message: string,
    title?: string,
    popup?: boolean
  ): void {
    const params = new URLSearchParams({ error: message });
    if (title) params.set("error_title", title);
    if (popup) params.set("popup", "1");
    res.redirect(`${appConfig.frontendUrl}/signin?${params.toString()}`);
  }

  private handleOAuthProviderError(
    req: Request,
    res: Response,
    error: string | undefined,
    popup?: boolean
  ): boolean {
    if (!error) {
      return false;
    }

    const errorDescription = req.query.error_description;
    this.logger.warn(
      `AUTH_CONTROLLER :: OAUTH_PROVIDER_ERROR : error=${error}${
        typeof errorDescription === "string"
          ? ` : description=${errorDescription}`
          : ""
      }`
    );

    const message =
      error === "access_denied"
        ? AUTH_MESSAGES.ERROR.OAUTH_ACCESS_DENIED
        : AUTH_MESSAGES.ERROR.OAUTH_PROVIDER_ERROR;

    this.redirectToSignInWithError(res, message, "Sign-in cancelled", popup);
    return true;
  }

  private getOAuthRedirectErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      let message: string | undefined;

      if (typeof response === "string") {
        message = response;
      } else if (
        typeof response === "object" &&
        response !== null &&
        "message" in response
      ) {
        const rawMessage = (response as { message?: string | string[] })
          .message;
        if (typeof rawMessage === "string") {
          message = rawMessage;
        } else if (Array.isArray(rawMessage) && rawMessage[0]) {
          message = rawMessage[0];
        }
      }

      if (message && OAUTH_REDIRECT_SAFE_ERROR_MESSAGES.has(message)) {
        return message;
      }
    }
    return AUTH_MESSAGES.ERROR.OAUTH_PROVIDER_ERROR;
  }

  private redirectOAuthCallbackError(
    res: Response,
    error: unknown,
    popup?: boolean
  ): void {
    if (error instanceof Error) {
      this.logger.error(
        `AUTH_CONTROLLER :: OAUTH_CALLBACK_ERROR : ${error.message}`,
        error.stack
      );
    }

    this.redirectToSignInWithError(
      res,
      this.getOAuthRedirectErrorMessage(error),
      "Sign-in Error",
      popup
    );
  }

  /** Same JSON payload as was stored in Redis, Base64-encoded for the OAuth `state` param. */
  private encodeOAuthState(params: {
    csrf: string;
    invite_token: string | undefined;
    returnTo: string | undefined;
    originJobId?: string;
    originRequestId?: string;
    originRef?: string;
    connectorSignup?: string;
    consentToken?: string;
  }): string {
    const stateData: Record<string, string> = {
      csrf: params.csrf,
    };
    if (params.invite_token !== undefined) {
      stateData.invite_token = params.invite_token;
    }
    if (params.returnTo !== undefined) {
      stateData.returnTo = params.returnTo;
    }
    // Public-page signup origin: either job-page or request-page provenance.
    // Both share `originRef` (the sharer code); only carry the matching id.
    // `connectorSignup` flags the "I Have a Candidate" flow specifically —
    // it gates whether a marketplace-split origin row is written at signup.
    if (params.originRef !== undefined) {
      if (params.originJobId !== undefined) {
        stateData.originJobId = params.originJobId;
        stateData.originRef = params.originRef;
        if (params.connectorSignup === "true") {
          stateData.connectorSignup = "true";
        }
      } else if (params.originRequestId !== undefined) {
        stateData.originRequestId = params.originRequestId;
        stateData.originRef = params.originRef;
      }
    }
    // Public consent-page signup: the JWT itself is the validation token
    // (signature + expiry verified at signup time).
    if (params.consentToken !== undefined) {
      stateData.consentToken = params.consentToken;
    }
    return Buffer.from(JSON.stringify(stateData), "utf8").toString("base64");
  }

  private decodeOAuthState(encoded: string): DecodedOAuthState {
    return decodeOAuthStateFromEncoded(encoded);
  }

  private tryDecodeOAuthStateForCallback(
    state: string | undefined,
    res: Response,
    popup?: boolean
  ): DecodedOAuthState | null {
    if (!state) {
      this.redirectToSignInWithError(
        res,
        AUTH_MESSAGES.ERROR.OAUTH_SESSION_EXPIRED_MESSAGE,
        AUTH_MESSAGES.ERROR.OAUTH_SESSION_EXPIRED_TITLE,
        popup
      );
      return null;
    }

    try {
      return this.decodeOAuthState(state);
    } catch (decodeError) {
      if (decodeError instanceof UnauthorizedException) {
        this.redirectToSignInWithError(
          res,
          AUTH_MESSAGES.ERROR.OAUTH_SESSION_EXPIRED_MESSAGE,
          AUTH_MESSAGES.ERROR.OAUTH_SESSION_EXPIRED_TITLE,
          popup
        );
        return null;
      }
      throw decodeError;
    }
  }

  private validateOAuthCsrfForCallback(
    req: Request,
    res: Response,
    returnedCsrf: string,
    popup?: boolean
  ): boolean {
    const storedNonce = req.cookies?.[appConfig.cookieNames.oauthNonce];
    res.clearCookie(appConfig.cookieNames.oauthNonce, {
      path: "/",
      domain: appConfig.cookieDomain,
    });

    if (!returnedCsrf || returnedCsrf !== storedNonce) {
      this.redirectToSignInWithError(
        res,
        AUTH_MESSAGES.ERROR.OAUTH_SESSION_EXPIRED_MESSAGE,
        AUTH_MESSAGES.ERROR.OAUTH_SESSION_EXPIRED_TITLE,
        popup
      );
      return false;
    }

    return true;
  }

  private async fetchGoogleOAuthProfile(code: string): Promise<{
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    picture: string | null;
    tokens: {
      scope?: string | null;
      access_token?: string | null;
      refresh_token?: string | null;
      expiry_date?: number | null;
      id_token?: string | null;
    };
  }> {
    const { clientId, clientSecret, redirectUri } = oauthConfig.google;

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.GOOGLE_OAUTH_NOT_CONFIGURED
      );
    }

    if (!code) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.MISSING_AUTHORIZATION_CODE
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.id_token) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.NO_ID_TOKEN_RECEIVED_FROM_GOOGLE
      );
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });

    const payload = ticket.getPayload();

    return {
      email: payload?.email || null,
      firstName: (payload?.given_name as string | undefined) || null,
      lastName: (payload?.family_name as string | undefined) || null,
      fullName: (payload?.name as string | undefined) || null,
      picture: (payload?.picture as string | undefined) || null,
      tokens,
    };
  }

  private async runGoogleInviteAuth(params: {
    token: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    picture: string | null;
    providerTokens: ProviderOAuthTokenBundle;
  }): Promise<{ authResult: OAuthCallbackAuthResult; inviteParams: string }> {
    const result = await this.authService.loginWithGoogleInvite({
      token: params.token,
      email: params.email,
      firstName: params.firstName || undefined,
      lastName: params.lastName || undefined,
      fullName: params.fullName || undefined,
      picture: params.picture || undefined,
      googleTokens: params.providerTokens.googleTokens,
      calendarTokens: params.providerTokens.calendarTokens,
    });

    return { authResult: result, inviteParams: result.inviteParams };
  }

  private async runGoogleRegularAuth(params: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    picture: string | null;
    providerTokens: ProviderOAuthTokenBundle;
    stateData: DecodedOAuthState;
    res: Response;
  }): Promise<OAuthCallbackAuthResult | null> {
    const { returnTo } = params.stateData;
    const { isClaimFlow, skipClaimRedirect } = this.authClaimFlowService
      ? await this.authClaimFlowService.checkClaimFlowEligibility(
          params.email || "",
          returnTo
        )
      : { isClaimFlow: false, skipClaimRedirect: null };

    try {
      const result = await this.authService.loginWithGoogle({
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        fullName: params.fullName,
        picture: params.picture,
        googleTokens: params.providerTokens.googleTokens,
        calendarTokens: params.providerTokens.calendarTokens,
        googleContactsScopeGranted: params.providerTokens.hasContactsScope,
        originContext: buildOriginContextFromOAuthState(params.stateData),
      });

      return {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        csrfToken: result.csrfToken,
        isNewUser: result.isNewUser || false,
        _claimFlowInfo: { isClaimFlow, skipClaimRedirect, returnTo },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException &&
        error.message.includes(AUTH_MESSAGES.ERROR.REGISTRATION_REQUIRES_INVITE)
      ) {
        params.res.redirect(
          `${appConfig.frontendUrl}/signin?error=${encodeURIComponent(AUTH_MESSAGES.ERROR.REGISTRATION_REQUIRES_INVITE)}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`
        );
        return null;
      }
      throw error;
    }
  }

  private async resolveGoogleOAuthAuth(params: {
    inviteToken: string | undefined;
    stateData: DecodedOAuthState;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    picture: string | null;
    providerTokens: ProviderOAuthTokenBundle;
    res: Response;
  }): Promise<{
    authResult: OAuthCallbackAuthResult;
    inviteParams: string;
    token: string | undefined;
  } | null> {
    const token = params.inviteToken || params.stateData.invite_token;

    if (token) {
      try {
        const outcome = await this.runGoogleInviteAuth({
          token,
          email: params.email,
          firstName: params.firstName,
          lastName: params.lastName,
          fullName: params.fullName,
          picture: params.picture,
          providerTokens: params.providerTokens,
        });
        return { ...outcome, token };
      } catch (error) {
        this.logger.error(
          `AUTH_CONTROLLER :: INVITE_SIGNUP : ERROR : ${error}`
        );
        params.res.redirect(
          `${appConfig.frontendUrl}/accept-invite/${token}?error=${encodeURIComponent(error instanceof Error ? error.message : "Invite acceptance failed")}`
        );
        return null;
      }
    }

    const authResult = await this.runGoogleRegularAuth({
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      fullName: params.fullName,
      picture: params.picture,
      providerTokens: params.providerTokens,
      stateData: params.stateData,
      res: params.res,
    });

    if (!authResult) {
      return null;
    }

    return { authResult, inviteParams: "", token: undefined };
  }

  private async buildOAuthPostLoginRedirect(params: {
    inviteParams: string;
    token: string | undefined;
    stateReturnTo: string | undefined;
    authResult: OAuthCallbackAuthResult;
    defaultPath: string;
    inviteDashboardWithPopup?: boolean;
    appendPopupToFinalUrl?: boolean;
  }): Promise<string> {
    const claimFlowInfo = params.authResult._claimFlowInfo;
    let redirectBase: string;

    if (params.inviteParams && params.token) {
      redirectBase = params.inviteDashboardWithPopup
        ? `${appConfig.frontendUrl}/dashboard?popup=1`
        : `${appConfig.frontendUrl}/dashboard`;
    } else if (claimFlowInfo?.skipClaimRedirect) {
      redirectBase = claimFlowInfo.skipClaimRedirect;
    } else if (claimFlowInfo?.isClaimFlow && params.authResult.isNewUser) {
      if (this.authClaimFlowService) {
        await this.authClaimFlowService.createClaimForNewUser(
          params.authResult.user.id,
          claimFlowInfo.returnTo
        );
      }
      redirectBase = `${appConfig.frontendUrl}${claimFlowInfo.returnTo}`;
    } else if (
      params.stateReturnTo &&
      this.isValidReturnTo(params.stateReturnTo)
    ) {
      redirectBase = `${appConfig.frontendUrl}${params.stateReturnTo}`;
    } else {
      redirectBase = `${appConfig.frontendUrl}${params.defaultPath}`;
    }

    const withInvite = params.inviteParams
      ? `${redirectBase}${redirectBase.includes("?") ? "&" : "?"}${params.inviteParams}`
      : redirectBase;

    if (!params.appendPopupToFinalUrl) {
      return withInvite;
    }

    return withInvite.includes("?")
      ? `${withInvite}&popup=1`
      : `${withInvite}?popup=1`;
  }

  private async exchangeMicrosoftOAuthTokens(code: string): Promise<{
    tokens: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    expiryDate?: number;
  }> {
    const { clientId, clientSecret, redirectUri, loginScopes } =
      oauthConfig.microsoft;

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.MICROSOFT_OAUTH_NOT_CONFIGURED
      );
    }

    if (!code) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.MISSING_AUTHORIZATION_CODE
      );
    }

    const tokenResponse = await fetch(oauthConfig.microsoft.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: loginScopes.join(" "),
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      this.logger.error(
        `AUTH_CONTROLLER :: MICROSOFT_CALLBACK : Token exchange failed: ${errorText}`
      );
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.FAILED_TO_EXCHANGE_MICROSOFT_CODE
      );
    }

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.NO_ACCESS_TOKEN_RECEIVED_FROM_MICROSOFT
      );
    }

    const expiryDate = tokens.expires_in
      ? toUTC().valueOf() + tokens.expires_in * 1000
      : undefined;

    return { tokens, expiryDate };
  }

  private async fetchMicrosoftUserProfile(accessToken: string): Promise<{
    email: string;
    givenName: string | null;
    surname: string | null;
    displayName: string | null;
    profilePhotoBuffer: Buffer | null;
    profilePhotoMimeType: string;
  }> {
    const userResponse = await fetch(
      `${oauthConfig.microsoft.graphApiBaseUrl}/me`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      this.logger.error(
        `AUTH_CONTROLLER :: MICROSOFT_CALLBACK : Failed to fetch user profile: ${errorText}`
      );
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.FAILED_TO_FETCH_MICROSOFT_USER_PROFILE
      );
    }

    const userData = await userResponse.json();
    const email = userData.mail || userData.userPrincipalName || null;

    if (!email) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.MICROSOFT_ACCOUNT_DOES_NOT_HAVE_A_VALID_EMAIL
      );
    }

    let profilePhotoBuffer: Buffer | null = null;
    let profilePhotoMimeType = "image/jpeg";

    try {
      const photoResponse = await fetch(
        `${oauthConfig.microsoft.graphApiBaseUrl}/me/photo/$value`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (photoResponse.ok) {
        const photoArrayBuffer = await photoResponse.arrayBuffer();
        profilePhotoBuffer = Buffer.from(photoArrayBuffer);
        profilePhotoMimeType =
          photoResponse.headers.get("content-type") || "image/jpeg";
      }
    } catch (photoError) {
      this.logger.warn(
        `AUTH_CONTROLLER :: MICROSOFT_CALLBACK : Failed to fetch profile photo: ${photoError}`
      );
    }

    return {
      email,
      givenName: userData.givenName || null,
      surname: userData.surname || null,
      displayName: userData.displayName || null,
      profilePhotoBuffer,
      profilePhotoMimeType,
    };
  }

  private async runMicrosoftInviteAuth(params: {
    token: string;
    email: string;
    givenName: string | null;
    surname: string | null;
    displayName: string | null;
    providerTokens: ProviderOAuthTokenBundle;
  }): Promise<{ authResult: OAuthCallbackAuthResult; inviteParams: string }> {
    const result = await this.authService.loginWithMicrosoftInvite({
      token: params.token,
      email: params.email,
      firstName: params.givenName,
      lastName: params.surname,
      fullName: params.displayName,
      picture: null,
      microsoftTokens: params.providerTokens.microsoftTokens,
      calendarTokens: params.providerTokens.calendarTokens,
    });

    return { authResult: result, inviteParams: result.inviteParams };
  }

  private async runMicrosoftRegularAuth(params: {
    email: string;
    givenName: string | null;
    surname: string | null;
    displayName: string | null;
    providerTokens: ProviderOAuthTokenBundle;
    stateData: DecodedOAuthState;
    res: Response;
  }): Promise<OAuthCallbackAuthResult | null> {
    const { returnTo } = params.stateData;
    const { isClaimFlow, skipClaimRedirect } = this.authClaimFlowService
      ? await this.authClaimFlowService.checkClaimFlowEligibility(
          params.email,
          returnTo
        )
      : { isClaimFlow: false, skipClaimRedirect: null };

    try {
      const result = await this.authService.loginWithMicrosoft({
        email: params.email,
        firstName: params.givenName,
        lastName: params.surname,
        fullName: params.displayName,
        picture: null,
        microsoftTokens: params.providerTokens.microsoftTokens,
        calendarTokens: params.providerTokens.calendarTokens,
        originContext: buildOriginContextFromOAuthState(params.stateData),
      });

      return {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        csrfToken: result.csrfToken,
        isNewUser: result.isNewUser || false,
        _claimFlowInfo: { isClaimFlow, skipClaimRedirect, returnTo },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException &&
        error.message.includes(AUTH_MESSAGES.ERROR.REGISTRATION_REQUIRES_INVITE)
      ) {
        params.res.redirect(
          `${appConfig.frontendUrl}/signin?error=${encodeURIComponent(AUTH_MESSAGES.ERROR.REGISTRATION_REQUIRES_INVITE)}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`
        );
        return null;
      }
      throw error;
    }
  }

  private async resolveMicrosoftOAuthAuth(params: {
    stateData: DecodedOAuthState;
    email: string;
    givenName: string | null;
    surname: string | null;
    displayName: string | null;
    providerTokens: ProviderOAuthTokenBundle;
    res: Response;
  }): Promise<{
    authResult: OAuthCallbackAuthResult;
    inviteParams: string;
    token: string | undefined;
  } | null> {
    const token = params.stateData.invite_token;

    if (token) {
      try {
        const outcome = await this.runMicrosoftInviteAuth({
          token,
          email: params.email,
          givenName: params.givenName,
          surname: params.surname,
          displayName: params.displayName,
          providerTokens: params.providerTokens,
        });
        return { ...outcome, token };
      } catch (error) {
        this.logger.error(
          `AUTH_CONTROLLER :: MICROSOFT_INVITE_SIGNUP : ERROR : ${error}`
        );
        params.res.redirect(
          `${appConfig.frontendUrl}/accept-invite/${token}?popup=1&error=${encodeURIComponent(error instanceof Error ? error.message : "Invite acceptance failed")}`
        );
        return null;
      }
    }

    const authResult = await this.runMicrosoftRegularAuth({
      email: params.email,
      givenName: params.givenName,
      surname: params.surname,
      displayName: params.displayName,
      providerTokens: params.providerTokens,
      stateData: params.stateData,
      res: params.res,
    });

    if (!authResult) {
      return null;
    }

    return { authResult, inviteParams: "", token: undefined };
  }

  private async uploadMicrosoftProfilePhotoIfAvailable(
    authResult: OAuthCallbackAuthResult,
    profilePhotoBuffer: Buffer | null,
    profilePhotoMimeType: string
  ): Promise<void> {
    if (!profilePhotoBuffer || !this.s3Service?.isS3Available()) {
      return;
    }

    try {
      const s3Key = await this.s3Service.uploadProfilePhotoFromBuffer(
        authResult.user.id,
        profilePhotoBuffer,
        profilePhotoMimeType
      );
      await this.authService.updateUserProfilePhoto(authResult.user.id, s3Key);
      this.logger.log(
        `AUTH_CONTROLLER :: MICROSOFT_CALLBACK : Profile photo uploaded to S3 for user ${authResult.user.id}`
      );
    } catch (s3Error) {
      this.logger.warn(
        `AUTH_CONTROLLER :: MICROSOFT_CALLBACK : Failed to upload profile photo to S3: ${s3Error}`
      );
    }
  }

  private redirectGoogleContactsCallback(
    response: Response,
    query: string
  ): void {
    response.redirect(
      `${appConfig.frontendUrl}/auth/google-contacts/callback?popup=1&${query}`
    );
  }

  private async persistGoogleContactsFallbackToken(
    userId: string,
    tokens: {
      access_token?: string | null;
      refresh_token?: string | null;
      expiry_date?: number | null;
    },
    normalizedEmail: string,
    isPrimary: boolean,
    response: Response
  ): Promise<string | null> {
    try {
      this.logger.log(
        `[Fallback] Attempting to create/update Google token record for user ${userId}`
      );

      const tokenRecordId =
        await this.contactsProviderTokensService.getOrCreateTokenRecord(
          userId,
          "google",
          {
            accessToken: tokens.access_token || "",
            refreshToken: tokens.refresh_token || "",
            tokenExpiresAt: tokens.expiry_date
              ? toUTC(tokens.expiry_date)
              : undefined,
            email: normalizedEmail,
            isPrimary,
          }
        );

      if (!tokenRecordId) {
        return tokenRecordId;
      }

      const existingRecord =
        await this.contactsProviderTokensService.getTokenRecord(tokenRecordId);

      if (!existingRecord) {
        return tokenRecordId;
      }

      this.logger.log(
        `[Fallback] Updating existing token record ${tokenRecordId} for user ${userId}`
      );
      await this.contactsProviderTokensService.updateTokens(tokenRecordId, {
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token || "",
        tokenExpiresAt: tokens.expiry_date
          ? toUTC(tokens.expiry_date)
          : undefined,
        email: normalizedEmail,
      });

      if (!existingRecord.isActive) {
        await this.contactsProviderTokensService.updateTokenActiveStatus(
          tokenRecordId,
          true
        );
        this.logger.log(
          `[Fallback] Reactivated inactive token record ${tokenRecordId} for user ${userId}`
        );
      }

      return tokenRecordId;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to save Google connection: ${error.message}`
          : AUTH_MESSAGES.ERROR.TOKEN_CREATION_FAILED;
      this.logger.error(
        `[Fallback] Failed to create/update token record for user ${userId}:`,
        error instanceof Error ? error.stack : error
      );
      this.redirectGoogleContactsCallback(
        response,
        `error=token_creation_failed&message=${encodeURIComponent(errorMessage)}`
      );
      return null;
    }
  }

  private async queueGoogleContactsFallbackImport(
    userId: string,
    tokenRecordId: string,
    normalizedEmail: string,
    response: Response
  ): Promise<void> {
    try {
      this.logger.log(
        `[Fallback] Creating NEW import record for user ${userId} with token ${tokenRecordId} - this will start a fresh import process`
      );

      const importRecordId =
        await this.contactsImportService.createContactsImport({
          userId,
          provider: "google",
          tokenId: tokenRecordId,
          status: "pending",
          email: normalizedEmail,
        });

      try {
        if (!this.googleContactsQueueService) {
          throw new Error("Background jobs disabled - Redis not configured");
        }
        const jobId = await this.googleContactsQueueService.queueImportJob(
          userId,
          importRecordId
        );
        this.logger.log(
          `[Fallback] ✅ Successfully queued Google Contacts import job ${jobId} for user ${userId}, import record ${importRecordId}`
        );
      } catch (error) {
        this.logger.error(
          `[Fallback] ❌ Failed to queue import job for user ${userId}, import record ${importRecordId}:`,
          error instanceof Error ? error.stack : error
        );
        this.redirectGoogleContactsCallback(
          response,
          `google_contacts_connected=true&warning=import_queued_failed&message=${encodeURIComponent(AUTH_MESSAGES.ERROR.IMPORT_QUEUED_FAILED)}`
        );
        return;
      }

      this.redirectGoogleContactsCallback(
        response,
        "google_contacts_connected=true"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Connection successful, but import setup failed: ${error.message}`
          : AUTH_MESSAGES.ERROR.IMPORT_SETUP_FAILED;
      this.logger.error(
        `[Fallback] Failed to create import record for user ${userId}:`,
        error instanceof Error ? error.stack : error
      );
      this.redirectGoogleContactsCallback(
        response,
        `google_contacts_connected=true&warning=import_creation_failed&message=${encodeURIComponent(errorMessage)}`
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("me")
  async getCurrentUser(
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.authService.getCurrentUser(userId);

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `AUTH_CONTROLLER :: GET_CURRENT_USER : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("getting-started/progress")
  async getGettingStartedProgress(
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.authService.getGettingStartedProgress(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `AUTH_CONTROLLER :: GET_GETTING_STARTED_PROGRESS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Post("refresh")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiSwaggerResponse(MessageResponse)
  async refresh(@Req() request: Request, @Res() res: Response) {
    try {
      const refreshToken =
        request.cookies?.[appConfig.cookieNames.refreshToken];

      if (!refreshToken) {
        throw new UnauthorizedException(
          AUTH_MESSAGES.ERROR.REFRESH_TOKEN_NOT_FOUND
        );
      }

      const result = await this.authService.refreshTokens(refreshToken);

      setAuthCookies(
        res,
        result.accessToken,
        result.refreshToken,
        result.csrfToken
      );

      return responseUtils.success(res, {
        data: { message: AUTH_MESSAGES.INFO.TOKEN_REFRESHED_SUCCESSFULLY },
      });
    } catch (error) {
      this.logger.error(`AUTH_CONTROLLER :: REFRESH : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Get("google")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiSwaggerResponse(MessageResponse)
  async googleAuth(
    @Query("invite_token") inviteToken: string | undefined,
    @Query("returnTo") returnTo: string | undefined,
    @Query("originJobId") originJobId: string | undefined,
    @Query("originRequestId") originRequestId: string | undefined,
    @Query("originRef") originRef: string | undefined,
    @Query("connectorSignup") connectorSignup: string | undefined,
    @Query("consentToken") consentToken: string | undefined,
    @Res() res: Response
  ) {
    try {
      const { clientId } = oauthConfig.google;
      const { clientSecret } = oauthConfig.google;
      const { redirectUri } = oauthConfig.google;
      const { loginScopes } = oauthConfig.google;

      if (!clientId || !clientSecret) {
        throw new UnauthorizedException(
          AUTH_MESSAGES.ERROR.GOOGLE_OAUTH_NOT_CONFIGURED
        );
      }

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      // Generate and persist CSRF nonce
      const nonce = generateNonce();
      res.cookie(appConfig.cookieNames.oauthNonce, nonce, {
        httpOnly: true,
        secure: appConfig.isProduction,
        sameSite: "lax",
        maxAge: 10 * 60 * 1000, // 10 minutes — covers slow account selection on Google's consent screen
        path: "/",
        domain: appConfig.cookieDomain,
      });

      const stateParam = this.encodeOAuthState({
        csrf: nonce,
        invite_token: inviteToken,
        returnTo:
          returnTo && this.isValidReturnTo(returnTo) ? returnTo : undefined,
        originJobId,
        originRequestId,
        originRef,
        connectorSignup,
        consentToken,
      });

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: loginScopes,
        state: stateParam,
      });

      return res.redirect(authUrl);
    } catch (error) {
      this.logger.error(`AUTH_CONTROLLER :: GOOGLE : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Get("google/callback")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiSwaggerResponse(MessageResponse)
  async googleCallback(
    @Req() req: Request,
    @Query("code") code: string,
    @Query("error") oauthError: string | undefined,
    @Query("invite_token") inviteToken: string | undefined,
    @Query("state") state: string | undefined,
    @Res() res: Response
  ) {
    try {
      const stateData = this.tryDecodeOAuthStateForCallback(state, res);
      if (!stateData) {
        return;
      }

      if (!this.validateOAuthCsrfForCallback(req, res, stateData.csrf)) {
        return;
      }

      if (this.handleOAuthProviderError(req, res, oauthError)) {
        return;
      }

      if (!code) {
        this.redirectToSignInWithError(
          res,
          AUTH_MESSAGES.ERROR.OAUTH_ACCESS_DENIED,
          "Sign-in cancelled"
        );
        return;
      }

      const profile = await this.fetchGoogleOAuthProfile(code);
      const providerTokens = extractGoogleProviderTokens(profile.tokens);
      const authOutcome = await this.resolveGoogleOAuthAuth({
        inviteToken,
        stateData,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        fullName: profile.fullName,
        picture: profile.picture,
        providerTokens,
        res,
      });

      if (!authOutcome) {
        return;
      }

      const { authResult, inviteParams, token } = authOutcome;

      setAuthCookies(
        res,
        authResult.accessToken,
        authResult.refreshToken,
        authResult.csrfToken
      );

      const finalRedirect = await this.buildOAuthPostLoginRedirect({
        inviteParams,
        token,
        stateReturnTo: stateData.returnTo,
        authResult,
        defaultPath: "/getting-started",
      });

      return res.redirect(finalRedirect);
    } catch (error) {
      this.logger.error(`AUTH_CONTROLLER :: GOOGLE : ERROR : ${error}`);
      this.redirectOAuthCallbackError(res, error);
    }
  }

  @Public()
  @Post("logout")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiSwaggerResponse(MessageResponse)
  async logout(@Req() request: Request, @Res() res: Response) {
    try {
      const refreshToken =
        request.cookies?.[appConfig.cookieNames.refreshToken];

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      clearAuthCookies(res);

      return responseUtils.success(res, {
        data: { message: AUTH_MESSAGES.INFO.LOGGED_OUT_SUCCESSFULLY },
      });
    } catch (error) {
      this.logger.error(`AUTH_CONTROLLER :: LOGOUT : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Get("microsoft")
  @ApiSwaggerResponse(MessageResponse)
  async microsoftAuth(
    @Query("invite_token") inviteToken: string | undefined,
    @Query("returnTo") returnTo: string | undefined,
    @Query("originJobId") originJobId: string | undefined,
    @Query("originRequestId") originRequestId: string | undefined,
    @Query("originRef") originRef: string | undefined,
    @Query("connectorSignup") connectorSignup: string | undefined,
    @Query("consentToken") consentToken: string | undefined,
    @Res() res: Response
  ) {
    try {
      const { clientId, clientSecret, redirectUri, loginScopes } =
        oauthConfig.microsoft;

      if (!clientId || !clientSecret) {
        throw new UnauthorizedException(
          AUTH_MESSAGES.ERROR.MICROSOFT_OAUTH_NOT_CONFIGURED
        );
      }

      // Generate and persist CSRF nonce
      const nonce = generateNonce();
      res.cookie(appConfig.cookieNames.oauthNonce, nonce, {
        httpOnly: true,
        secure: appConfig.isProduction,
        sameSite: "lax",
        maxAge: 10 * 60 * 1000, // 10 minutes — covers slow account selection on Microsoft's consent screen
        path: "/",
        domain: appConfig.cookieDomain,
      });

      const stateParam = this.encodeOAuthState({
        csrf: nonce,
        invite_token: inviteToken,
        returnTo:
          returnTo && this.isValidReturnTo(returnTo) ? returnTo : undefined,
        originJobId,
        originRequestId,
        originRef,
        connectorSignup,
        consentToken,
      });

      // Build Microsoft OAuth URL
      const authUrl =
        `${oauthConfig.microsoft.authorizeEndpoint}?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(loginScopes.join(" "))}&` +
        `response_mode=query&` +
        `state=${encodeURIComponent(stateParam)}`;

      return res.redirect(authUrl);
    } catch (error) {
      this.logger.error(`AUTH_CONTROLLER :: MICROSOFT : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Get("microsoft/callback")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiSwaggerResponse(MessageResponse)
  async microsoftCallback(
    @Req() req: Request,
    @Query("code") code: string,
    @Query("error") oauthError: string | undefined,
    @Query("state") state: string | undefined,
    @Res() res: Response
  ) {
    try {
      const stateData = this.tryDecodeOAuthStateForCallback(state, res, true);
      if (!stateData) {
        return;
      }

      if (!this.validateOAuthCsrfForCallback(req, res, stateData.csrf, true)) {
        return;
      }

      if (this.handleOAuthProviderError(req, res, oauthError, true)) {
        return;
      }

      if (!code) {
        this.redirectToSignInWithError(
          res,
          AUTH_MESSAGES.ERROR.OAUTH_ACCESS_DENIED,
          "Sign-in cancelled",
          true
        );
        return;
      }

      const { tokens, expiryDate } =
        await this.exchangeMicrosoftOAuthTokens(code);
      const msProfile = await this.fetchMicrosoftUserProfile(
        tokens.access_token as string
      );
      const providerTokens = extractMicrosoftProviderTokens(tokens, expiryDate);

      const authOutcome = await this.resolveMicrosoftOAuthAuth({
        stateData,
        email: msProfile.email,
        givenName: msProfile.givenName,
        surname: msProfile.surname,
        displayName: msProfile.displayName,
        providerTokens,
        res,
      });

      if (!authOutcome) {
        return;
      }

      const { authResult, inviteParams, token } = authOutcome;

      await this.uploadMicrosoftProfilePhotoIfAvailable(
        authResult,
        msProfile.profilePhotoBuffer,
        msProfile.profilePhotoMimeType
      );

      setAuthCookies(
        res,
        authResult.accessToken,
        authResult.refreshToken,
        authResult.csrfToken
      );

      const finalRedirect = await this.buildOAuthPostLoginRedirect({
        inviteParams,
        token,
        stateReturnTo: stateData.returnTo,
        authResult,
        defaultPath: "/getting-started",
        inviteDashboardWithPopup: true,
        appendPopupToFinalUrl: true,
      });

      return res.redirect(finalRedirect);
    } catch (error) {
      this.logger.error(
        `AUTH_CONTROLLER :: MICROSOFT_CALLBACK : ERROR : ${error}`
      );
      this.redirectOAuthCallbackError(res, error, true);
    }
  }

  @Public()
  @Get("google-contacts/callback")
  @ApiSwaggerResponse(MessageResponse)
  async googleContactsCallback(
    @Query("code") code: string,
    @Query("state") state: string, // userId passed in state
    @Res({ passthrough: true }) response: Response
  ) {
    const { clientId, clientSecret } = oauthConfig.google;
    const redirectUri = `${appConfig.apiUrl}/auth/google-contacts/callback`;

    if (!code) {
      throw new Error(AUTH_MESSAGES.ERROR.MISSING_AUTHORIZATION_CODE);
    }

    if (!state) {
      throw new Error(AUTH_MESSAGES.ERROR.MISSING_STATE_PARAMETER);
    }

    const userId = state;
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error(AUTH_MESSAGES.ERROR.NO_ID_TOKEN_RECEIVED_FROM_GOOGLE);
    }

    const hasContactsScope =
      tokens.scope?.includes(oauthConfig.google.contactsScopes[0]) || false;

    if (!hasContactsScope) {
      this.redirectGoogleContactsCallback(
        response,
        `error=contacts_scope_not_granted&message=${encodeURIComponent(AUTH_MESSAGES.ERROR.CONTACTS_SCOPE_NOT_GRANTED)}`
      );
      return;
    }

    const userEmail = await getGoogleUserEmailFromOAuthTokens(
      tokens,
      oauth2Client,
      clientId
    );
    const normalizedEmail = normalizeImportAccountEmail(userEmail);

    if (!normalizedEmail) {
      this.redirectGoogleContactsCallback(
        response,
        `error=google_account_email&message=${encodeURIComponent(
          "Could not determine your Google account email. Please ensure email permission is granted and try again."
        )}`
      );
      return;
    }

    const profile = await this.profilesService.getProfile(userId);
    const isPrimary =
      !!profile?.email &&
      normalizeImportAccountEmail(profile.email) === normalizedEmail;

    const alreadyHadActiveGoogleImportAccount =
      await this.contactsProviderTokensService.hasActiveAccountForNormalizedEmail(
        userId,
        "google",
        normalizedEmail
      );

    const tokenRecordId = await this.persistGoogleContactsFallbackToken(
      userId,
      tokens,
      normalizedEmail,
      isPrimary,
      response
    );

    if (!tokenRecordId) {
      return;
    }

    if (alreadyHadActiveGoogleImportAccount) {
      this.redirectGoogleContactsCallback(
        response,
        `google_contacts_connected=true&already_connected=1&message=${encodeURIComponent(CONTACTS_MESSAGES.INFO.ACCOUNT_ALREADY_CONNECTED_IMPORT)}`
      );
      return;
    }

    await this.queueGoogleContactsFallbackImport(
      userId,
      tokenRecordId,
      normalizedEmail,
      response
    );
  }
}
