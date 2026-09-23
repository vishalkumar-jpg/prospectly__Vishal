// Public-page signup origin context. Forwarded through the OAuth state
// from one of two public pages so the auth flow can gate new-user signup
// on a real public-page provenance:
//   - Public Job page (`/jobs/:jobId?ref=:sharerCode`) → { jobId, sharerCode }
//   - Public Request page (`/request/:requestId/:sharerCode`) → { requestId, sharerCode }
// The job-page flow additionally records a `recruitment_connector_origins`
// row for marketplace-split attribution; the request-page flow only allows
// signup (no DB attribution).
export interface OriginContext {
  jobId?: string;
  requestId?: string;
  sharerCode?: string;
  // True only when the user clicked "I Have a Candidate" on the public job
  // page — i.e. they are signing up as a connector. Drives whether we write
  // a recruitment_connector_origins row at signup. The candidate-apply
  // ("I'm Interested") and request-page flows leave this false/absent, so
  // they get signup access without marketplace-split attribution.
  isConnectorSignup?: boolean;
  // Raw consent JWT forwarded from /consent/:token → /signin. Validated at
  // signup time via JWT signature + expiry + payload shape. No DB
  // attribution row is written.
  consentToken?: string;
}

export interface LoginGoogleUser {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  picture?: string | null;
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
  /** When the OAuth token response includes Google contacts scope (even if refresh_token is omitted on re-login). */
  googleContactsScopeGranted?: boolean;
  originContext?: OriginContext;
}

export interface SetupGoogleContactsImport {
  userId: string;
  email: string;
  googleTokens: {
    accessToken: string;
    refreshToken: string;
    expiryDate?: number;
    scope?: string;
  };
}

export interface CreateNewGoogleContactsImport {
  userId: string;
  email: string;
  googleTokens: {
    accessToken: string;
    refreshToken: string;
    expiryDate?: number;
  };
  existingTokenRecordId?: string;
}

export interface HandleCalendarConnection {
  userId: string;
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiryDate?: number;
  };
  email: string | null;
}

export interface GenerateTokens {
  userId: string;
  email: string;
  rememberMe?: boolean;
  recordLastLogin?: boolean;
}

export interface LoginMicrosoftUser {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
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
  originContext?: OriginContext;
}

export interface CreateNewMicrosoftContactsImport {
  userId: string;
  email: string;
  microsoftTokens: {
    accessToken: string;
    refreshToken: string;
    expiryDate?: number;
  };
  existingTokenRecordId?: string;
}

export interface HandleMicrosoftCalendarConnection {
  userId: string;
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiryDate?: number;
  };
  email: string | null;
}

export type PreferredWorkspace = "recruiting" | "prospecting" | "both";
export type PrimaryWorkspace = "recruiting" | "prospecting";

export interface GettingStartedProgressDto {
  step1Complete: boolean;
  step2Complete: boolean;
  step3Complete: boolean;
  /** Getting Started preferred workspace (recruiting | prospecting | both). */
  preferredWorkspace: PreferredWorkspace | null;
  /** Active primary workspace for sidebar/header (forced to prospecting when org lacks recruiting). */
  primaryWorkspace: PrimaryWorkspace | null;
  /** False when Choose Focus is skipped (no recruiting module access). */
  hasFocusStep: boolean;
}
