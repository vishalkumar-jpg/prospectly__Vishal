export interface DealShareAnalytics {
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
}

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
