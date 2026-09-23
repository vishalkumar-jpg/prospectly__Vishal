export interface SharedDeal {
  id: string;
  dealId: string;
  sharerCode: string;
  shareIds: string[]; // Array of all share IDs consolidated for this introduction request
  sharePlatforms: Array<{
    shareId: string;
    platform: "linkedin" | "twitter" | "facebook" | "copy";
  }>; // Map shareId to platform
  prospect: {
    name: string;
    title: string; // From introduction request (legacy)
    company: string; // From introduction request (legacy)
    jobTitle?: string; // From contacts table (preferred)
    linkedinUrl?: string; // From contacts table
    website?: string; // From contacts table
    photoUrl?: string; // From contacts table
  };
  meetingTitle: string;
  meetingDescription?: string; // Optional description from backend
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

export const statusRingColors: Record<string, string> = {
  completed: "ring-emerald-500",
  verified: "ring-blue-500",
  in_progress: "ring-amber-500",
  failed: "ring-red-400",
};

export const statusBgColors: Record<string, string> = {
  completed: "bg-emerald-50 border-emerald-200",
  verified: "bg-blue-50 border-blue-200",
  in_progress: "bg-amber-50 border-amber-200",
  failed: "bg-red-50 border-red-200",
};

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const getPlatformColor = (platform: string): string => {
  switch (platform) {
    case "linkedin":
      return "bg-[#0A66C2] text-white";
    case "twitter":
      return "bg-black text-white";
    case "facebook":
      return "bg-[#1877F2] text-white";
    default:
      return "bg-slate-500 text-white";
  }
};
