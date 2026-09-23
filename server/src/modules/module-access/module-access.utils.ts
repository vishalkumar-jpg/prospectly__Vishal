import type { OrganisationModuleConfig } from "database/schema/organisation-module-access.schema";

/**
 * Resolves the admin-set internal-connector waiting period from a module config.
 * Returns the day count only when it is explicitly configured and positive;
 * otherwise null, meaning "not configured" (HR sets the internal period manually).
 */
export function resolveInternalConnectorWaitDays(
  config: OrganisationModuleConfig | null
): number | null {
  const days = config?.internalConnectorPayoutWaitDays;
  return typeof days === "number" && days > 0 ? days : null;
}
