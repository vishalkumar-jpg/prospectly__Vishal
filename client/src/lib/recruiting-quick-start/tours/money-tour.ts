import { shellWithNav, shellFullWidth } from "../builders/shell-full";
import { recruitmentFinanceHtml } from "../builders/recruitment-finance";
import { okScreen } from "../builders/ok-screen";
import type { Tour } from "../types";

export const moneyTour: Tour = {
  id: "money",
  meta: [
    {
      t: "Open Transactions",
      d: "All money in one place — earnings and spending across tabs. Click <b>Transactions</b> in the sidebar.",
    },
    {
      t: "Connector Earnings",
      d: "Your payouts in <b>Connector Earnings</b> — track each status badge. Click <b>Requester Spending</b> to see what you paid.",
    },
    {
      t: "Requester Spending",
      d: "What you paid per candidate. <b>Authorized</b> = held when you shortlisted, charged only when the interview is scheduled. Click <b>My Bonuses</b> next.",
    },
    {
      t: "My Bonuses",
      d: "If you were hired through a referral, your success-fee bonus shows here — same status badges as connector payouts. Click <b>Continue</b> when you’re ready.",
    },
    {
      t: "Fully transparent ✓",
      d: "<b>Paid</b> = done · <b>Pending</b> = queued · <b>Processing</b> = on its way · <b>Authorized</b> = held · <b>Cancelled</b> = won’t happen. Click <b>Done</b>.",
    },
  ],
  label: "Track Your Money",
  screens: [
    () =>
      shellWithNav(
        "",
        "Dashboard",
        '<div class="m-h1">Where’s my money? 💳</div><div class="m-sub">Earnings and spending — one screen, simple tabs.</div>' +
          '<div class="m-card"><b style="font-size:11px">You have a pending payout</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open <b>Transactions</b> to see everything.</div></div>',
        "transactions",
        'Click "Transactions"'
      ),
    () => shellFullWidth(recruitmentFinanceHtml("connector")),
    () => shellFullWidth(recruitmentFinanceHtml("requester")),
    () =>
      shellFullWidth(
        recruitmentFinanceHtml("candidate", { showContinue: true })
      ),
    () =>
      okScreen(
        "Money — fully transparent ✓",
        "Paid = done · Pending = queued · Processing = on its way · Authorized = held not charged · Cancelled = won’t happen."
      ),
  ],
};
