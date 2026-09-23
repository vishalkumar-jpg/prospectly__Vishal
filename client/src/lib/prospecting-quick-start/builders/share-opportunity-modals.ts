import { IC } from "../icons";
import { OPP_SHARE_DEMO } from "./share-opportunity-demo";

function shareModalBody(ready = false, copied = false): string {
  const D = OPP_SHARE_DEMO;
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
    '<div class="m-share-hero-amt">$' +
    D.sharerShare.toLocaleString() +
    "</div>" +
    "<p>Share this introduction request and earn 50% of the referral payout when someone you refer claims and completes it.</p></div></div>" +
    '<div class="m-share-body">' +
    '<div class="m-share-scenarios">' +
    '<div class="m-share-scenario">' +
    '<div class="m-share-sc-ic m-share-sc-ic-gn">' +
    IC.userCheck +
    "</div>" +
    '<div class="m-share-sc-txt"><b>Total referral payout</b><span>On this introduction request</span></div>' +
    '<span class="m-share-sc-amt">$' +
    D.totalPayout.toLocaleString() +
    "</span></div>" +
    '<div class="m-share-scenario">' +
    '<div class="m-share-sc-ic m-share-sc-ic-pu">' +
    IC.users +
    "</div>" +
    '<div class="m-share-sc-txt"><b>Your share when claimed</b><span>Earn 50% when the intro completes</span></div>' +
    '<span class="m-share-sc-amt">$' +
    D.sharerShare.toLocaleString() +
    "</span></div></div>" +
    '<div class="m-share-link-row">' +
    '<div class="m-share-link-in' +
    (ready ? " ready" : "") +
    '" id="shareLinkText">' +
    (ready ? D.shareUrl : "Click a share option to generate your link") +
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

export function shareOpportunityModalHtml(
  ready = false,
  copied = false
): string {
  return shareModalBody(ready, copied);
}
