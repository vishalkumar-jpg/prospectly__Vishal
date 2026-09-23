import { IC } from "../icons";
import { jobMarketplaceHtml } from "./job-marketplace";

const DEMO_SHARE_URL =
  "https://prospectly.com/jobs/insurance-va-office-beacon?ref=you";

function shareModalBody(ready = false, copied = false): string {
  const copyCls = "m-share-copy-btn" + (copied ? " copied" : "");
  const copyInner = copied
    ? IC.check + "<span>Copied</span>"
    : IC.copy + "<span>Copy</span>";

  return (
    '<div class="m-share-dialog">' +
    '<div class="m-share-toast' +
    (copied ? " show" : "") +
    '" id="shareCopiedToast">' +
    IC.checkCircle +
    "<div><b>Link copied!</b><span>Share this link on any platform to earn rewards.</span></div>" +
    '<span class="m-share-toast-x">' +
    IC.x +
    "</span></div>" +
    '<div class="m-share-hero">' +
    '<button type="button" class="m-share-x" aria-label="Close">' +
    IC.x +
    "</button>" +
    '<div class="m-share-hero-text">' +
    '<div class="m-share-hero-kicker">' +
    IC.star +
    "<span>Refer &amp; earn up to</span></div>" +
    '<div class="m-share-hero-amt">$1,600</div>' +
    "<p>Share this job link and earn a referral payout when your candidate gets hired.</p></div></div>" +
    '<div class="m-share-body">' +
    '<div class="m-share-scenarios">' +
    '<div class="m-share-scenario">' +
    '<div class="m-share-sc-ic m-share-sc-ic-gn">' +
    IC.userCheck +
    "</div>" +
    '<div class="m-share-sc-txt"><b>Candidate applies via your link</b><span>Full payout — no split</span></div>' +
    '<span class="m-share-sc-amt">$1,600</span></div>' +
    '<div class="m-share-scenario">' +
    '<div class="m-share-sc-ic m-share-sc-ic-pu">' +
    IC.users +
    "</div>" +
    '<div class="m-share-sc-txt"><b>Another connector claims with their candidate</b><span>Split 50/50 with the claimer</span></div>' +
    '<span class="m-share-sc-amt">$800</span></div></div>' +
    '<div class="m-share-link-row">' +
    '<div class="m-share-link-in' +
    (ready ? " ready" : "") +
    '" id="shareLinkText">' +
    (ready ? DEMO_SHARE_URL : "Click a share option to generate your link") +
    "</div>" +
    '<button type="button" class="' +
    copyCls +
    '" id="shareCopyBtn"' +
    (ready ? "" : " disabled") +
    ">" +
    copyInner +
    "</button></div>" +
    '<p class="m-share-via-lbl">Share via</p>' +
    '<div class="m-share-social">' +
    '<span class="m-share-soc m-share-soc-li">' +
    IC.linkedin +
    "<span>LinkedIn</span></span>" +
    '<span class="m-share-soc m-share-soc-tw">' +
    IC.twitter +
    "<span>X / Twitter</span></span>" +
    '<span class="m-share-soc m-share-soc-fb">' +
    IC.facebook +
    "<span>Facebook</span></span></div>" +
    (ready
      ? '<a class="m-share-preview" href="#">' +
        IC.externalLink +
        "<span>Preview public page</span></a>"
      : "") +
    "</div></div>"
  );
}

export function shareJobModalHtml(ready = false, copied = false): string {
  return shareModalBody(ready, copied);
}

export function marketplaceWithShareModal(): string {
  return (
    '<div class="m-pm-scene m-share-scene">' +
    '<div class="m-pm-backdrop">' +
    jobMarketplaceHtml({ backdrop: true, hotShare: true }) +
    "</div>" +
    '<div class="m-pm-overlay m-share-overlay">' +
    shareJobModalHtml(false, false) +
    "</div></div>"
  );
}
