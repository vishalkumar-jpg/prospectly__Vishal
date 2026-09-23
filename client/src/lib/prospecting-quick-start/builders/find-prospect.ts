import { IC } from "../icons";
import {
  DEMO_PROSPECT_CARDS,
  FIND_PROSPECT_DEMO as D,
  type DemoProspectCard,
} from "./find-prospect-demo";

function esc(text: string): string {
  return text.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function prospectModalScene(backdropHtml: string, dialogHtml: string): string {
  return (
    '<div class="m-ph-scene">' +
    '<div class="m-ph-backdrop">' +
    backdropHtml +
    "</div>" +
    '<div class="m-ph-overlay m-ph-overlay-dialog">' +
    dialogHtml +
    "</div></div>"
  );
}

function inputRow(
  icon: string,
  placeholder: string,
  value: string,
  id?: string
): string {
  const filled = value ? " filled" : "";
  return (
    '<div class="m-ph-field">' +
    '<span class="m-ph-field-ic">' +
    icon +
    "</span>" +
    '<input class="m-ph-inp' +
    filled +
    '" placeholder="' +
    esc(placeholder) +
    '" value="' +
    esc(value) +
    '" readonly' +
    (id ? ' id="' + id + '"' : "") +
    " /></div>"
  );
}

export function findProspectsPageHtml(opts?: {
  filled?: boolean;
  showResults?: boolean;
  hotMoreInfo?: boolean;
}): string {
  const showResults = opts?.showResults;
  return (
    '<div class="m-ph-page">' +
    '<div class="m-ph-head"><h1>Find Prospects</h1></div>' +
    searchPanel({
      filled: opts?.filled || showResults,
      showHint: showResults || opts?.filled,
    }) +
    (showResults ? prospectResultsGrid(opts?.hotMoreInfo) : "") +
    "</div>"
  );
}

function searchPanel(opts?: { filled?: boolean; showHint?: boolean }): string {
  const filled = opts?.filled;
  const showHint = opts?.showHint ?? filled;
  return (
    '<div class="m-ph-search-card">' +
    '<div class="m-ph-search-grid">' +
    '<div class="m-ph-search-col">' +
    '<div class="m-ph-search-head">' +
    IC.linkedin +
    "<div><b>Search by LinkedIn Profile</b><span>Already know who you're looking to meet? Enter their LinkedIn profile below to find them.</span></div></div>" +
    inputRow(
      IC.linkedin,
      "linkedin.com/in/username",
      filled ? D.linkedin : "",
      "phLinkedinIn"
    ) +
    "</div>" +
    '<div class="m-ph-search-col">' +
    '<div class="m-ph-search-head">' +
    IC.user +
    "<div><b>Search by Name</b><span>Don't have their LinkedIn profile? Enter their information here.</span></div></div>" +
    '<div class="m-ph-field-grid">' +
    inputRow(IC.user, "Full name", filled ? D.prospectName : "", "phNameIn") +
    inputRow(IC.atSign, "Email address", filled ? D.email : "", "phEmailIn") +
    inputRow(IC.building, "Company", filled ? D.company : "", "phCompanyIn") +
    inputRow(IC.globe, "Website", filled ? D.website : "", "phWebsiteIn") +
    "</div></div></div>" +
    (showHint
      ? '<div class="m-ph-hint success" id="phSearchHint">' +
        IC.checkCircle +
        "Ready to search with profile details.</div>"
      : '<div class="m-ph-hint info" id="phSearchHint">' +
        IC.info +
        "Enter a LinkedIn URL, or provide name with email/company/website</div>") +
    '<button type="button" class="m-ph-search-btn' +
    (filled ? " ready" : "") +
    '" id="phSearchBtn"' +
    (filled
      ? ' data-callout="Click Search Prospects" data-co-side="top"'
      : "") +
    ">" +
    IC.search +
    "Search Prospects</button></div>"
  );
}

function contactLink(label: string, fullWidth = false): string {
  return (
    '<a class="m-ph-contact-link' +
    (fullWidth ? " full" : "") +
    '" href="#">' +
    IC.linkedin +
    "<span>" +
    label +
    "</span>" +
    IC.externalLink +
    "</a>"
  );
}

function prospectCard(card: DemoProspectCard): string {
  const hotAttrs = card.hot
    ? ' id="phMoreInfoBtn" data-callout="Click More Info" data-co-side="top"'
    : "";
  const descLong = card.description.length > 90;
  return (
    '<article class="m-ph-card' +
    (card.dim ? " dim" : "") +
    '">' +
    '<div class="m-ph-card-inner">' +
    '<div class="m-ph-card-top">' +
    '<div class="m-ph-av ' +
    (card.avatarClass || "grad-violet") +
    '">' +
    card.initials +
    "</div>" +
    '<div class="m-ph-card-main">' +
    '<div class="m-ph-card-title-row">' +
    '<div class="m-ph-card-ident">' +
    "<h3>" +
    esc(card.name) +
    "</h3>" +
    '<span class="m-ph-li-btn">' +
    IC.linkedin +
    "</span></div></div>" +
    (card.title
      ? '<div class="m-ph-meta-line">' +
        IC.idCard +
        "<span>" +
        esc(card.title) +
        "</span></div>"
      : "") +
    (card.industry
      ? '<div class="m-ph-meta-line uppercase">' +
        IC.briefcase +
        "<span>" +
        esc(card.industry) +
        "</span></div>"
      : "") +
    (card.company
      ? '<div class="m-ph-meta-line uppercase">' +
        IC.building +
        "<span>" +
        esc(card.company) +
        "</span></div>"
      : "") +
    "</div></div>" +
    (card.location
      ? '<div class="m-ph-loc">' +
        IC.mapPin +
        "<span>" +
        esc(card.location) +
        "</span></div>"
      : "") +
    '<div class="m-ph-about">' +
    '<div class="m-ph-about-head"><span>' +
    IC.building +
    "About Company</span>" +
    '<span class="m-ph-emp-badge">' +
    card.employees +
    " employees</span></div>" +
    "<p>" +
    esc(card.description) +
    "</p>" +
    (descLong
      ? '<button type="button" class="m-ph-read-more">Read more</button>'
      : "") +
    "</div>" +
    '<div class="m-ph-contact-sec">' +
    '<div class="m-ph-contact-label">Contact &amp; Web</div>' +
    '<div class="m-ph-contact-grid">' +
    contactLink("Company LinkedIn") +
    contactLink("Company Website") +
    "</div></div>" +
    '<div class="m-ph-payout-box">' +
    '<div class="m-ph-payout-label">Referral Payout Amount</div>' +
    '<div class="m-ph-payout-amt">$' +
    card.bounty.toLocaleString() +
    "</div></div>" +
    '<button type="button" class="m-ph-more-btn' +
    (card.hot ? " qsd-hot" : "") +
    '"' +
    hotAttrs +
    ">" +
    IC.target +
    "More Info</button></div></article>"
  );
}

function prospectResultsGrid(hotMoreInfo?: boolean): string {
  const cards = DEMO_PROSPECT_CARDS.map((c) =>
    prospectCard({ ...c, hot: hotMoreInfo && c.id === "sarah" })
  ).join("");
  return (
    '<div class="m-ph-results m-ref-fade-in" id="phResults">' +
    '<div class="m-ph-grid">' +
    cards +
    "</div></div>"
  );
}

function profileHero(): string {
  return (
    '<div class="m-ph-profile-hero">' +
    '<div class="m-ph-profile-hero-inner">' +
    '<div class="m-ph-profile-av grad-emerald lg">SC</div>' +
    '<div class="m-ph-profile-hero-main">' +
    "<h2>" +
    D.prospectName +
    "</h2>" +
    '<p class="role">' +
    IC.briefcase +
    "<span>" +
    D.title +
    " at " +
    D.company +
    "</span></p>" +
    '<p class="loc">' +
    IC.mapPin +
    "<span>" +
    D.location +
    "</span></p>" +
    '<div class="m-ph-profile-links">' +
    '<a href="#">' +
    IC.linkedin +
    "LinkedIn Profile</a>" +
    '<span class="verified">' +
    IC.checkCircle +
    "Email Verified</span></div></div>" +
    '<div class="m-ph-profile-hero-side">' +
    '<div class="m-ph-payout-chip"><b>$' +
    D.bounty +
    "</b><span>Referral Payout</span></div>" +
    '<button type="button" class="m-ph-request-btn qsd-hot" id="phRequestIntroBtn" data-callout="Click Request Intro" data-co-side="left">' +
    IC.send +
    "Request Intro</button></div></div></div>"
  );
}

function profileBody(): string {
  const deptBadges = D.departments
    .map((d) => '<span class="m-ph-badge purple">' + d + "</span>")
    .join("");
  const fnBadges = D.functions
    .map((f) => '<span class="m-ph-badge green">' + f + "</span>")
    .join("");
  const jobs = D.employment
    .map(
      (job, i) =>
        '<div class="m-ph-job' +
        (job.current ? " current" : "") +
        '"><span class="m-ph-job-dot"></span><div><b>' +
        job.title +
        "</b><span>" +
        job.company +
        "</span><small>" +
        job.range +
        "</small></div></div>"
    )
    .join("");

  return (
    '<div class="m-ph-profile-body">' +
    '<div class="m-ph-profile-layout">' +
    '<div class="m-ph-profile-left">' +
    '<section class="m-ph-sec-card"><h3>Professional Headline</h3><p class="headline">' +
    D.headline +
    '</p><div class="m-ph-kv"><span>Seniority:</span>' +
    '<span class="m-ph-badge blue">' +
    D.seniority +
    "</span></div>" +
    '<div class="m-ph-kv"><span>Department:</span><div class="m-ph-badges">' +
    deptBadges +
    "</div></div>" +
    '<div class="m-ph-kv"><span>Functions:</span><div class="m-ph-badges">' +
    fnBadges +
    "</div></div></section>" +
    '<section class="m-ph-sec-card"><h3>Employment History</h3><div class="m-ph-jobs">' +
    jobs +
    "</div></section>" +
    '<section class="m-ph-sec-card"><h3>Skills &amp; Tags</h3><div class="m-ph-badges">' +
    '<span class="m-ph-badge blue">' +
    D.seniority +
    "</span>" +
    deptBadges +
    fnBadges +
    "</div></section></div>" +
    '<div class="m-ph-profile-right">' +
    '<section class="m-ph-sec-card org"><h3>Organization Spotlight</h3>' +
    '<div class="m-ph-org-head"><div class="m-ph-org-logo">N</div><div><b>' +
    D.company +
    '</b><a href="#">' +
    IC.link +
    D.website +
    "</a></div></div>" +
    "<p>" +
    D.companyDescription +
    "</p>" +
    '<div class="m-ph-org-meta">' +
    "<span>" +
    IC.mapPin +
    D.location +
    "</span>" +
    "<span>" +
    IC.building +
    D.industry +
    "</span>" +
    "<span>" +
    IC.users +
    D.employees +
    " employees</span>" +
    "<span>" +
    IC.trendingUp +
    D.orgRevenue +
    "</span>" +
    "<span>" +
    IC.calendar +
    "Founded " +
    D.orgFounded +
    "</span></div>" +
    '<div class="m-ph-org-links"><a href="#">' +
    IC.globe +
    'Website</a><a href="#">' +
    IC.linkedin +
    "LinkedIn</a></div></section></div></div></div>"
  );
}

export function findProspectsWithProfileModal(): string {
  return prospectModalScene(
    findProspectsPageHtml({ filled: true, showResults: true }),
    '<div class="m-ph-dialog m-ph-dialog-profile">' +
      '<div class="m-ph-dialog-sticky m-ph-dialog-sticky-center">' +
      "<b>" +
      D.prospectName +
      "</b></div>" +
      '<div class="m-ph-dialog-scroll">' +
      profileHero() +
      profileBody() +
      "</div></div>"
  );
}

function introProfileStrip(): string {
  return (
    '<div class="m-ph-intro-strip">' +
    '<div class="m-ph-intro-strip-av">SC</div>' +
    "<div><b>" +
    D.prospectName +
    "</b><span>" +
    IC.briefcase +
    D.title +
    " at " +
    D.company +
    "</span></div>" +
    '<div class="m-ph-intro-strip-pay"><b>$' +
    D.bounty +
    "</b><span>Referral Payout</span></div></div>"
  );
}

function introFormBody(): string {
  return (
    '<div class="m-ph-intro-form">' +
    '<div class="m-ph-intro-alert">' +
    IC.eye +
    "<span>This request will be visible to all marketplace users who can view the details you enter below.</span></div>" +
    introProfileStrip() +
    '<div class="m-ph-intro-grid-2">' +
    '<div class="m-ph-intro-card bounty">' +
    '<div class="m-ph-intro-card-head">' +
    IC.dollar +
    "<div><b>Set Referral Payout</b><small>Amount held in escrow</small></div></div>" +
    '<div class="m-ph-bounty-input"><span>$</span><input id="phBountyIn" value="' +
    D.bounty +
    '" readonly /></div>' +
    '<div class="m-ph-fee-rows">' +
    "<div><span>Referral payout</span><b>$" +
    D.bounty +
    ".00</b></div>" +
    "<div><span>Provider fee</span><b>$75.00</b></div>" +
    "<div><span>Processing fee</span><b>$25.00</b></div>" +
    '<div class="total"><span>Total authorization</span><b>$850.00</b></div></div>' +
    '<div class="m-ph-escrow">' +
    IC.shield +
    "SECURE ESCROW PAYMENT</div></div>" +
    '<div class="m-ph-intro-card prob">' +
    '<div class="m-ph-intro-card-head">' +
    IC.sparkles +
    "<div><b>Acceptance Probability</b><small>Based on connector network</small></div></div>" +
    '<div class="m-ph-prob-ring"><span>78%</span></div>' +
    "<p>Strong payout — likely to attract quality connectors from your network.</p></div></div>" +
    '<label class="m-ph-check"><input type="checkbox" checked disabled /><span><b>Is this request urgent?</b><small>Connectors will see this request highlighted in their inbox</small></span></label>' +
    '<section class="m-ph-meeting-card">' +
    '<div class="m-ph-meeting-head">' +
    IC.briefcase +
    "<h4>Meeting Details</h4></div>" +
    "<label>Meeting Title <em>*</em></label>" +
    '<input class="m-ph-form-inp" id="phMeetingTitle" readonly />' +
    "<small>Be specific about the meeting purpose</small>" +
    "<label>Meeting Description <em>*</em></label>" +
    '<textarea class="m-ph-form-area" id="phMeetingDesc" rows="4" readonly></textarea>' +
    '<div class="m-ph-char-count"><small>Include key topics and expected outcomes</small><span id="phDescCount">0/1000</span></div>' +
    '<div class="m-ph-divider"></div>' +
    '<label>Additional Context <span class="opt">Optional</span></label>' +
    '<textarea class="m-ph-form-area" id="phMeetingCtx" rows="3" readonly></textarea>' +
    '<div class="m-ph-char-count"><small>Mutual connections or relevant background</small><span id="phCtxCount">0/500</span></div></section>' +
    '<div class="m-ph-intro-grid-2 pay">' +
    '<section class="m-ph-pay-card protect">' +
    '<div class="m-ph-pay-head">' +
    IC.shield +
    "<div><b>Payment Protection Guarantee</b></div></div>" +
    '<ul class="m-ph-protect-list">' +
    "<li>" +
    IC.checkCircle +
    "<span><b>No charge now</b> — authorization only</span></li>" +
    "<li>" +
    IC.checkCircle +
    "<span><b>Charged when accepted</b> by owner</span></li>" +
    "<li>" +
    IC.checkCircle +
    "<span><b>Secure escrow</b> protection</span></li>" +
    "<li>" +
    IC.checkCircle +
    "<span><b>Milestone-based</b> payment capture</span></li></ul>" +
    '<div class="m-ph-trust-badges"><span>' +
    IC.lock +
    "256-bit Encryption</span><span>" +
    IC.shield +
    "PCI Compliant</span></div></section>" +
    '<section class="m-ph-pay-card method">' +
    '<div class="m-ph-pay-head">' +
    IC.creditCard +
    "<b>Payment Method</b></div>" +
    '<div class="m-ph-card-row"><div class="m-ph-card-brand visa">' +
    IC.creditCard +
    "</div><div><b>Visa •••• 4242</b><span>Expires 12/28</span></div></div></section></div>" +
    '<section class="m-ph-privacy-card"><div class="m-ph-pay-head">' +
    IC.shield +
    "<b>Privacy Rules</b></div><p>Your default privacy settings will apply to this request. Connectors in your network can view meeting details after accepting.</p></section>" +
    '<div class="m-ph-intro-actions">' +
    '<button type="button" class="m-ph-cancel-btn" id="phCancelIntroBtn">Cancel</button>' +
    '<button type="button" class="m-ph-send-btn qsd-hot" id="phSendIntroBtn" data-callout="Click Send Request" data-co-side="top">' +
    IC.send +
    "Send Introduction Request" +
    IC.arrowRight +
    "</button></div></div>"
  );
}

export function findProspectsWithIntroModal(): string {
  return prospectModalScene(
    findProspectsPageHtml({ filled: true, showResults: true }),
    '<div class="m-ph-dialog m-ph-dialog-intro">' +
      '<div class="m-ph-dialog-sticky intro">' +
      '<button type="button" class="m-ph-back" aria-label="Back">' +
      IC.arrowLeft +
      "Back</button>" +
      "<b>Send Introduction Request</b>" +
      '<span class="m-ph-dialog-spacer"></span></div>' +
      '<div class="m-ph-dialog-scroll intro">' +
      introFormBody() +
      "</div></div>"
  );
}
