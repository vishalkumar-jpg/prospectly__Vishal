import { shellWithNav, shellFullWidth } from "../builders/shell-full";
import { prospectingFinanceHtml } from "../builders/prospecting-finance";
import { okScreen } from "../builders/ok-screen";
import type { Tour } from "../types";

export const transactionsTour: Tour = {
  id: "transactions",
  label: "Track Your Money & Transactions",
  meta: [
    {
      t: "Open Transactions",
      d: "All your earnings, spending, and payouts live here. Click <b>Transactions</b> in the sidebar.",
    },
    {
      t: "Overview dashboard",
      d: "See your financial snapshot with earnings vs spending charts. Click the <b>Transactions</b> tab to view payment history.",
    },
    {
      t: "Transaction history",
      d: "Every bounty, payout, and marketplace share is listed here. Click <b>Payouts</b> to track what you’ve earned.",
    },
    {
      t: "Payout tracking",
      d: "Monitor gross and net connector payouts. Click <b>Continue</b> when you’re ready.",
    },
    {
      t: "Finances — fully transparent ✓",
      d: "Overview, transactions, and payouts — all in one place. <b>Payments</b> and <b>Disputes</b> are available anytime. Click <b>Done</b>.",
    },
  ],
  screens: [
    () =>
      shellWithNav(
        "",
        "Dashboard",
        '<div class="m-h1">Where\'s my money? 💳</div><div class="m-sub">Earnings, spending, and payouts — one finance hub with full transparency.</div>' +
          '<div class="m-card"><b style="font-size:11px">You have pending payouts</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open <b>Transactions</b> to see everything.</div></div>',
        "transactions",
        'Click "Transactions"'
      ),
    () => shellFullWidth(prospectingFinanceHtml("overview")),
    () => shellFullWidth(prospectingFinanceHtml("transactions")),
    () =>
      shellFullWidth(prospectingFinanceHtml("payouts", { showContinue: true })),
    () =>
      okScreen(
        "Money tracked! 💰",
        "Overview charts, transaction history, and payout tracking — all transparent. Payments and disputes are always available in the Finances sidebar."
      ),
  ],
};
