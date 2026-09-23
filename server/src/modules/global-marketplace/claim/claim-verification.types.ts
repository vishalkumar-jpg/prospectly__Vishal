import {
  ClaimVerificationStatus,
  ImportSource,
} from "./claim-verification.constants";

export interface VerificationJobData {
  userId: string;
  introductionRequestId: string;
  source: ImportSource;
}

export interface VerificationJobResult {
  success: boolean;
  matched: boolean;
  matchedContactId?: number;
  matchedSource?: ImportSource;
  sourcesChecked: ImportSource[];
  status: ClaimVerificationStatus;
  message: string;
}

export interface VerificationStatusResponse {
  id: string;
  status: ClaimVerificationStatus;
  sourcesChecked: ImportSource[];
  prospectName: string | null;
  prospectCompany: string | null;
  prospectTitle: string | null;
  bountyAmount: number | null;
  claimerShare: number | null;
  matchedContactId: number | null;
  matchedSource: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface ContactMatchResult {
  matched: boolean;
  contactId?: number;
  matchType?: "email" | "linkedin";
}
