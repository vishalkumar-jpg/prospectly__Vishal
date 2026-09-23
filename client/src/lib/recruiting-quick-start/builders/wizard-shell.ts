import { verticalRail } from "./vrail";
import { livePreview, previewDrawerHtml } from "./preview";
import { recruitingTopUserBadge } from "../constants";

export function wizardShell(activeIdx: number, inner: string): string {
  const showPv = activeIdx >= 1;
  const layoutCls = "m-wizard-layout" + (showPv ? "" : " m-wizard-no-preview");
  const preview = showPv ? livePreview() : "";
  const drawer = showPv ? previewDrawerHtml() : "";
  const footIdx = inner.indexOf('<div class="m-wiz-foot');
  const body = footIdx >= 0 ? inner.slice(0, footIdx) : inner;
  const foot = footIdx >= 0 ? inner.slice(footIdx) : "";
  return (
    '<div class="qsd-screen m-wizard-screen"><div class="m-body m-wizard-body">' +
    '<div class="m-top"><div class="m-crumb">Recruiting \u00b7 <b>Post a Job</b></div>' +
    recruitingTopUserBadge() +
    "</div>" +
    '<div class="m-cont m-wizard-cont"><div class="m-wizard"><div class="' +
    layoutCls +
    '">' +
    verticalRail(activeIdx) +
    '<div class="m-wizard-center"><div class="m-form-card"><div class="m-form-scroll">' +
    body +
    "</div>" +
    foot +
    "</div></div>" +
    preview +
    "</div>" +
    drawer +
    "</div></div></div></div>"
  );
}
