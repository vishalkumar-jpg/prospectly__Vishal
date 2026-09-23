import * as schema from "database/schema";

export interface ConnectorRequestEntry {
  entryId: string;
  entryStatus: string;
  requestId: string;
  createdAt: Date | null;
  request: {
    id: string;
    requesterId: string;
    contactName: string;
    bountyAmount: string;
    meetingTitle: string | null;
    meetingDescription: string | null;
    status: string;
    contactId: number | null;
    acceptedBy: string | null;
    acceptedAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  } | null;
}

export interface AcceptRequestResult {
  success: boolean;
  request: schema.IntroductionRequest;
}

export interface DeclineRequestResult {
  success: boolean;
  entry: schema.IntroductionPotentialConnector;
}

export interface AcceptRequestParams {
  responderMessage?: string;
}
