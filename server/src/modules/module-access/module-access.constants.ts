import type { UserModule } from "./module-access.service";

/** Keys stored inside the `organisation_module_access.config` jsonb blob. */
export const MODULE_CONFIG_KEYS = {
  EARLY_CANDIDATE_DETAILS_ACCESS: "earlyCandidateDetailsAccess",
  INTERNAL_CONNECTOR_PAYOUT_WAIT_DAYS: "internalConnectorPayoutWaitDays",
} as const;

/** Module that owns the recruiting feature toggles. */
export const RECRUITING_MODULE: UserModule = "recruiting";
