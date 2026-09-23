import { IC, svgIc } from "../icons";

export type JobCardMenuState = "closed" | "open";

function dropItem(
  icon: string,
  label: string,
  opts?: { hot?: boolean; id?: string; callout?: string; danger?: boolean }
): string {
  const cls =
    "m-jp-drop-item" +
    (opts?.hot ? " m-jp-drop-hot qsd-hot" : "") +
    (opts?.danger ? " m-jp-drop-danger" : "");
  const attrs = [
    opts?.id ? ' id="' + opts.id + '"' : "",
    opts?.hot && opts.callout
      ? ' data-callout="' + opts.callout + '" data-co-side="right"'
      : "",
  ].join("");
  return (
    '<div class="' +
    cls +
    '"' +
    attrs +
    ">" +
    icon +
    "<span>" +
    label +
    "</span></div>"
  );
}

function jobCardHtml(opts: {
  title: string;
  company: string;
  location: string;
  desc: string;
  salary: string;
  perCandidate: string;
  feeBadge?: string;
  views: number;
  dim?: boolean;
  menuState?: JobCardMenuState;
  menuBtnCls?: string;
  menuAttrs?: string;
  dropdown?: string;
  viewBtnCls?: string;
  viewAttrs?: string;
}): string {
  return (
    '<div class="m-jp-card' +
    (opts.dim ? " m-jp-card-dim" : "") +
    '">' +
    '<div class="m-jp-card-top">' +
    '<div class="m-jp-menu-wrap">' +
    '<button type="button" class="' +
    (opts.menuBtnCls ?? "m-jp-menu-btn") +
    '"' +
    (opts.menuAttrs ?? ' id="jpMenuBtn"') +
    ">" +
    svgIc(
      '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
      16,
      16
    ) +
    "</button>" +
    (opts.dropdown ?? "") +
    "</div></div>" +
    '<h3 class="m-jp-card-title">' +
    opts.title +
    "</h3>" +
    '<div class="m-jp-meta"><span>🏢 ' +
    opts.company +
    "</span><span>📍 " +
    opts.location +
    "</span></div>" +
    '<p class="m-jp-desc">' +
    opts.desc +
    "</p>" +
    '<div class="m-jp-salary-box">' +
    "<span>Salary: <b>" +
    opts.salary +
    '</b></span><span class="m-jp-sep">|</span>' +
    "<span>Per Candidate: <b>" +
    opts.perCandidate +
    "</b></span></div>" +
    (opts.feeBadge
      ? '<span class="m-jp-fee-badge">' + opts.feeBadge + "</span>"
      : "") +
    '<div class="m-jp-foot">' +
    "<span>📅 Posted 12 Jun 2026 · 👁 " +
    opts.views +
    " views</span>" +
    '<span class="' +
    (opts.viewBtnCls ?? "m-jp-view-btn m-jp-view-outline") +
    '"' +
    (opts.viewAttrs ?? "") +
    ">View Candidates →</span></div></div>"
  );
}

export function myJobPostsPageHtml(opts: {
  menuState?: JobCardMenuState;
  hotMenu?: boolean;
  hotSendNotify?: boolean;
  hotViewCandidates?: boolean;
}): string {
  const menuState = opts.menuState ?? "closed";
  const menuBtnCls = "m-jp-menu-btn" + (opts.hotMenu ? " qsd-hot" : "");
  const menuAttrs = opts.hotMenu
    ? ' data-callout="Click the menu" data-co-side="right" id="jpMenuBtn"'
    : ' id="jpMenuBtn"';

  const dropdown =
    menuState === "open"
      ? '<div class="m-jp-dropdown">' +
        dropItem(IC.edit, "Edit") +
        dropItem(IC.send, "Send Notification", {
          hot: opts.hotSendNotify,
          id: "jpSendNotify",
          callout: "Click Send Notification",
        }) +
        dropItem(IC.ban, "Close Job Post", { danger: true }) +
        "</div>"
      : "";

  const viewBtnCls =
    "m-jp-view-btn" + (opts.hotViewCandidates ? " qsd-hot" : "");
  const viewAttrs = opts.hotViewCandidates
    ? ' data-callout="Click View Candidates" data-co-side="left" id="jpViewCand"'
    : ' id="jpViewCand"';

  return (
    '<div class="m-jp-page">' +
    '<div class="m-jp-head"><h1 class="m-jp-title">My Job Posts</h1></div>' +
    '<div class="m-jp-toolbar">' +
    '<div class="m-jp-tabs"><span class="m-jp-tab on">Active <b>2</b></span><span class="m-jp-tab">Closed <b>0</b></span></div></div>' +
    '<div class="m-jp-grid">' +
    jobCardHtml({
      title: "Principal AI Engineer",
      company: "Seno Technolab",
      location: "Ahmedabad, Gujarat, India",
      desc: "Lead architecture and deployment of enterprise AI solutions across LLMs and predictive analytics.",
      salary: "$10 – $50 / Hourly",
      perCandidate: "$206.35",
      feeBadge: "🏆 Success Fee $5,000 · 90D",
      views: 128,
      menuState,
      menuBtnCls,
      menuAttrs,
      dropdown,
      viewBtnCls,
      viewAttrs,
    }) +
    jobCardHtml({
      title: "Senior Frontend Engineer",
      company: "Echo Infotech",
      location: "Remote",
      desc: "Build scalable React applications for our growing product team.",
      salary: "$45 – $70 / Hourly",
      perCandidate: "$210.30",
      views: 96,
      dim: true,
    }) +
    "</div></div>"
  );
}

export function sendNotificationModalHtml(opts: {
  orgSelected?: boolean;
  hotSend?: boolean;
}): string {
  const orgSelected = opts.orgSelected ?? false;
  const orgBoxCls = "m-notify-org-box" + (orgSelected ? " filled" : "");
  const orgInner = orgSelected
    ? IC.building +
      '<span class="m-notify-org-val">1 Organization selected</span>'
    : IC.building +
      '<span class="m-notify-org-placeholder">Select Organization…</span>';
  const sendCls =
    "m-notify-send" +
    (opts.hotSend ? " qsd-hot" : "") +
    (orgSelected ? "" : " locked");
  const sendAttrs = opts.hotSend
    ? ' data-callout="Click Send Notification" data-co-side="top" id="notifySendBtn"'
    : ' id="notifySendBtn"';

  return (
    '<div class="m-notify-scene">' +
    '<div class="m-notify-backdrop">' +
    myJobPostsPageHtml({ menuState: "closed" }) +
    "</div>" +
    '<div class="m-notify-overlay">' +
    '<div class="m-notify-dialog">' +
    '<div class="m-notify-hero">' +
    '<button type="button" class="m-notify-x" aria-label="Close">' +
    IC.x +
    "</button>" +
    '<div class="m-notify-hero-row">' +
    '<div class="m-notify-hero-ic">' +
    IC.send +
    "</div>" +
    "<div><h4>Send Notification</h4>" +
    "<p>Email members of selected Organization about <b>Principal AI Engineer</b>.</p></div></div></div>" +
    '<div class="m-notify-body">' +
    "<label>Organization</label>" +
    '<div class="' +
    orgBoxCls +
    '" id="notifyOrgBox">' +
    orgInner +
    '<span class="m-notify-org-chev">' +
    IC.chevUpDown +
    "</span></div>" +
    (orgSelected
      ? '<div class="m-notify-recip" id="notifyRecip">' +
        IC.users +
        "<span>This will email <b>~48</b> user(s).</span></div>"
      : '<div class="m-notify-recip m-notify-recip-hidden" id="notifyRecip"></div>') +
    '<p class="m-notify-hint">Members of the selected Organizations will be emailed. People notified in an earlier send may receive this again.</p>' +
    "</div>" +
    '<div class="m-notify-foot">' +
    '<div class="m-notify-foot-actions">' +
    '<button type="button" class="m-notify-cancel">Cancel</button>' +
    '<button type="button" class="' +
    sendCls +
    '"' +
    sendAttrs +
    (orgSelected ? "" : " disabled") +
    ">" +
    IC.send +
    "<span>Send Notification</span></button></div></div></div></div></div>"
  );
}
