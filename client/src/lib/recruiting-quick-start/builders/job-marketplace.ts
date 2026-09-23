import { IC } from "../icons";

function jobCard(
  title: string,
  company: string,
  location: string,
  desc: string,
  skills: string[],
  payout: string,
  salary: string,
  posted: string,
  views: number,
  opts?: { hotRefer?: boolean; hotShare?: boolean; dim?: boolean }
): string {
  const referCls =
    "m-jm-refer-btn" + (opts?.hotRefer ? " m-jm-refer-primary qsd-hot" : "");
  const referAttrs = opts?.hotRefer
    ? ' id="jmReferBtn" data-callout="Click Refer a Candidate" data-co-side="top"'
    : "";
  const shareCls =
    "m-jm-share-btn" + (opts?.hotShare ? " m-jm-share-hot qsd-hot" : "");
  const shareAttrs = opts?.hotShare
    ? ' id="jmShareBtn" data-callout="Click Share Job" data-co-side="top"'
    : "";
  const chips = skills
    .map((s) => '<span class="m-jm-skill">' + s + "</span>")
    .join("");

  return (
    '<div class="m-jm-card' +
    (opts?.dim ? " m-jm-card-dim" : "") +
    '">' +
    "<h3>" +
    title +
    "</h3>" +
    '<div class="m-jm-meta"><span>' +
    IC.building +
    company +
    "</span><span>" +
    IC.mapPin +
    location +
    "</span></div>" +
    '<p class="m-jm-desc">' +
    desc +
    "</p>" +
    '<div class="m-jm-skills">' +
    chips +
    "</div>" +
    '<div class="m-jm-payout-box">' +
    "<div><span>Connector Referral Payout</span><b>" +
    payout +
    "</b></div>" +
    "<div><span>Salary Range</span><b>" +
    salary +
    "</b></div></div>" +
    '<div class="m-jm-foot"><span>' +
    IC.calendar +
    "Posted " +
    posted +
    '</span><span class="m-jm-views">' +
    IC.eye +
    views +
    " views</span></div>" +
    '<div class="m-jm-actions">' +
    '<span class="' +
    referCls +
    '"' +
    referAttrs +
    ">" +
    "<span>Refer a Candidate</span></span>" +
    '<span class="' +
    shareCls +
    '"' +
    shareAttrs +
    ">" +
    IC.link +
    "<span>Share Job</span></span></div></div>"
  );
}

export function jobMarketplaceHtml(opts?: {
  hotRefer?: boolean;
  hotShare?: boolean;
  backdrop?: boolean;
}): string {
  const hotRefer = opts?.hotRefer && !opts?.backdrop;
  const hotShare = opts?.hotShare && !opts?.backdrop;
  return (
    '<div class="m-jm-page">' +
    '<div class="m-jm-head"><h1 class="m-jm-title">Job Marketplace</h1></div>' +
    '<div class="m-jm-grid">' +
    jobCard(
      "Insurance VA",
      "Office Beacon",
      "Philippines",
      "Previous experience as an insurance virtual assistant or insurance field in a related role.",
      ["Applied Epic", "AMS360", "Agency Zoom", "Ring Central"],
      "$1,600",
      "$427 – $460 / Monthly",
      "12 Jun 2026",
      42,
      { hotRefer: hotRefer, hotShare: hotShare }
    ) +
    jobCard(
      "Senior Laravel Lead Developer",
      "Office Beacon",
      "Ahmedabad, India",
      "Lead Laravel development for enterprise client projects.",
      ["Laravel", "PHP", "MySQL", "REST APIs"],
      "$2,400",
      "$45 – $70 / Hourly",
      "10 Jun 2026",
      28,
      { dim: true }
    ) +
    jobCard(
      "Digital Marketing Specialist",
      "Office Beacon",
      "Remote",
      "Plan and execute digital campaigns across SEO, paid media, and social channels.",
      ["SEO", "Google Ads", "Meta Ads", "Analytics"],
      "$1,200",
      "$35 – $55 / Hourly",
      "8 Jun 2026",
      19,
      { dim: true }
    ) +
    "</div></div>"
  );
}
