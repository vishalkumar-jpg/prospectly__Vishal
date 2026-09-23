import { INTRODUCTION_API_ERRORS } from "@/constants/introduction-messages";

export function isAlreadyAcceptedApiError(message: string): boolean {
  return message.includes(
    INTRODUCTION_API_ERRORS.alreadyAcceptedByAnotherConnector
  );
}
