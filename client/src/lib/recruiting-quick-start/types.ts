export type TourMeta = { t: string; d: string };

export type Tour = {
  id: string;
  label: string;
  meta: TourMeta[];
  screens: (() => string)[];
};

export type RecruitingRole = "recruiter" | "connector" | "candidate";
export type ProspectingPath =
  | "find-prospect"
  | "complete-request"
  | "opportunity";
export type DashboardModule = "recruiting" | "prospecting";
export type QuickStartContext = "recruiting" | "dashboard";

export type QuickStartState = {
  recruitingRole?: RecruitingRole | null;
  dashboardModule?: DashboardModule | null;
};

export type PayoutBindState = {
  empHire: boolean;
  outHire: boolean;
  days: number;
};
