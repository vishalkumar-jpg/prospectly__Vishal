export const INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES = {
  ERROR: {
    INTRODUCTION_REQUEST_NOT_FOUND: "Introduction request not found",
    ALREADY_ACCEPTED:
      "This introduction request has already been accepted by another connector",
    CANNOT_ACCEPT_STATUS: (status: string) =>
      `Cannot accept request with status: ${status}`,
    NOT_AUTHORIZED_TO_ACCEPT:
      "You are not authorized to accept this introduction request",
    ENTRY_STATUS_INVALID: (status: string) =>
      `Your entry for this request has status: ${status}`,
    PRIOR_UNSUCCESSFUL_ATTEMPT:
      "You cannot accept this request because you previously marked it as unsuccessful",
    NOT_AUTHORIZED_TO_DECLINE:
      "You are not authorized to decline this introduction request",
    CANNOT_DECLINE_STATUS: (status: string) =>
      `Cannot decline entry with status: ${status}`,
    BOUNTY_EXCEEDS_REQUESTER: (
      connectorBounty: string,
      requesterBounty: string
    ) =>
      `Your referral payout amount ($${connectorBounty}) exceeds the requester's referral payout ($${requesterBounty}). Please revise your referral payout before accepting this request.`,
    CONTACT_NOT_FOUND: "The requested contact was not found",
    NOT_AUTHORIZED:
      "You are not authorized to view information for this contact",
  },
  INFO: {
    REQUEST_ACCEPTED: "Introduction request accepted successfully",
    REQUEST_DECLINED: "Introduction request declined",
    NO_CONNECTORS_FOUND: (contactId: number) =>
      `No connectors found for contact ${contactId}`,
  },
  LOG: {
    REQUEST_ACCEPTED: (requestId: string, connectorId: string) =>
      `Request ${requestId} accepted by connector ${connectorId}. Other entries archived.`,
    REQUEST_DECLINED: (
      connectorId: string,
      requestId: string,
      reason: string
    ) =>
      `Connector ${connectorId} declined request ${requestId}. Reason: ${reason}`,
    ALL_DECLINED: (requestId: string) =>
      `All connectors declined request ${requestId}. Request status updated to declined.`,
  },
};
