/**
 * Per-user pipeline stage filter preferences stored in a single jsonb column.
 * Empty arrays mean "show all stages" (no filter applied).
 */
export type UserFilter = {
  requester: string[];
  connector: string[];
  recruiter: string[];
  my_pipeline: string[];
};

export const DEFAULT_USER_FILTER: UserFilter = {
  requester: [],
  connector: [],
  recruiter: [],
  my_pipeline: [],
};

export const USER_FILTER_KEYS = [
  "requester",
  "connector",
  "recruiter",
  "my_pipeline",
] as const satisfies ReadonlyArray<keyof UserFilter>;

export function normalizeUserFilter(value: unknown): UserFilter {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const toStages = (key: keyof UserFilter): string[] => {
    const raw = source[key];
    return Array.isArray(raw)
      ? raw.filter((item): item is string => typeof item === "string")
      : [];
  };

  return {
    requester: toStages("requester"),
    connector: toStages("connector"),
    recruiter: toStages("recruiter"),
    my_pipeline: toStages("my_pipeline"),
  };
}

export function mergeUserFilter(
  current: UserFilter,
  patch: Partial<UserFilter>
): UserFilter {
  return {
    requester:
      patch.requester !== undefined ? patch.requester : current.requester,
    connector:
      patch.connector !== undefined ? patch.connector : current.connector,
    recruiter:
      patch.recruiter !== undefined ? patch.recruiter : current.recruiter,
    my_pipeline:
      patch.my_pipeline !== undefined ? patch.my_pipeline : current.my_pipeline,
  };
}
