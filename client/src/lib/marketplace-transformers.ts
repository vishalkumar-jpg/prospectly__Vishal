/**
 * Transformers for converting backend marketplace data to frontend format
 */

export interface BackendMarketplaceRequest {
  id: string;
  contactName: string;
  meetingTitle: string;
  meetingDescription?: string;
  bountyAmount: number;
  isUrgent: boolean;
  expiredAt?: string | null;
  createdAt: string;
  interestedCount?: number;
  viewsCount?: number;
  // Contact details from contacts table
  contactTitle?: string | null;
  contactCompany?: string | null;
  contactLinkedin?: string | null;
  contactWebsite?: string | null;
  contactProfilePhotoUrl?: string | null;
  contactOrganizations?: Array<{
    id: string;
    name: string;
    isVerified: boolean;
  }>;
}

export interface FrontendMarketplaceRequest {
  id: string;
  prospect: {
    name: string;
    title: string; // From introduction request (contactTitle)
    company: string; // From introduction request (contactCompany)
    jobTitle?: string; // From contacts table (contactTitle) - preferred over title
    linkedinUrl?: string; // From contacts table
    website?: string; // From contacts table (contactWebsite)
    photoUrl?: string; // From contacts table (contactProfilePhotoUrl)
  };
  meetingAgenda: {
    title: string;
    description: string;
  };
  bountyAmount: number;
  daysRemaining: number;
  urgency: "urgent" | "high" | "normal" | "flexible";
  interestedCount: number;
  viewsCount: number;
  isSharedByUser?: boolean;
  contactOrganizations?: Array<{
    id: string;
    name: string;
    isVerified: boolean;
  }>;
}

/**
 * Calculate days remaining from expiredAt date
 */
function calculateDaysRemaining(expiredAt: string | null | undefined): number {
  if (!expiredAt) return 30; // Default to 30 days if no expiry
  const expiryDate = new Date(expiredAt);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Determine urgency level based on isUrgent flag and days remaining
 */
function calculateUrgency(
  isUrgent: boolean,
  daysRemaining: number
): "urgent" | "high" | "normal" | "flexible" {
  if (isUrgent || daysRemaining < 3) return "urgent";
  if (daysRemaining < 7) return "high";
  if (daysRemaining < 14) return "normal";
  return "flexible";
}

/**
 * Transform a single backend request to frontend format
 */
export function transformBackendRequestToFrontend(
  request: BackendMarketplaceRequest
): FrontendMarketplaceRequest {
  const daysRemaining = calculateDaysRemaining(request.expiredAt);
  const urgency = calculateUrgency(request.isUrgent, daysRemaining);

  // Backend returns contactTitle and contactCompany from contacts table
  // These are the preferred fields (from contacts table)
  const jobTitle = request.contactTitle || "";
  const company = request.contactCompany || "";

  return {
    id: request.id,
    prospect: {
      name: request.contactName,
      title: jobTitle, // From contacts table
      company: company, // From contacts table
      jobTitle: jobTitle || undefined, // Same as title, from contacts table
      linkedinUrl: request.contactLinkedin || undefined,
      website: request.contactWebsite || undefined,
      photoUrl: request.contactProfilePhotoUrl || undefined,
    },
    meetingAgenda: {
      title: request.meetingTitle,
      description: request.meetingDescription || "",
    },
    bountyAmount: Number(request.bountyAmount),
    daysRemaining,
    urgency,
    interestedCount: request.interestedCount || 0,
    viewsCount: request.viewsCount || 0,
    contactOrganizations: request.contactOrganizations ?? [],
  };
}

/**
 * Transform an array of backend requests to frontend format
 */
export function transformBackendRequestsToFrontend(
  requests: BackendMarketplaceRequest[]
): FrontendMarketplaceRequest[] {
  return requests.map(transformBackendRequestToFrontend);
}

/**
 * Backend share response type
 */
export interface BackendShare {
  id: string;
  sharerCode: string;
  platform: string;
  createdAt: string;
  clicksCount: number;
  request: {
    id: string;
    contactName: string;
    bountyAmount: number;
    meetingTitle: string;
    status?: string;
  };
  // Contact details from contacts table (returned by backend)
  contactTitle: string | null;
  contactCompany: string | null;
  contactLinkedin: string | null;
  contactWebsite: string | null;
  contactProfilePhotoUrl: string | null;
}

/**
 * Platform analytics for a single share
 */
export interface PlatformAnalytics {
  platform: "linkedin" | "twitter" | "facebook" | "copy";
  shareId: string;
  clicks: number;
  signupAttempts: number;
  claimAttempts: number;
  successfulClaims: number;
}

/**
 * Frontend shared request type (matches SharedDeal interface)
 */
export interface FrontendSharedRequest {
  id: string;
  dealId: string; // Changed from requestId to match SharedDeal
  sharerCode: string;
  shareIds: string[]; // Array of all share IDs consolidated for this introduction request
  sharePlatforms: Array<{
    shareId: string;
    platform: "linkedin" | "twitter" | "facebook" | "copy";
  }>; // Map shareId to platform
  prospect: {
    name: string;
    title: string; // From introduction request
    company: string; // From introduction request
    jobTitle?: string; // From contacts table (preferred)
    linkedinUrl?: string; // From contacts table
    website?: string; // From contacts table
    photoUrl?: string; // From contacts table
  };
  meetingTitle: string;
  bountyAmount: number;
  connectorEarnings: number;
  status: "active" | "claimed" | "expired" | "completed";
  sharedAt: string;
  expiresAt?: string;
  analytics: {
    totalShares: number;
    sharesByPlatform: {
      facebook: number;
      twitter: number;
      linkedin: number;
      copy: number;
    };
    totalClicks: number;
    signupAttempts: number;
    claimAttempts: number;
    successfulClaims: number;
    platformAnalytics?: Array<{
      platform: "linkedin" | "twitter" | "facebook" | "copy";
      clicks: number;
      signupAttempts: number;
      claimAttempts: number;
      successfulClaims: number;
    }>;
  };
  platformAnalytics?: Array<{
    platform: "linkedin" | "twitter" | "facebook" | "copy";
    clicks: number;
    signupAttempts: number;
    claimAttempts: number;
    successfulClaims: number;
  }>;
  claimedBy?: {
    name: string;
    status: "pending_verification" | "verified" | "completed" | "failed";
  };
  claimers?: Array<{
    name: string;
    platform: "linkedin" | "twitter" | "facebook" | "copy";
    status: "in_progress" | "verified" | "completed" | "failed";
    progress: number;
    reason?: string;
  }>;
}

/**
 * Map backend status to frontend status
 */
function mapShareStatus(
  backendStatus?: string
): "active" | "claimed" | "expired" | "completed" {
  switch (backendStatus) {
    case "completed":
      return "completed";
    case "accepted":
    case "claimed":
      return "claimed";
    case "expired":
      return "expired";
    default:
      return "active";
  }
}

/**
 * Transform a backend share to frontend format
 */
export function transformBackendShareToFrontend(
  share: BackendShare
): FrontendSharedRequest {
  // Initialize platform counts - count 1 for the current platform
  const sharesByPlatform = {
    facebook: share.platform === "facebook" ? 1 : 0,
    twitter: share.platform === "twitter" ? 1 : 0,
    linkedin: share.platform === "linkedin" ? 1 : 0,
    copy: share.platform === "copy" ? 1 : 0,
  };

  const platform = share.platform.toLowerCase() as
    | "linkedin"
    | "twitter"
    | "facebook"
    | "copy";

  // Create platformAnalytics for single share
  const platformAnalytics = [
    {
      platform,
      clicks: share.clicksCount || 0,
      signupAttempts: 0, // Not available from share counts
      claimAttempts: 0, // Not available from share counts
      successfulClaims: 0, // Not available from share counts
    },
  ];

  return {
    id: share.id,
    dealId: share.request.id, // Changed from requestId to dealId
    sharerCode: share.sharerCode,
    shareIds: [share.id], // Single share ID
    sharePlatforms: [{ shareId: share.id, platform }], // Map shareId to platform
    prospect: {
      name: share.request.contactName,
      title: "", // From introduction request (not available in share response)
      company: "", // From introduction request (not available in share response)
      jobTitle: share.contactTitle || undefined, // From contacts table
      linkedinUrl: share.contactLinkedin || undefined,
      website: share.contactWebsite || undefined,
      photoUrl: share.contactProfilePhotoUrl || undefined,
    },
    meetingTitle: share.request.meetingTitle,
    bountyAmount: Number(share.request.bountyAmount),
    connectorEarnings: Number(share.request.bountyAmount) * 0.5,
    status: mapShareStatus(share.request.status),
    sharedAt: share.createdAt,
    expiresAt: undefined,
    analytics: {
      totalShares: 1, // Each share record represents 1 share
      sharesByPlatform,
      totalClicks: share.clicksCount || 0, // Use clicks count from backend
      signupAttempts: 0,
      claimAttempts: 0,
      successfulClaims: 0,
      platformAnalytics,
    },
    platformAnalytics, // Per-platform share counts from clicksCount
    claimedBy: undefined,
    claimers: undefined,
  };
}

/**
 * Transform an array of backend shares to frontend format
 * Consolidates multiple shares for the same introduction request into a single record
 */
export function transformBackendSharesToFrontend(
  shares: BackendShare[]
): FrontendSharedRequest[] {
  if (shares.length === 0) {
    return [];
  }

  // Group shares by dealId (introduction request ID)
  const groupedByDealId = shares.reduce(
    (acc, share) => {
      const dealId = share.request.id;
      if (!acc[dealId]) {
        acc[dealId] = [];
      }
      acc[dealId].push(share);
      return acc;
    },
    {} as Record<string, BackendShare[]>
  );

  // Transform each group into a consolidated record
  return Object.values(groupedByDealId).map((shareGroup) => {
    // Sort by createdAt to get earliest date
    const sortedShares = [...shareGroup].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const firstShare = sortedShares[0];

    // Aggregate platform counts
    const sharesByPlatform = {
      facebook: 0,
      twitter: 0,
      linkedin: 0,
      copy: 0,
    };

    const shareIds: string[] = [];
    const sharePlatforms: Array<{
      shareId: string;
      platform: "linkedin" | "twitter" | "facebook" | "copy";
    }> = [];

    // Aggregate clicksCount per platform
    const platformClicksMap = new Map<
      "linkedin" | "twitter" | "facebook" | "copy",
      number
    >();

    shareGroup.forEach((share) => {
      shareIds.push(share.id);
      const platform = share.platform.toLowerCase() as
        | "linkedin"
        | "twitter"
        | "facebook"
        | "copy";
      sharePlatforms.push({ shareId: share.id, platform });

      if (platform === "facebook") {
        sharesByPlatform.facebook += 1;
      } else if (platform === "twitter") {
        sharesByPlatform.twitter += 1;
      } else if (platform === "linkedin") {
        sharesByPlatform.linkedin += 1;
      } else if (platform === "copy") {
        sharesByPlatform.copy += 1;
      }

      // Aggregate clicksCount per platform
      // Sum clicksCount values for all shares of the same platform
      const currentCount = platformClicksMap.get(platform) || 0;
      const shareClicksCount = share.clicksCount || 0;
      platformClicksMap.set(platform, currentCount + shareClicksCount);
    });

    // Create platformAnalytics array
    const platformAnalytics = Array.from(platformClicksMap.entries()).map(
      ([platform, clicks]) => ({
        platform,
        clicks,
        signupAttempts: 0, // Not available from share counts
        claimAttempts: 0, // Not available from share counts
        successfulClaims: 0, // Not available from share counts
      })
    );

    // Determine status - use the "most advanced" status
    // Priority: completed > claimed > expired > active
    const statusPriority: Record<string, number> = {
      completed: 4,
      claimed: 3,
      expired: 2,
      active: 1,
    };

    const statuses = shareGroup.map((s) => mapShareStatus(s.request.status));
    const highestStatus = statuses.reduce(
      (prev, curr) => {
        return statusPriority[curr] > statusPriority[prev] ? curr : prev;
      },
      "active" as "active" | "claimed" | "expired" | "completed"
    );

    return {
      id: firstShare.id, // Use first share's ID as the consolidated record ID
      dealId: firstShare.request.id,
      sharerCode: firstShare.sharerCode, // Use first share's sharerCode
      shareIds, // Store all share IDs for analytics fetching
      sharePlatforms, // Map shareId to platform for analytics display
      prospect: {
        name: firstShare.request.contactName,
        title: "", // From introduction request (not available in share response)
        company: "", // From introduction request (not available in share response)
        jobTitle: firstShare.contactTitle || undefined, // From contacts table
        linkedinUrl: firstShare.contactLinkedin || undefined,
        website: firstShare.contactWebsite || undefined,
        photoUrl: firstShare.contactProfilePhotoUrl || undefined, // Fix: map from backend
      },
      meetingTitle: firstShare.request.meetingTitle,
      bountyAmount: Number(firstShare.request.bountyAmount),
      connectorEarnings: Number(firstShare.request.bountyAmount) * 0.5,
      status: highestStatus,
      sharedAt: sortedShares[0].createdAt, // Earliest share date
      expiresAt: undefined,
      analytics: {
        totalShares: shareGroup.length, // Total number of shares consolidated
        sharesByPlatform,
        totalClicks: Array.from(platformClicksMap.values()).reduce(
          (sum, clicks) => sum + clicks,
          0
        ), // Sum clicks per platform (avoid double-counting)
        signupAttempts: 0,
        claimAttempts: 0,
        successfulClaims: 0,
        platformAnalytics,
      },
      platformAnalytics, // Per-platform share counts from clicksCount
      claimedBy: undefined,
      claimers: undefined,
    };
  });
}
