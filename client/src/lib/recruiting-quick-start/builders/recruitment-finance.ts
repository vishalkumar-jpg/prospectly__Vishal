import { IC } from "../icons";

type FinanceTab = "connector" | "requester" | "candidate";

type BadgeTone = "em" | "bl" | "am" | "pu" | "ro" | "gr";

function statusBadge(label: string, tone: BadgeTone, icon: string): string {
  return (
    '<span class="m-rf-badge m-rf-badge-' +
    tone +
    '"><span class="m-rf-badge-ic">' +
    icon +
    "</span>" +
    label +
    "</span>"
  );
}

function nextFinanceTab(active: FinanceTab): FinanceTab | null {
  if (active === "connector") return "requester";
  if (active === "requester") return "candidate";
  return null;
}

function financeTabs(
  active: FinanceTab,
  hotTarget: FinanceTab | null,
  lockTabs?: boolean
): string {
  const tabs: { id: FinanceTab; label: string; icon: string }[] = [
    { id: "connector", label: "Connector Earnings", icon: IC.users },
    { id: "requester", label: "Requester Spending", icon: IC.receipt },
    { id: "candidate", label: "My Bonuses", icon: IC.award },
  ];
  return (
    '<div class="m-rf-tabs-wrap m-rf-tabs-' +
    active +
    (lockTabs ? " m-rf-tabs-locked" : "") +
    '"><div class="m-rf-tabs">' +
    tabs
      .map((t) => {
        const isActive = active === t.id;
        const isHot = hotTarget === t.id && !lockTabs;
        const hotAttrs = isHot
          ? ' data-callout="Click ' + t.label + '" data-co-side="top"'
          : "";
        const locked = lockTabs && !isActive;
        return (
          '<span class="m-rf-tab' +
          (isActive ? " on" : "") +
          (isHot ? " qsd-hot" : "") +
          (locked ? " locked" : "") +
          '"' +
          hotAttrs +
          ">" +
          t.icon +
          "<span>" +
          t.label +
          "</span></span>"
        );
      })
      .join("") +
    "</div></div>"
  );
}

function continueFooter(): string {
  return (
    '<div class="m-wiz-foot m-tour-foot">' +
    '<span class="m-btn continue qsd-hot" data-callout="Click Continue" data-co-side="top">Continue →</span>' +
    "</div>"
  );
}

function pageShell(
  tab: FinanceTab,
  tableHtml: string,
  opts?: { showContinue?: boolean; lockTabs?: boolean }
): string {
  const showContinue = opts?.showContinue;
  return (
    '<div class="m-rf-page">' +
    '<div class="m-rf-hero"><h1 class="m-rf-title">Recruitment Finance</h1></div>' +
    financeTabs(
      tab,
      showContinue ? null : nextFinanceTab(tab),
      opts?.lockTabs
    ) +
    tableHtml +
    (showContinue ? continueFooter() : "") +
    "</div>"
  );
}

function connectorTable(): string {
  return (
    '<div class="m-rf-table-wrap"><table class="m-rf-tbl"><thead><tr>' +
    "<th>Job</th><th>Candidate</th><th>You Earned</th><th>Status</th><th>Date</th><th></th>" +
    "</tr></thead><tbody>" +
    "<tr><td><b>Senior Software Engineer</b><span>TechCorp Inc.</span></td><td>John D.</td>" +
    '<td class="m-rf-pos">+$8,400.00</td><td>' +
    statusBadge("Paid", "em", IC.checkCircle) +
    '</td><td>18 May 2026, 8:00 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>Product Manager</b><span>InnovateLabs</span></td><td>Sarah M.</td>" +
    '<td class="m-rf-pos">+$6,125.00<small>-$250.00 credit</small></td><td>' +
    statusBadge("Processing", "bl", IC.clock) +
    '</td><td>12 May 2026, 3:45 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>Data Scientist</b><span>DataDriven Co.</span></td><td>Mike R.</td>" +
    '<td class="m-rf-pos">+$3,500.00</td><td><div class="m-rf-status-cell">' +
    statusBadge("Pending", "am", IC.clock) +
    '<span class="m-rf-shared">shared earning</span></div></td><td>8 May 2026, 2:30 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>UX Designer</b><span>DesignFirst</span></td><td>Anna L.</td>" +
    '<td class="m-rf-pos">+$4,200.00</td><td>' +
    statusBadge("Awaiting Setup", "am", IC.alertTriangle) +
    '</td><td>2 May 2026, 4:45 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>DevOps Engineer</b><span>CloudScale</span></td><td>Tom K.</td>" +
    '<td class="m-rf-pos">+$2,800.00</td><td>' +
    statusBadge("Failed", "ro", IC.ban) +
    '</td><td>28 Apr 2026, 4:50 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr></tbody></table></div>"
  );
}

function requesterTable(): string {
  return (
    '<div class="m-rf-table-wrap"><table class="m-rf-tbl"><thead><tr>' +
    "<th>Job</th><th>Candidate</th><th>Amount</th><th>Status</th><th>Date</th><th></th>" +
    "</tr></thead><tbody>" +
    "<tr><td><b>Senior Software Engineer</b><span>TechCorp Inc.</span></td>" +
    '<td>John D.<small>john.d@example.com</small></td><td class="m-rf-neg">-$12,000.00</td><td>' +
    statusBadge("Paid", "em", IC.checkCircle) +
    '</td><td>18 May 2026, 8:00 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>Product Manager</b><span>InnovateLabs</span></td>" +
    '<td>Sarah M.<small>sarah.m@example.com</small></td><td class="m-rf-neg">-$8,750.00</td><td>' +
    statusBadge("Authorized", "bl", IC.shield) +
    '</td><td>12 May 2026, 3:45 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>Data Scientist</b><span>DataDriven Co.</span></td>" +
    '<td>Mike R.<small>mike.r@example.com</small></td><td class="m-rf-neg">-$5,000.00</td><td>' +
    statusBadge("Pending", "am", IC.clock) +
    '</td><td>8 May 2026, 2:30 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    '<tr><td><b>Insurance VA</b><span>SecureLife Agency</span> <span class="m-rf-deposit">REFERRAL DEPOSIT</span></td>' +
    '<td>—</td><td class="m-rf-neg">-$2,500.00</td><td>' +
    statusBadge("Paid", "em", IC.checkCircle) +
    '</td><td>1 May 2026, 5:30 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>UX Designer</b><span>DesignFirst</span></td>" +
    '<td>Anna L.<small>anna.l@example.com</small></td><td class="m-rf-neg">-$6,000.00</td><td>' +
    statusBadge("Cancelled", "gr", IC.ban) +
    '</td><td>25 Apr 2026, 9:00 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>DevOps Engineer</b><span>CloudScale</span></td>" +
    '<td>Tom K.<small>tom.k@example.com</small></td><td class="m-rf-neg">-$7,900.00</td><td>' +
    statusBadge("Paid", "em", IC.checkCircle) +
    '</td><td>18 Apr 2026, 3:15 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr></tbody></table>" +
    '<div class="m-rf-note"><b>Authorized</b> = money held when you shortlisted, charged only when the interview is scheduled. <b>Cancelled</b> = the hold was released, you pay nothing.</div></div>'
  );
}

function bonusesTable(): string {
  return (
    '<div class="m-rf-table-wrap"><table class="m-rf-tbl"><thead><tr>' +
    "<th>Job</th><th>Company</th><th>You Earned</th><th>Status</th><th>Date</th><th></th>" +
    "</tr></thead><tbody>" +
    "<tr><td><b>Senior Software Engineer</b></td><td>TechCorp Inc.</td>" +
    '<td class="m-rf-pos">+$2,500.00</td><td>' +
    statusBadge("Paid", "em", IC.checkCircle) +
    '</td><td>20 May 2026, 3:30 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>Insurance VA</b></td><td>SecureLife Agency</td>" +
    '<td class="m-rf-pos">+$1,500.00</td><td>' +
    statusBadge("Processing", "bl", IC.clock) +
    '</td><td>14 May 2026, 8:00 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>Product Manager</b></td><td>InnovateLabs</td>" +
    '<td class="m-rf-pos">+$2,000.00</td><td>' +
    statusBadge("Awaiting Setup", "am", IC.alertTriangle) +
    '</td><td>6 May 2026, 4:45 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>UX Designer</b></td><td>DesignFirst</td>" +
    '<td class="m-rf-pos">+$1,800.00</td><td>' +
    statusBadge("Cancelled", "gr", IC.ban) +
    '</td><td>28 Apr 2026, 9:30 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr>" +
    "<tr><td><b>Data Scientist</b></td><td>DataDriven Co.</td>" +
    '<td class="m-rf-pos">+$2,200.00</td><td>' +
    statusBadge("Failed", "ro", IC.ban) +
    '</td><td>15 Apr 2026, 3:00 PM</td><td class="m-rf-eye">' +
    IC.eye +
    "</td></tr></tbody></table></div>"
  );
}

export function recruitmentFinanceHtml(
  tab: FinanceTab,
  opts?: { showContinue?: boolean; lockTabs?: boolean }
): string {
  if (tab === "connector") {
    return pageShell("connector", connectorTable(), opts);
  }
  if (tab === "requester") {
    return pageShell("requester", requesterTable(), opts);
  }
  return pageShell("candidate", bonusesTable(), opts);
}
