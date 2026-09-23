import { utcDayjs } from "@/lib/dayjs";

/**
 * Client-side mirror of the server connector payout gating
 * (server/src/modules/recruitment/payout/services/recruitment-payout-gating.helper.ts).
 *
 * DISPLAY ONLY. This drives the Release modal's button/preview so switching a
 * connector's classification reflects instantly, before saving. It is never a
 * trust boundary: the server independently recomputes the window from the stored
 * price-row fields at release time and leaves not-yet-elapsed rows pending. Do
 * not gate a mutation on this result or send it to the API.
 */
export interface ConnectorPayoutTimingState {
  hireDate: string | null;
  intPayoutWaits: boolean;
  extPayoutWaits: boolean;
  intConnectorPayoutWaitDays: number | null;
  extConnectorPayoutWaitDays: number | null;
}

export interface ConnectorDraftReleasability {
  canReleaseNow: boolean;
  waitEndsAt: string | null;
}

/**
 * Whether a connector with the given (draft) classification is releasable now,
 * and when its waiting window ends. Mirrors `computeConnectorWaitWindow` +
 * `canReleaseConnectorNow`: the type's wait flag off ⇒ payable on hire; null/0
 * days or no hire date ⇒ elapsed immediately; otherwise elapsed once
 * `hireDate + days` is not after now (inclusive boundary).
 */
export function computeConnectorDraftReleasability(
  classificationType: "internal" | "external",
  state: ConnectorPayoutTimingState
): ConnectorDraftReleasability {
  const isInternal = classificationType === "internal";
  const waits = isInternal ? state.intPayoutWaits : state.extPayoutWaits;
  if (!waits) return { canReleaseNow: true, waitEndsAt: null };

  const days = isInternal
    ? state.intConnectorPayoutWaitDays
    : state.extConnectorPayoutWaitDays;
  if (!state.hireDate || !days) {
    return { canReleaseNow: true, waitEndsAt: null };
  }

  const end = utcDayjs(state.hireDate).add(days, "days");
  return {
    canReleaseNow: !end.isAfter(utcDayjs()),
    waitEndsAt: end.toISOString(),
  };
}
