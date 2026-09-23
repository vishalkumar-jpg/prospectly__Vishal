/**
 * Google OAuth Service
 *
 * Handles OAuth 2.0 token exchange and Google People API integration for contact imports.
 *
 * Features:
 * - OAuth 2.0 authorization code flow
 * - Google People API v1 integration
 * - Token exchange and management
 * - Contact data transformation
 */

import { oauthConfig } from "config/oauth.config";

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleContact {
  resourceName: string;
  names?: Array<{
    givenName?: string;
    familyName?: string;
    displayName?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
    department?: string;
  }>;
  urls?: Array<{
    value: string;
    type?: string;
  }>;
  addresses?: Array<{
    formattedValue?: string;
    type?: string;
    streetAddress?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
  }>;
  photos?: Array<{
    url?: string;
    default?: boolean;
  }>;
}

export interface GoogleContactsResponse {
  connections?: GoogleContact[];
  otherContacts?: GoogleContact[];
  people?: GoogleContact[];
  nextPageToken?: string;
  totalPeople?: number;
  totalItems?: number;
}

/**
 * Get Google OAuth credentials from provided values
 */
function getGoogleCredentials(
  clientId?: string,
  clientSecret?: string
): { clientId: string; clientSecret: string } {
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
    );
  }

  return { clientId, clientSecret };
}

/**
 * Exchange OAuth authorization code for access token
 *
 * @param code - Authorization code from OAuth callback
 * @param redirectUri - Redirect URI used in authorization request
 * @returns Token response with access token
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  credentials: { clientId: string; clientSecret: string }
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleCredentials(
    credentials.clientId,
    credentials.clientSecret
  );

  const response = await fetch(oauthConfig.google.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Failed to exchange code for tokens: ${error.error_description || error.error || "Unknown error"}`
    );
  }

  const tokens = (await response.json()) as GoogleTokenResponse;

  if (!tokens.access_token) {
    throw new Error("No access token received from Google");
  }

  return tokens;
}

/**
 * Fetch contacts from Google People API
 *
 * @param accessToken - Google OAuth access token
 * @param pageSize - Number of contacts to fetch per page (max 2000)
 * @returns Array of Google contacts
 */
export async function fetchGoogleContacts(
  accessToken: string,
  pageSize = 2000
): Promise<GoogleContact[]> {
  const allContacts: GoogleContact[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `${oauthConfig.google.peopleApiBaseUrl}/people/me/connections`
    );
    url.searchParams.set(
      "personFields",
      "names,emailAddresses,phoneNumbers,organizations,urls,addresses,photos"
    );
    url.searchParams.set("pageSize", pageSize.toString());

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Failed to fetch Google contacts: ${response.status} ${error}`
      );
    }

    const data = (await response.json()) as GoogleContactsResponse;

    if (data.connections && data.connections.length > 0) {
      allContacts.push(...data.connections);
    }

    pageToken = data.nextPageToken;

    // Safety limit to prevent infinite loops
    if (allContacts.length >= 10000) {
      break;
    }
  } while (pageToken);

  return allContacts;
}

/**
 * Fetch other contacts from Google People API
 *
 * @param accessToken - Google OAuth access token
 * @param pageSize - Number of contacts to fetch per page (max 1000)
 * @returns Array of Google other contacts
 */
export async function fetchGoogleOtherContacts(
  accessToken: string,
  pageSize = 1000
): Promise<GoogleContact[]> {
  const allContacts: GoogleContact[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${oauthConfig.google.peopleApiBaseUrl}/otherContacts`);
    url.searchParams.set(
      "readMask",
      "names,emailAddresses,phoneNumbers,photos"
    );
    url.searchParams.set("pageSize", pageSize.toString());

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Failed to fetch Google other contacts: ${response.status} ${error}`
      );
    }

    const data = (await response.json()) as GoogleContactsResponse;
    const contacts = data.otherContacts || data.connections;

    if (contacts && contacts.length > 0) {
      allContacts.push(...contacts);
    }

    pageToken = data.nextPageToken;

    // Safety limit to prevent infinite loops
    if (allContacts.length >= 5000) {
      break;
    }
  } while (pageToken);

  return allContacts;
}

/**
 * Search directory contacts from Google People API
 *
 * **Limitation:** This function requires a Google Workspace or Cloud Identity domain account
 * and will not work with personal Gmail accounts. The underlying Google People API endpoints
 * (`people:listDirectoryPeople` and `people:searchDirectoryPeople`) require domain accounts
 * and will fail when called with personal Gmail credentials. Callers should expect failures
 * for personal accounts and ensure error handling surfaces this limitation to users.
 *
 * @param accessToken - Google OAuth access token
 * @param query - Search query (optional, if not provided returns all directory contacts)
 * @param pageSize - Number of contacts to fetch per page (max 500)
 * @returns Array of Google directory contacts
 */
export async function fetchGoogleDirectoryContacts(
  accessToken: string,
  query?: string,
  pageSize = 500
): Promise<GoogleContact[]> {
  const allContacts: GoogleContact[] = [];
  let pageToken: string | undefined;

  do {
    const action = query
      ? "people:searchDirectoryPeople"
      : "people:listDirectoryPeople";
    const url = new URL(`${oauthConfig.google.peopleApiBaseUrl}/${action}`);
    url.searchParams.set(
      "readMask",
      "names,emailAddresses,phoneNumbers,organizations,urls,addresses,photos"
    );
    url.searchParams.append("sources", "DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT");
    url.searchParams.append("sources", "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE");
    url.searchParams.set("pageSize", pageSize.toString());

    if (query) {
      url.searchParams.set("query", query);
    }

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Failed to fetch Google directory contacts: ${response.status} ${error}`
      );
    }

    const data = (await response.json()) as GoogleContactsResponse;
    const contacts = data.people || data.connections;

    if (contacts && contacts.length > 0) {
      allContacts.push(...contacts);
    }

    pageToken = data.nextPageToken;

    // Safety limit to prevent infinite loops
    if (allContacts.length >= 5000) {
      break;
    }
  } while (pageToken);

  return allContacts;
}

/**
 * Transform Google contact to our contact import format
 *
 * @param googleContact - Raw Google contact object
 * @returns Transformed contact in our format
 */
export function transformGoogleContact(googleContact: GoogleContact): {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  company?: string;
  title?: string;
  linkedin?: string;
  city?: string;
  state?: string;
  country?: string;
  profile_photo_url?: string;
} {
  const name = googleContact.names?.[0];
  const email = googleContact.emailAddresses?.[0]?.value;
  const phone = googleContact.phoneNumbers?.[0]?.value;
  const organization = googleContact.organizations?.[0];
  const linkedinUrl = googleContact.urls?.find((url) =>
    url.value?.includes("linkedin.com")
  )?.value;
  const address = googleContact.addresses?.[0];
  const photo =
    googleContact.photos?.find((p) => !p.default)?.url ||
    googleContact.photos?.[0]?.url;

  return {
    first_name:
      name?.givenName ||
      name?.displayName ||
      (email ? email.split("@")[0] : undefined),
    last_name: name?.familyName || undefined,
    email: email || undefined,
    phone_number: phone || undefined,
    company: organization?.name || undefined,
    title: organization?.title || undefined,
    linkedin: linkedinUrl || undefined,
    city: address?.city || undefined,
    state: address?.region || undefined,
    country: address?.country || undefined,
    profile_photo_url: photo || undefined,
  };
}

/**
 * Import contacts from Google People API
 *
 * Complete flow: Exchange code -> Fetch contacts -> Transform data
 *
 * @param code - OAuth authorization code
 * @param redirectUri - Redirect URI used in authorization
 * @returns Array of transformed contacts ready for import
 */
export async function importContactsFromGoogle(
  code: string,
  redirectUri: string,
  credentials: { clientId: string; clientSecret: string }
): Promise<{
  contacts: Array<{
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    company?: string;
    title?: string;
    linkedin?: string;
    city?: string;
    state?: string;
    country?: string;
    profile_photo_url?: string;
  }>;
  totalFetched: number;
}> {
  const tokens = await exchangeCodeForTokens(code, redirectUri, credentials);

  const googleContacts = await fetchGoogleContacts(tokens.access_token);

  // Transform contacts to our format
  const transformedContacts = googleContacts
    .map(transformGoogleContact)
    .filter((contact) => contact.email || contact.phone_number); // Keep contacts with email or phone

  return {
    contacts: transformedContacts,
    totalFetched: googleContacts.length,
  };
}
