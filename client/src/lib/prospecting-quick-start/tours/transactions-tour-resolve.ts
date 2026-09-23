import { shellFullWidth, shellWithNav } from "../builders/shell-full";
import { prospectingFinanceHtml } from "../builders/prospecting-finance";
import type { PfFinanceTab } from "../builders/transactions-demo";
import { okScreen } from "../builders/ok-screen";
import type { ProspectingPath } from "../../recruiting-quick-start/types";
import type { Tour } from "../types";
import { transactionsTour } from "./transactions-tour";

const CLICKABLE_FINANCE_TABS: PfFinanceTab[] = [
  "overview",
  "transactions",
  "payouts",
];

const FINANCE_STEP_META = {
  t: "Explore your finances",
  d: "Switch between <b>Overview</b>, <b>Transactions</b>, and <b>Payouts</b> in the sidebar. Click <b>Continue</b> when ready.",
};

const NAV_SCREEN = () =>
  shellWithNav(
    "",
    "Dashboard",
    '<div class="m-h1">Where\'s my money? 💳</div><div class="m-sub">Earnings, spending, and payouts — one finance hub with full transparency.</div>' +
      '<div class="m-card"><b style="font-size:11px">You have pending payouts</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open <b>Transactions</b> to see everything.</div></div>',
    "transactions",
    'Click "Transactions"'
  );

const OK_SCREEN = () =>
  okScreen(
    "Money tracked! 💰",
    "Overview charts, transaction history, and payout tracking — all transparent. Payments and disputes are always available in the Finances sidebar."
  );

function financeScreen(tab: PfFinanceTab) {
  return () =>
    shellFullWidth(
      prospectingFinanceHtml(tab, {
        showContinue: true,
        clickableTabs: CLICKABLE_FINANCE_TABS,
      })
    );
}

export function resolveTransactionsTour(
  path: ProspectingPath | null | undefined
): Tour {
  const resolvedPath = path ?? "find-prospect";
  const defaultTab: PfFinanceTab =
    resolvedPath === "find-prospect" ? "transactions" : "payouts";

  return {
    id: "transactions",
    label: transactionsTour.label,
    meta: [
      transactionsTour.meta[0],
      FINANCE_STEP_META,
      transactionsTour.meta[4],
    ],
    screens: [NAV_SCREEN, financeScreen(defaultTab), OK_SCREEN],
  };
}
