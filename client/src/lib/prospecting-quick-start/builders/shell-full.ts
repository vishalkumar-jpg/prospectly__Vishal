import { sidebar } from "./sidebar";
import { PROSPECTING_DEMO } from "../demo-entities";

function prospectingTopUserBadge(): string {
  const { name } = PROSPECTING_DEMO.requester;
  return (
    '<div class="m-user"><div class="av">' +
    name.charAt(0) +
    "</div>" +
    name +
    "</div>"
  );
}

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
    '<div class="m-body"><div class="m-top"><div class="m-crumb">Prospecting · <b>' +
    crumb +
    "</b></div>" +
    prospectingTopUserBadge() +
    "</div>" +
    '<div class="m-cont">' +
    inner +
    "</div></div></div>"
  );
}
