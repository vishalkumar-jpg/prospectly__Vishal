import { IC, svgIc } from "../icons";
import { REFER_DEMO } from "./refer-demo";

const IC_MAIL = svgIc(
  '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  12,
  12
);
const IC_TREND_UP = svgIc(
  '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  14,
  14
);
const IC_TREND_DOWN = svgIc(
  '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  14,
  14
);
const IC_XCIRCLE = svgIc(
  '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  14,
  14
);
const IC_ARCHIVE = svgIc(
  '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  12,
  12
);
const IC_FILTER = svgIc(
  '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  14,
  14
);

function skillChip(
  skill: string,
  variant: "req" | "miss" | "pref" = "req"
): string {
  const cls =
    variant === "miss"
      ? "m-rc-skill m-rc-skill-miss"
      : variant === "pref"
        ? "m-rc-skill m-rc-skill-pref"
        : "m-rc-skill";
  return '<span class="' + cls + '">' + skill + "</span>";
}

function referTabsBar(
  active: "inbox" | "closed",
  opts?: { showFilter?: boolean }
): string {
  const tab = (
    id: "inbox" | "closed",
    label: string,
    icon: string,
    badge?: number
  ) => {
    const on = active === id ? " on" : "";
    const badgeHtml =
      badge != null && badge > 0
        ? '<span class="m-rc-tab-badge">' + badge + "</span>"
        : "";
    return (
      '<span class="m-rc-tab' +
      on +
      '" data-tab="' +
      id +
      '">' +
      icon +
      "<span>" +
      label +
      "</span>" +
      badgeHtml +
      "</span>"
    );
  };

  return (
    '<div class="m-rc-tabs-shell">' +
    '<div class="m-rc-tabs-row">' +
    '<div class="m-rc-tabs-list" data-active="' +
    active +
    '">' +
    tab("inbox", "Inbox", IC.inbox, active === "inbox" ? 1 : 0) +
    tab("closed", "Closed", IC_ARCHIVE, 0) +
    "</div>" +
    '<div class="m-rc-tabs-actions">' +
    '<span class="m-rc-search">' +
    IC.search +
    "<span>Search candidates, jobs…</span></span>" +
    (opts?.showFilter
      ? '<span class="m-rc-filter">' +
        IC_FILTER +
        "<span>Filter Stages</span></span>"
      : "") +
    '<span class="m-rc-refresh">' +
    IC.refresh +
    "<span>Refresh</span></span></div></div></div>"
  );
}

function jobLeftPanel(): string {
  const req = REFER_DEMO.requiredSkills.map((s) => skillChip(s)).join("");
  const pref = REFER_DEMO.preferredSkills
    .map((s) => skillChip(s, "pref"))
    .join("");

  return (
    '<div class="m-rc-job-left">' +
    "<h3>" +
    REFER_DEMO.jobTitle +
    "</h3>" +
    '<div class="m-rc-job-meta">' +
    "<span>" +
    IC.building +
    REFER_DEMO.jobCompany +
    "</span>" +
    "<span>" +
    IC.mapPin +
    REFER_DEMO.jobLocation +
    "</span></div>" +
    '<div class="m-rc-job-block"><p class="m-rc-job-label">Description</p>' +
    '<p class="m-rc-job-desc">' +
    REFER_DEMO.jobDescription +
    "</p></div>" +
    '<div class="m-rc-job-block"><p class="m-rc-job-label">Required Skills</p>' +
    '<div class="m-rc-skills">' +
    req +
    "</div></div>" +
    '<div class="m-rc-job-block"><p class="m-rc-job-label">Preferred Skills</p>' +
    '<div class="m-rc-skills">' +
    pref +
    "</div></div>" +
    '<div class="m-rc-job-block"><p class="m-rc-job-label">Salary Range</p>' +
    '<div class="m-rc-salary-line">' +
    IC.dollar +
    "<b>" +
    REFER_DEMO.salaryLabel +
    "</b></div></div>" +
    '<div class="m-rc-job-block"><p class="m-rc-job-label">Job Posted At</p>' +
    '<div class="m-rc-salary-line">' +
    IC.calendar +
    "<span>" +
    REFER_DEMO.jobPostedAt +
    "</span></div></div>" +
    '<div class="m-rc-job-foot">' +
    '<span class="m-rc-matched-pill">1 Matched Candidate</span>' +
    '<span class="m-rc-details-btn">' +
    IC.fileText +
    " Details</span></div></div>"
  );
}

function inboxCandidateCard(): string {
  const missing = REFER_DEMO.requiredSkills
    .map((s) => skillChip(s, "miss"))
    .join("");

  return (
    '<div class="m-rc-cand-card">' +
    '<div class="m-rc-cand-top">' +
    '<div class="m-rc-cand-av">' +
    REFER_DEMO.candidateInitials +
    "</div>" +
    '<div class="m-rc-cand-info">' +
    '<div class="m-rc-cand-name-row">' +
    "<b>" +
    REFER_DEMO.candidateName +
    "</b>" +
    '<span class="m-rc-upload-badge">Resume uploaded</span></div>' +
    '<p class="m-rc-cand-email">' +
    IC_MAIL +
    REFER_DEMO.candidateEmailMasked +
    "</p></div>" +
    '<div class="m-rc-match-ring m-rc-match-low">' +
    "<b>" +
    REFER_DEMO.matchScore +
    "%</b><span>Match</span></div></div>" +
    '<div class="m-rc-skill-panel">' +
    '<div class="m-rc-skill-panel-head">' +
    IC_TREND_DOWN +
    "<span>Missing Skills</span></div>" +
    '<div class="m-rc-skills">' +
    missing +
    "</div></div>" +
    '<div class="m-rc-cand-actions">' +
    '<button type="button" class="m-rc-decline">' +
    IC_XCIRCLE +
    " Don't Refer</button>" +
    '<button type="button" class="m-rc-approve qsd-hot" id="refApproveBtn" data-callout="Click Refer Candidate" data-co-side="top">' +
    IC.thumbsUp +
    " Refer Candidate</button></div></div>"
  );
}

function connectorKanbanCard(): string {
  return (
    '<div class="m-rc-kcard" id="refPipeCard">' +
    '<div class="m-rc-kcard-top">' +
    '<div class="m-rc-kcard-av m-rc-kcard-av-amber">' +
    REFER_DEMO.candidateInitials +
    "</div>" +
    "<b>" +
    REFER_DEMO.candidateName +
    "</b>" +
    '<span class="m-rc-kcard-score m-rc-match-low">' +
    REFER_DEMO.matchScore +
    "%</span></div>" +
    '<div class="m-rc-kcard-rows">' +
    '<div class="m-rc-kcard-row">' +
    IC.briefcase +
    "<span>" +
    REFER_DEMO.jobTitle +
    "</span></div>" +
    '<div class="m-rc-kcard-row">' +
    IC.building +
    "<span>" +
    REFER_DEMO.jobCompany +
    "</span></div>" +
    '<div class="m-rc-kcard-row">' +
    IC_MAIL +
    "<span>" +
    REFER_DEMO.candidateEmailMasked +
    "</span></div>" +
    '<div class="m-rc-kcard-row">' +
    IC.dollar +
    '<span><b class="m-rc-payout">' +
    REFER_DEMO.connectorPayoutLabel +
    "</b> payout</span></div></div></div>"
  );
}

function kanbanColumn(
  label: string,
  color: string,
  headBorder: string,
  countBg: string,
  countText: string,
  dotRing: string,
  body: string
): string {
  return (
    '<div class="m-rc-kcol">' +
    '<div class="m-rc-khead" style="border-bottom-color:' +
    headBorder +
    '">' +
    '<div class="m-rc-khead-left">' +
    '<span class="m-rc-kdot" style="background:' +
    color +
    ";box-shadow:0 0 0 3px " +
    dotRing +
    '"></span>' +
    "<b>" +
    label +
    "</b></div>" +
    '<span class="m-rc-kcount" style="background:' +
    countBg +
    ";color:" +
    countText +
    '">' +
    (body.includes("m-rc-kcard") ? "1" : "0") +
    "</span></div>" +
    '<div class="m-rc-kbody">' +
    body +
    "</div></div>"
  );
}

function emptyColumn(): string {
  return (
    '<div class="m-rc-kempty">' + IC.users + "<span>No candidates</span></div>"
  );
}

function referPageHead(): string {
  return (
    '<div class="m-rc-head"><h1>Refer Candidates</h1>' +
    "<p>Track your candidate referrals and earnings</p></div>"
  );
}

export function referCandidatesInboxHtml(): string {
  return (
    '<div class="m-rc-page">' +
    referPageHead() +
    referTabsBar("inbox") +
    '<div class="m-rc-section-head">' +
    IC.sparkles +
    "<b>AI-Matched Opportunities</b>" +
    '<span class="m-rc-pill">1 candidate</span></div>' +
    '<div class="m-rc-inbox-card">' +
    jobLeftPanel() +
    '<div class="m-rc-job-right">' +
    inboxCandidateCard() +
    "</div></div></div>"
  );
}

export function referCandidatesPipelineHtml(): string {
  const cols = [
    kanbanColumn(
      "Consent Pending",
      "#f59e0b",
      "#f59e0b",
      "#fef3c7",
      "#b45309",
      "rgba(245,158,11,0.15)",
      connectorKanbanCard()
    ),
    kanbanColumn(
      "Consent Accepted",
      "#3b82f6",
      "#3b82f6",
      "#dbeafe",
      "#1d4ed8",
      "rgba(59,130,246,0.15)",
      emptyColumn()
    ),
    kanbanColumn(
      "Shortlisted",
      "#a855f7",
      "#a855f7",
      "#f3e8ff",
      "#7e22ce",
      "rgba(168,85,247,0.15)",
      emptyColumn()
    ),
    kanbanColumn(
      "Interview Invite Sent",
      "#3b82f6",
      "#3b82f6",
      "#dbeafe",
      "#1d4ed8",
      "rgba(59,130,246,0.15)",
      emptyColumn()
    ),
    kanbanColumn(
      "Interview Scheduled",
      "#22c55e",
      "#22c55e",
      "#dcfce7",
      "#15803d",
      "rgba(34,197,94,0.15)",
      emptyColumn()
    ),
  ];

  return (
    '<div class="m-rc-scene">' +
    '<div class="m-rc-page m-rc-page-pipe">' +
    referPageHead() +
    referTabsBar("inbox", { showFilter: true }) +
    '<div class="m-rc-kanban-scroll"><div class="m-rc-kanban">' +
    cols.join("") +
    "</div></div></div>" +
    '<div class="m-wiz-foot m-tour-foot">' +
    '<span class="m-btn continue qsd-hot" id="refPipeContinue" data-callout="Click Continue" data-co-side="top">Continue →</span>' +
    "</div></div>"
  );
}
