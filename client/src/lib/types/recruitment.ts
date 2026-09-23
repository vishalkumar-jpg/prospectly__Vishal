import type { GapAnalysisPayload } from "@/lib/recruitment/gap-analysis.types";

// Shared types for recruitment components

export interface CandidateApplication {
  id: string;
  jobId?: string;
  jobTitle: string;
  companyName: string;
  companyLogo: string | null;
  description: string;
  location: string;
  workType: "remote" | "hybrid" | "onsite";
  experienceLevel: string;
  employmentType?: string | null;
  salaryRange: { min: number; max: number; currency?: string };
  salaryPeriod?: string;
  salaryCurrency?: string;
  status:
    | "applied"
    | "processing"
    | "under_review"
    | "interview_invite_sent"
    | "interview_scheduled"
    | "interview_completed"
    | "offer_received"
    | "offer_accepted"
    | "rejected"
    | "jd_mismatched";
  appliedAt: string;
  lastUpdatedAt: string;
  interviewScheduledAt?: string;
  interviewType?: "video" | "phone" | "in_person";
  interviewDuration?: number;
  interviewLocation?: string;
  meetingLink?: string;
  slaStartedAt?: string;
  offerDetails?: {
    salary: number;
    startDate: string;
    expiresAt: string;
  };
  rejectionReason?: string;
  offerAcceptedAt?: string;
  startDate?: string;
  // Skill matching properties
  matchScore?: string;
  matchedSkills?: string[] | null;
  missingSkills?: string[] | null;
  analysisAt?: string;
  analysisStatus?: "pending" | "completed" | "failed";
  evaluationRetryCount?: number;
  gapAnalysis?: GapAnalysisPayload | null;
  timeline: Array<{
    status: string;
    date: string;
    note: string;
  }>;
  // The candidate's own bonus (success-fee payout) for this application, if any.
  bonus?: {
    id: string;
    amount: string | null;
    currency: string;
    status: string;
    processingStatus: string;
  } | null;
}
