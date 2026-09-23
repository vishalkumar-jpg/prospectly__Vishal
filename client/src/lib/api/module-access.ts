import { request } from "./core";

/**
 * Resolved org-level config for the current user's recruiting module. Generic —
 * new org-level flags surface as additional optional keys here.
 */
export interface ModuleConfig {
  earlyCandidateDetailsAccess?: boolean;
  /** Admin-set internal-connector waiting period (days). Present & > 0 locks it. */
  internalConnectorPayoutWaitDays?: number;
}

export const moduleAccessApi = {
  getConfig: () => request<ModuleConfig>("/module-access/config"),
};
