import { sidebar } from "./sidebar";
import { recruitingTopUserBadge } from "../constants";

/** Full-width content — no left sidebar (matches real app after nav click). */
export function shellFullWidth(inner: string, extraClass = ""): string {
  return (
    '<div class="qsd-screen qsd-no-sidebar ' +
    extraClass +
    '"><div class="m-body m-body-full"><div class="m-cont m-cont-full">' +
    inner +
    "</div></div></div>"
  );
}

export function shellWithNav(
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
