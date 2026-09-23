export interface MarketplaceDeal {
  id: string;
  prospect: {
    name: string;
    title: string; // From introduction request (legacy)
    company: string; // From introduction request (legacy)
    jobTitle?: string; // From contacts table (preferred)
    linkedinUrl?: string; // From contacts table
    website?: string; // From contacts table
    photoUrl?: string; // From contacts table
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

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const getViewCount = (dealId: string): number => {
  return (
    Math.abs(
      dealId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 80
    ) + 20
  );
};
