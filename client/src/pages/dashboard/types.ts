export interface UserProfileData {
  id: number;
  email: string;
  fullName: string;
  role: string;
  firstName?: string;
  lastName?: string;
  meetingUrl?: string;
  meetingPlatform?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  meeting_url?: string;
  meeting_platform?: string;
  userConfiguration?: {
    hasSeenWelcomePopup: boolean;
  };
}

export interface StatItem {
  title: string;
  value: string | number;
  numericValue?: number;
  prefix?: string;
  decimals?: number;
  icon: React.ElementType;
  trend: string;
  trendLabel: string;
  trendValue?: number | null;
  color: string;
  bgColor: string;
  cardBgGradient: string;
  cardBorder: string;
  trendColor: string;
  trendHoverColor: string;
  link?: string;
}
