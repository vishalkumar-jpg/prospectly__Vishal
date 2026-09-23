import { shellFullWidth } from "../builders/shell-full";
import { recruitmentFinanceHtml } from "../builders/recruitment-finance";
import type { RecruitingRole, Tour } from "../types";
import { moneyTour } from "./money-tour";

type FinanceTab = "connector" | "requester" | "candidate";

const ROLE_TAB: Record<RecruitingRole, FinanceTab> = {
  connector: "connector",
  recruiter: "requester",
  candidate: "candidate",
};

const ROLE_META: Record<RecruitingRole, { t: string; d: string }> = {
  connector: {
    t: "Connector Earnings",
    d: "Your payouts in <b>Connector Earnings</b> — track each status badge. Click <b>Continue</b> when ready.",
  },
  recruiter: {
    t: "Requester Spending",
    d: "What you paid per candidate. <b>Authorized</b> = held when you shortlisted, charged only when the interview is scheduled. Click <b>Continue</b> when ready.",
  },
  candidate: {
    t: "My Bonuses",
    d: "Your success-fee bonus shows here — same status badges as connector payouts. Click <b>Continue</b> when ready.",
  },
};

export function resolveMoneyTour(
  role: RecruitingRole | null | undefined
): Tour {
  const resolvedRole = role ?? "recruiter";
  const tab = ROLE_TAB[resolvedRole];
  const meta = ROLE_META[resolvedRole];

  return {
    id: "money",
    label: moneyTour.label,
    meta: [meta, moneyTour.meta[4]],
    screens: [
      () =>
        shellFullWidth(
          recruitmentFinanceHtml(tab, {
            showContinue: true,
            lockTabs: true,
          })
        ),
      moneyTour.screens[4],
    ],
  };
}
