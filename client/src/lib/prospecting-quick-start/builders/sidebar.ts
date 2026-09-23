import { PROSPECTING_NAV, type ProspectingNavIconKey } from "../constants";
import { IC } from "../icons";
import { PROSPECTLY_LOGO_BUNDLED } from "../logo-url";

function navItem(
  route: string,
  iconKey: ProspectingNavIconKey,
  label: string,
  active: string,
  hotRoute?: string,
  hotLabel?: string
): string {
  const hot = hotRoute === route;
  const lbl = (hotLabel || "").replace(/"/g, "&quot;");
  const attrs = hot ? ' data-callout="' + lbl + '" data-co-side="right"' : "";
  const icon = IC[iconKey] ?? "";
  return (
    '<div class="m-it' +
    (active === route ? " on" : "") +
    (hot ? " qsd-hot" : "") +
    '"' +
    attrs +
    ">" +
    '<span class="m-sb-ic">' +
    icon +
    "</span>" +
    label +
    "</div>"
  );
}

export function sidebar(
  active: string,
  hotRoute?: string,
  hotLabel?: string
): string {
  return (
    '<div class="m-sb"><div class="m-logo"><img class="m-logo-img" src="' +
    PROSPECTLY_LOGO_BUNDLED +
    '" alt="" decoding="async" /></div>' +
    '<div class="m-cap">Prospecting</div>' +
    '<div class="m-nav">' +
    PROSPECTING_NAV.map(([route, icon, label]) =>
      navItem(route, icon, label, active, hotRoute, hotLabel)
    ).join("") +
    "</div></div>"
  );
}
