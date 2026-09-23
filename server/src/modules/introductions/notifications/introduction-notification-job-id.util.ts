import {
  INTRODUCTION_NOTIFICATION_TYPE,
  IntroductionNotificationType,
  buildConnectorRequestRaisedJobId,
  buildIntroductionNotificationJobId,
  buildRequesterRequestUnsuccessfulJobId,
  buildSharerClaimNotificationJobId,
} from "./introduction-notifications.constants";

export function resolveIntroductionNotificationJobId(params: {
  requestId: string;
  type: IntroductionNotificationType;
  claimId?: string;
  notificationCycle?: number;
}): string {
  const { requestId, type, claimId, notificationCycle } = params;

  if (
    type === INTRODUCTION_NOTIFICATION_TYPE.SHARER_REQUEST_CLAIMED &&
    claimId
  ) {
    return buildSharerClaimNotificationJobId(claimId);
  }

  if (type === INTRODUCTION_NOTIFICATION_TYPE.CONNECTOR_REQUEST_RAISED) {
    return buildConnectorRequestRaisedJobId(requestId, notificationCycle ?? 0);
  }

  if (type === INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_REQUEST_UNSUCCESSFUL) {
    return buildRequesterRequestUnsuccessfulJobId(
      requestId,
      notificationCycle ?? 1
    );
  }

  return buildIntroductionNotificationJobId(requestId, type);
}
