export interface DealOrganization {
  name: string | null;
  website: string | null;
  logoUrl: string | null;
  industry: string | null;
  description: string | null;
  linkedinUrl: string | null;
}

export interface DealProspect {
  name: string | null;
  title: string | null;
  company: string | null;
  headline: string | null;
  location: string | null;
  linkedinUrl: string | null;
  photoUrl: string | null;
  organization: DealOrganization | null;
}

export interface DealMeetingAgenda {
  title: string;
  description: string;
}

export interface PublicDealData {
  id: string;
  prospect: DealProspect;
  meetingAgenda: DealMeetingAgenda;
  bountyAmount: number;
  claimerShare: number;
  connectorShare: number;
  interestedCount: number;
  viewCount: number;
  isClaimed: boolean;
  createdAt: string | null;
}

export interface FAQItem {
  question: string;
  answer: string;
}
