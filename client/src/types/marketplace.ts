export interface MarketplaceJob {
  id: string;
  title: string;
  companyName: string;
  description: string;
  location?: string | null;
  employmentType?: string | null;
  salaryRangeMin: string;
  salaryRangeMax: string;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  salaryRangeNotes?: string | null;
  bountyAmount: string;
  connectorPayout: string;
  sharerPayout: string;
  requiredSkills?: string[] | null;
  preferredSkills?: string[] | null;
  createdAt: string;
  viewCount: number;
  myReferCount?: number;
  hasSharedLink?: boolean;
}
