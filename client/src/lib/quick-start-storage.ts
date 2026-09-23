import type {
  DashboardModule,
  ProspectingPath,
  RecruitingRole,
} from "./recruiting-quick-start/types";

export const QS_STORAGE_KEY = "prospectly_quick_start";

const LEGACY_KEYS = [
  "prospectly_qs",
  "prospectly_qs_seen",
  "prospectly_pqs",
  "prospectly_pqs_seen",
] as const;

export type QsDone = {
  prospecting?: string[];
  recruiter?: string[];
  connector?: string[];
  candidate?: string[];
};

export type QsPersist = {
  module: DashboardModule | null;
  role: RecruitingRole | null;
  prospectingPath: ProspectingPath | null;
  seen: boolean;
  /** User closed the dashboard Quick Start panel manually — do not auto-open again. */
  dashboardPanelDismissed: boolean;
  done: QsDone;
};

const empty = (): QsPersist => ({
  module: null,
  role: null,
  prospectingPath: null,
  seen: false,
  dashboardPanelDismissed: false,
  done: {},
});

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function normalizePersist(value: unknown): QsPersist {
  const base = empty();
  if (!value || typeof value !== "object") return base;

  const parsed = value as Partial<QsPersist>;
  const doneCandidate =
    parsed.done && typeof parsed.done === "object" ? parsed.done : {};

  const role =
    parsed.role === "recruiter" ||
    parsed.role === "connector" ||
    parsed.role === "candidate"
      ? parsed.role
      : null;

  const module =
    parsed.module === "recruiting" || parsed.module === "prospecting"
      ? parsed.module
      : null;

  const prospectingPath =
    parsed.prospectingPath === "find-prospect" ||
    parsed.prospectingPath === "complete-request" ||
    parsed.prospectingPath === "opportunity"
      ? parsed.prospectingPath
      : null;

  return {
    module,
    role,
    prospectingPath,
    seen: Boolean(parsed.seen),
    dashboardPanelDismissed: Boolean(parsed.dashboardPanelDismissed),
    done: {
      prospecting: asStringList(
        (doneCandidate as Record<string, unknown>).prospecting
      ),
      recruiter: asStringList(
        (doneCandidate as Record<string, unknown>).recruiter
      ),
      connector: asStringList(
        (doneCandidate as Record<string, unknown>).connector
      ),
      candidate: asStringList(
        (doneCandidate as Record<string, unknown>).candidate
      ),
    },
  };
}

let data: QsPersist = empty();

function addTour(bucket: keyof QsDone, tourId: string, target: QsDone): void {
  const list = target[bucket] ?? [];
  if (!list.includes(tourId)) {
    target[bucket] = [...list, tourId];
  }
}

function migrateLegacy(): QsPersist | null {
  let merged: QsPersist | null = null;

  try {
    const qsRaw = localStorage.getItem("prospectly_qs");
    if (qsRaw) {
      merged = empty();
      const old = JSON.parse(qsRaw) as {
        recruitingRole?: RecruitingRole | null;
        dashboardModule?: DashboardModule | null;
        done?: Record<string, boolean>;
      };
      merged.module = old.dashboardModule ?? null;
      merged.role = old.recruitingRole ?? null;
      if (old.done) {
        for (const [key, val] of Object.entries(old.done)) {
          if (!val) continue;
          const parts = key.split(":");
          if (parts.length === 2) {
            const [role, tourId] = parts;
            if (
              role === "recruiter" ||
              role === "connector" ||
              role === "candidate"
            ) {
              addTour(role, tourId, merged.done);
            }
          }
        }
      }
    }

    const pqsRaw = localStorage.getItem("prospectly_pqs");
    if (pqsRaw) {
      merged ??= empty();
      const old = JSON.parse(pqsRaw) as { done?: Record<string, boolean> };
      if (old.done) {
        for (const [id, val] of Object.entries(old.done)) {
          if (val) addTour("prospecting", id, merged.done);
        }
      }
    }

    if (
      localStorage.getItem("prospectly_qs_seen") ||
      localStorage.getItem("prospectly_pqs_seen")
    ) {
      merged ??= empty();
      merged.seen = true;
    }
  } catch {
    /* ignore */
  }

  return merged;
}

function clearLegacyKeys(): void {
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}

function persist(): void {
  try {
    localStorage.setItem(QS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadQsStorage(): void {
  let shouldClearLegacy = false;
  try {
    const raw = localStorage.getItem(QS_STORAGE_KEY);
    if (raw) {
      data = normalizePersist(JSON.parse(raw));
      shouldClearLegacy = true;
    } else {
      const legacy = migrateLegacy();
      data = legacy ?? empty();
      if (legacy) {
        persist();
        shouldClearLegacy = true;
      }
    }
  } catch {
    const legacy = migrateLegacy();
    data = legacy ?? empty();
    if (legacy) {
      persist();
      shouldClearLegacy = true;
    }
  }
  if (shouldClearLegacy) clearLegacyKeys();
}

export function getQsStorage(): QsPersist {
  return data;
}

export function getRecruitingRole(): RecruitingRole | null {
  return data.role;
}

export function setRecruitingRole(role: RecruitingRole | null): void {
  data.role = role;
  persist();
}

export function getDashboardModule(): DashboardModule | null {
  return data.module;
}

export function setDashboardModule(mod: DashboardModule | null): void {
  data.module = mod;
  if (!mod) {
    data.role = null;
    data.prospectingPath = null;
  }
  persist();
}

export function getProspectingPath(): ProspectingPath | null {
  return data.prospectingPath;
}

export function setProspectingPath(path: ProspectingPath | null): void {
  data.prospectingPath = path;
  persist();
}

export function hasQsSeen(): boolean {
  return data.seen;
}

export function markQsSeen(): void {
  data.seen = true;
  persist();
}

export function hasDashboardPanelDismissed(): boolean {
  return data.dashboardPanelDismissed;
}

export function markDashboardPanelDismissed(): void {
  data.dashboardPanelDismissed = true;
  persist();
}

export function isRecruitingTourDone(
  tourId: string,
  role: RecruitingRole | null | undefined
): boolean {
  if (!role) return false;
  return (data.done[role] ?? []).includes(tourId);
}

export function markRecruitingTourDone(
  tourId: string,
  role?: RecruitingRole | null
): void {
  const r = role ?? data.role;
  if (!r) return;
  addTour(r, tourId, data.done);
  persist();
}

export function isProspectingTourDone(tourId: string): boolean {
  const path = data.prospectingPath;
  const list = data.done.prospecting ?? [];
  if (path && list.includes(`${path}:${tourId}`)) return true;
  if (list.includes(tourId)) return true;
  return false;
}

export function isProspectingTourDoneForPath(
  tourId: string,
  path: ProspectingPath
): boolean {
  const key = `${path}:${tourId}`;
  return (data.done.prospecting ?? []).includes(key);
}

export function markProspectingTourDone(
  tourId: string,
  path?: ProspectingPath | null
): void {
  const resolvedPath = path ?? data.prospectingPath;
  addTour("prospecting", prospectingTourKey(tourId, resolvedPath), data.done);
  persist();
}

function prospectingTourKey(
  tourId: string,
  path?: ProspectingPath | null
): string {
  const p = path ?? data.prospectingPath;
  return p ? `${p}:${tourId}` : tourId;
}

export function resetQsProgress(): void {
  const { module, role, prospectingPath, seen, dashboardPanelDismissed } = data;
  data = {
    module,
    role,
    prospectingPath,
    seen,
    dashboardPanelDismissed,
    done: {},
  };
  persist();
}
