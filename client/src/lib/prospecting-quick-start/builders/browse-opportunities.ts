import { IC } from "../icons";
import { OPP_BROWSE_DEALS } from "./share-opportunity-demo";
import { shareOpportunityModalHtml } from "./share-opportunity-modals";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function oppTabsBar(): string {
  const tab = (label: string, icon: string, count: number, on: boolean) =>
    '<button type="button" class="m-opp-tab' +
    (on ? " on" : "") +
    '">' +
    icon +
    "<span>" +
    label +
    '</span><span class="m-opp-tab-badge' +
    (on ? " on" : "") +
    '">' +
    count +
    "</span></button>";

  return (
    '<div class="m-opp-tabs-bar">' +
    '<div class="m-opp-toolbar">' +
    '<div class="m-opp-tabs">' +
    tab("Browse", IC.search, 3, true) +
    tab("My Shares", IC.trendingUp, 1, false) +
    tab("Claims", IC.users, 1, false) +
    "</div>" +
    '<div class="m-opp-search">' +
    IC.search +
    "<span>Search by name, company, or meeting topic…</span></div></div></div>"
  );
}

function dealCard(deal: (typeof OPP_BROWSE_DEALS)[number]): string {
  const shareCls =
    "m-opp-share" + (deal.hotShare ? " m-opp-share-hot qsd-hot" : "");
  const shareAttrs = deal.hotShare
    ? ' id="oppShareBtn" data-callout="Click Share" data-co-side="top"'
    : "";

  return (
    '<div class="m-opp-card">' +
    '<div class="m-opp-card-head">' +
    '<div class="m-opp-card-profile">' +
    '<div class="m-opp-av-wrap"><span class="m-opp-av">' +
    initials(deal.name) +
    "</span></div>" +
    '<div class="m-opp-card-info">' +
    "<b>" +
    deal.name +
    "</b>" +
    "<span>" +
    deal.title +
    "</span>" +
    '<div class="m-opp-company">' +
    IC.building +
    deal.company +
    "</div></div></div>" +
    '<div class="m-opp-agenda">' +
    '<b>"' +
    deal.meetingTitle +
    '"</b>' +
    "<p>" +
    deal.meetingDescription +
    "</p></div></div>" +
    '<div class="m-opp-payout">' +
    "<small>Referral Payout</small>" +
    "<b>$" +
    deal.bounty.toLocaleString() +
    "</b></div>" +
    '<div class="m-opp-foot">' +
    '<div class="m-opp-meta">' +
    "<span>" +
    IC.users +
    deal.interested +
    " interested</span>" +
    "<span>" +
    IC.eye +
    deal.views +
    " views</span></div>" +
    '<div class="m-opp-actions">' +
    '<button type="button" class="m-opp-li">' +
    IC.linkedin +
    "LinkedIn</button>" +
    '<button type="button" class="' +
    shareCls +
    '"' +
    shareAttrs +
    ">" +
    IC.share2 +
    "Share</button></div></div></div>"
  );
}

export function browseOpportunitiesHtml(opts?: {
  hotShare?: boolean;
  backdrop?: boolean;
}): string {
  const hotShare = opts?.hotShare && !opts?.backdrop;
  const deals = OPP_BROWSE_DEALS.map((d) => ({
    ...d,
    hotShare: hotShare && d.hotShare,
  }));

  return (
    '<div class="m-opp-page">' +
    '<div class="m-opp-head">' +
    "<h1>Browse requests. Make introductions. Earn payouts.</h1>" +
    "<p>Share warm introductions from your network and earn a referral payout when someone completes the meeting — or share links to earn 50%.</p></div>" +
    oppTabsBar() +
    '<div class="m-opp-count">Showing <b>' +
    deals.length +
    " deals</b></div>" +
    '<div class="m-opp-grid">' +
    deals.map(dealCard).join("") +
    "</div></div>"
  );
}

export function opportunitiesWithShareModal(): string {
  return (
    '<div class="m-opp-scene m-share-scene">' +
    '<div class="m-opp-backdrop">' +
    browseOpportunitiesHtml({ backdrop: true, hotShare: true }) +
    "</div>" +
    '<div class="m-opp-overlay m-share-overlay">' +
    shareOpportunityModalHtml(false, false) +
    "</div></div>"
  );
}
