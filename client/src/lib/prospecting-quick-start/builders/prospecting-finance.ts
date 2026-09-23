import { IC } from "../icons";
import {
  PF_CHART_BARS,
  PF_PAYOUT_ROWS,
  PF_PAYOUT_TIMELINE,
  PF_RECENT_TRANSACTIONS,
  PF_TRANSACTION_ROWS,
  type PfFinanceTab,
} from "./transactions-demo";

function nextHotTab(active: PfFinanceTab): PfFinanceTab | null {
  if (active === "overview") return "transactions";
  if (active === "transactions") return "payouts";
  return null;
}

function financeRail(
  active: PfFinanceTab,
  hot: PfFinanceTab | null,
  opts?: { lockTabs?: boolean; clickableTabs?: PfFinanceTab[] }
): string {
  const clickable = new Set(opts?.clickableTabs ?? []);
  const lockTabs = opts?.lockTabs;
  const items: {
    id: PfFinanceTab;
    label: string;
    icon: string;
    elId?: string;
    disabled?: boolean;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: IC.wallet,
      elId: "pfTabOverview",
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: IC.receipt,
      elId: "pfTabTransactions",
    },
    { id: "payouts", label: "Payouts", icon: IC.dollar, elId: "pfTabPayouts" },
    { id: "payments", label: "Payments", icon: IC.creditCard, disabled: true },
    { id: "disputes", label: "Disputes", icon: IC.scale, disabled: true },
  ];

  return (
    '<div class="m-pf-rail"><small>Finances</small>' +
    items
      .map((item) => {
        const isOn = active === item.id;
        const isHot = hot === item.id && !lockTabs;
        const isClickable = clickable.has(item.id);
        const isDisabled = item.disabled || (lockTabs && !isOn && !isClickable);
        const hotAttrs =
          isHot && item.elId
            ? ' data-callout="Click ' + item.label + '" data-co-side="right"'
            : "";
        const tag = isClickable && !isDisabled ? "button" : "span";
        const buttonAttrs =
          tag === "button"
            ? ' type="button" data-pf-tab="' + item.id + '"'
            : "";
        return (
          "<" +
          tag +
          ' class="m-pf-tab' +
          (isOn ? " on" : "") +
          (isHot ? " qsd-hot" : "") +
          (isDisabled ? " dis" : "") +
          '"' +
          (item.elId ? ' id="' + item.elId + '"' : "") +
          buttonAttrs +
          hotAttrs +
          ">" +
          item.icon +
          "<span>" +
          item.label +
          "</span></" +
          tag +
          ">"
        );
      })
      .join("") +
    "</div>"
  );
}

function barChartMock(): string {
  const max = 420;
  const bars = PF_CHART_BARS.map((b) => {
    const eh = Math.round((b.earn / max) * 100);
    const sh = Math.round((b.spend / max) * 100);
    return (
      '<div class="m-pf-bar-col"><div class="m-pf-bars">' +
      '<span class="m-pf-bar gn" style="height:' +
      eh +
      '%"></span>' +
      '<span class="m-pf-bar rd" style="height:' +
      sh +
      '%"></span></div><small>' +
      b.label +
      "</small></div>"
    );
  }).join("");

  return (
    '<div class="m-pf-chart-card">' +
    '<div class="m-pf-chart-head"><b>' +
    IC.trendingUp +
    "Financial Overview</b>" +
    '<div class="m-pf-ranges"><span>7D</span><span class="on">30D</span><span>90D</span><span>1Y</span><span>All</span></div></div>' +
    '<div class="m-pf-chart-legend"><span><i class="gn"></i>Earnings</span><span><i class="rd"></i>Spending</span></div>' +
    '<div class="m-pf-bar-chart">' +
    bars +
    "</div></div>"
  );
}

function donutMock(): string {
  return (
    '<div class="m-pf-chart-card">' +
    '<div class="m-pf-chart-head"><b>' +
    IC.pie +
    "Transaction Breakdown</b></div>" +
    '<div class="m-pf-donut-wrap"><div class="m-pf-donut"></div>' +
    '<div class="m-pf-donut-legend">' +
    "<span>Introduction bounties</span>" +
    "<span>Connector payouts</span>" +
    "<span>Marketplace shares</span>" +
    "<span>Platform fees</span>" +
    "<b>Total Volume: $2,810</b></div></div></div>"
  );
}

function badge(label: string, tone: string): string {
  return (
    '<span class="m-pf-badge m-pf-badge-' + tone + '">' + label + "</span>"
  );
}

function recentTransactionsCard(): string {
  const rows = PF_RECENT_TRANSACTIONS.map(
    (r) =>
      '<div class="m-pf-activity-row">' +
      '<div class="m-pf-activity-main"><b>' +
      r.contact +
      "</b><span>" +
      r.desc +
      '</span></div><div class="m-pf-activity-end">' +
      '<em class="' +
      (r.positive ? "pos" : "neg") +
      '">' +
      (r.positive ? "+" : "-") +
      "$" +
      r.amount.toLocaleString() +
      "</em>" +
      badge(r.status, r.tone) +
      "<small>" +
      r.date +
      "</small></div></div>"
  ).join("");

  return (
    '<div class="m-pf-mini-card m-pf-activity-card">' +
    "<b>Recent Transactions</b>" +
    '<span class="m-pf-mini-sub">Latest 5 transactions</span>' +
    '<div class="m-pf-activity-list">' +
    rows +
    "</div></div>"
  );
}

function payoutTimelineCard(): string {
  const rows = PF_PAYOUT_TIMELINE.map(
    (r) =>
      '<div class="m-pf-activity-row">' +
      '<div class="m-pf-activity-main"><b>' +
      r.contact +
      "</b><span>" +
      r.meeting +
      '</span></div><div class="m-pf-activity-end">' +
      '<em class="pos">+$' +
      r.amount.toLocaleString() +
      "</em>" +
      badge(r.status, r.tone) +
      "<small>" +
      r.date +
      "</small></div></div>"
  ).join("");

  return (
    '<div class="m-pf-mini-card m-pf-activity-card">' +
    "<b>Payout Timeline</b>" +
    '<span class="m-pf-mini-sub">Track your earnings and payouts</span>' +
    '<div class="m-pf-activity-list">' +
    rows +
    "</div></div>"
  );
}

function overviewBody(): string {
  return (
    '<div class="m-pf-overview-grid">' +
    barChartMock() +
    donutMock() +
    "</div>" +
    '<div class="m-pf-overview-bottom">' +
    recentTransactionsCard() +
    payoutTimelineCard() +
    "</div>"
  );
}

function transactionsBody(): string {
  const rows = PF_TRANSACTION_ROWS.map(
    (r) =>
      "<tr><td><b>" +
      r.contact +
      "</b>" +
      (r.via ? "<small>via " + r.via + "</small>" : "") +
      "</td><td>" +
      r.meeting +
      "</td><td>" +
      badge(r.stage, r.stageTone) +
      "</td><td><b>$" +
      r.amount.toLocaleString() +
      ".00</b></td><td>" +
      badge(r.payment, r.payTone) +
      "</td><td>" +
      r.date +
      '</td><td><button type="button" class="m-pf-view">View</button></td></tr>'
  ).join("");

  return (
    '<div class="m-pf-table-wrap"><table class="m-pf-tbl"><thead><tr>' +
    "<th>Contact</th><th>Meeting Title</th><th>Stage</th><th>Amount</th><th>Payment</th><th>Date</th><th>Action</th>" +
    "</tr></thead><tbody>" +
    rows +
    "</tbody></table></div>"
  );
}

function payoutsBody(): string {
  const rows = PF_PAYOUT_ROWS.map(
    (r) =>
      "<tr><td><b>" +
      r.contact +
      "</b></td><td>" +
      r.meeting +
      "</td><td>$" +
      r.gross.toLocaleString() +
      '.00</td><td>—</td><td class="pos">+$' +
      r.net.toLocaleString() +
      ".00</td><td>" +
      badge(r.status, r.statusTone) +
      "</td><td>" +
      r.date +
      '</td><td><button type="button" class="m-pf-view">View</button></td></tr>'
  ).join("");

  return (
    '<div class="m-pf-table-wrap"><table class="m-pf-tbl payouts"><thead><tr>' +
    "<th>Contact</th><th>Meeting Title</th><th>Gross Amount</th><th>Credits</th><th>Net Payout</th><th>Status</th><th>Payout Date</th><th>Action</th>" +
    "</tr></thead><tbody>" +
    rows +
    "</tbody></table></div>"
  );
}

function payoutsContinueFooter(): string {
  return (
    '<div class="m-pf-foot m-wiz-foot">' +
    '<button type="button" class="m-pf-continue qsd-hot continue" id="pfContinueBtn" data-callout="Click Continue" data-co-side="top">Continue →</button></div>'
  );
}

const PAGE_META: Record<
  PfFinanceTab,
  { heading: string; description: string }
> = {
  overview: {
    heading: "Overview",
    description:
      "Earnings snapshot, charts, and recent activity across your finances",
  },
  transactions: {
    heading: "Transactions",
    description: "View and manage your payment transactions",
  },
  payouts: {
    heading: "Payouts",
    description: "Track earnings and payouts from your introductions",
  },
  payments: {
    heading: "Payments",
    description: "Manage saved cards and payout connection settings",
  },
  disputes: {
    heading: "Disputes",
    description: "Review and file disputes related to introductions",
  },
};

export function prospectingFinanceTabContent(tab: PfFinanceTab): string {
  switch (tab) {
    case "overview":
      return overviewBody();
    case "transactions":
      return transactionsBody();
    case "payouts":
      return payoutsBody();
    default:
      return '<div class="m-pf-empty-state">This section is coming soon.</div>';
  }
}

export function prospectingFinancePageMeta(tab: PfFinanceTab): {
  heading: string;
  description: string;
} {
  return PAGE_META[tab];
}

export function prospectingFinanceHtml(
  tab: PfFinanceTab,
  opts?: {
    showContinue?: boolean;
    lockTabs?: boolean;
    clickableTabs?: PfFinanceTab[];
  }
): string {
  const meta = PAGE_META[tab];
  const hot = opts?.showContinue || opts?.lockTabs ? null : nextHotTab(tab);
  const body = prospectingFinanceTabContent(tab);

  return (
    '<div class="m-pf-page">' +
    '<div class="m-pf-hero"><div class="m-pf-hero-text"><h1>' +
    meta.heading +
    "</h1><p>" +
    meta.description +
    "</p></div></div>" +
    '<div class="m-pf-layout">' +
    financeRail(tab, hot, opts) +
    '<div class="m-pf-main">' +
    body +
    "</div></div>" +
    (opts?.showContinue ? payoutsContinueFooter() : "") +
    "</div>"
  );
}
