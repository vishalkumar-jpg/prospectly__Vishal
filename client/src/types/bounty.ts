export interface BountyStage {
  stage:
    | "intro_sent"
    | "responded"
    | "scheduling"
    | "meeting_confirmed"
    | "deal_closed";
  percentage: number;
  amount: number;
  status: "pending" | "released" | "cancelled";
  releasedAt?: string;
  description: string;
}

export interface MeetingDetails {
  preferredDuration: "15min" | "30min" | "45min" | "60min";
  preferredTimeSlots: string[];
  timeZone: string;
  meetingType: "virtual" | "in-person" | "flexible";
  platform?: "zoom" | "teams" | "google-meet" | "other";
  agenda?: string;
  schedulingLink?: string;
}

export interface MeetingConfirmation {
  date: string;
  time: string;
  duration: string;
  platform: string;
  meetingLink?: string;
  confirmedAt: string;
  remindersSent: number;
  outcome?: "completed" | "rescheduled" | "cancelled" | "no-show";
  outcomeNotes?: string;
  followUpActions?: string[];
}

export interface Bounty {
  id: string;
  totalAmount: number;
  currency: "USD";
  status: "active" | "completed" | "cancelled" | "disputed";

  // Participants
  referrer: {
    id: string;
    name: string;
    email: string;
  };
  requester: {
    id: string;
    name: string;
    email: string;
    company: string;
  };
  prospect: {
    id: string;
    name: string;
    email: string;
    company: string;
  };

  // Bounty breakdown
  stages: BountyStage[];
  bonusStage?: {
    percentage: number;
    amount: number;
    status: "pending" | "released" | "cancelled";
    releasedAt?: string;
    description: string;
  };

  // Tracking
  referralSentAt?: string;
  respondedAt?: string;
  schedulingStartedAt?: string;
  meetingConfirmedAt?: string;
  meetingDate?: string;
  dealClosedAt?: string;
  dealValue?: number;

  // Meeting Details
  meetingDetails?: MeetingDetails;
  meetingConfirmation?: MeetingConfirmation;

  // Escrow
  escrowBalance: number;
  totalReleased: number;
  totalPending: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
  campaignId?: string;
  notes?: string;
}

export interface BountyTransaction {
  id: string;
  bountyId: string;
  type: "escrow_deposit" | "stage_release" | "bonus_release" | "refund";
  amount: number;
  stage?: BountyStage["stage"];
  status: "pending" | "completed" | "failed";
  processedAt?: string;
  description: string;
}

export interface UserWallet {
  userId: string;
  balance: number;
  pendingEarnings: number;
  totalEarned: number;
  transactions: BountyTransaction[];
}
