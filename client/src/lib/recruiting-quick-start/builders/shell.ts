import { sidebar } from "./sidebar";
import { recruitingTopUserBadge } from "../constants";

export function shell(
  active: string,
  crumb: string,
  inner: string,
  hotRoute?: string,
  hotLabel?: string
): string {
  return (
    '<div class="qsd-screen">' +
    sidebar(active, hotRoute, hotLabel) +
    '<div class="m-body"><div class="m-top"><div class="m-crumb">Recruiting · <b>' +
    crumb +
    "</b></div>" +
    recruitingTopUserBadge() +
    "</div>" +
    '<div class="m-cont">' +
    inner +
    "</div></div></div>"
  );
}
