import { repositionQuickStartPanelIfOpen } from "../../quick-start-launcher";
import {
  PATH_LABELS,
  getToursForProspectingPath,
  isProspectingPath,
} from "../roles";
import {
  getProspectingPath,
  isProspectingTourDone,
  isProspectingTourDoneForPath,
  setProspectingPath,
} from "../../quick-start-storage";
import { QS_PICK_ICONS } from "../../recruiting-quick-start/builders/pick-icons";
import type { ProspectingPath } from "../../recruiting-quick-start/types";
import type { Tour } from "../types";
import type { QuickStartRuntime } from "./context";
import { completionPct } from "./state";

type PanelView = "prospecting-path" | "tours";

function getPanelView(): PanelView {
  return getProspectingPath() ? "tours" : "prospecting-path";
}

function prospectingPathPickerHtml(): string {
  const paths: { id: ProspectingPath; icon: string; d: string }[] = [
    {
      id: "find-prospect",
      icon: QS_PICK_ICONS.findProspect,
      d: "Search for prospects and track your intro requests",
    },
    {
      id: "complete-request",
      icon: QS_PICK_ICONS.completeRequest,
      d: "Accept and fulfill incoming intro requests",
    },
    {
      id: "opportunity",
      icon: QS_PICK_ICONS.opportunity,
      d: "Share opportunities and earn from the marketplace",
    },
  ];
  return (
    '<div class="qs-pick">' +
    '<p class="qs-pick-lead">What do you want to learn?</p>' +
    paths
      .map(
        (p) =>
          '<button type="button" class="qs-pick-opt" data-prospecting-path="' +
          p.id +
          '">' +
          p.icon +
          '<span class="qs-pick-t">' +
          PATH_LABELS[p.id] +
          "</span>" +
          '<span class="qs-pick-d">' +
          p.d +
          "</span></button>"
      )
      .join("") +
    "</div>"
  );
}

function tourItemHtml(t: Tour, done: boolean): string {
  return (
    '<button type="button" class="qs-item' +
    (done ? " done" : "") +
    '" data-tour="' +
    t.id +
    '">' +
    '<span class="qs-ic">' +
    (done ? "✓" : "") +
    '</span><span class="qs-t">' +
    t.label +
    '</span><span class="qs-go">' +
    (done ? "↺ replay" : "▶") +
    "</span></button>"
  );
}

function crumbHtml(path: ProspectingPath): string {
  return (
    '<nav class="qs-crumb" aria-label="Breadcrumb">' +
    '<button type="button" class="qs-crumb-arrow" data-crumb="prospecting-path" aria-label="Go back one step"><span class="qs-crumb-arrow-txt" aria-hidden="true">←</span></button>' +
    '<button type="button" class="qs-crumb-link active" data-crumb="prospecting-path">' +
    PATH_LABELS[path] +
    "</button></nav>"
  );
}

function wirePanelActions(
  root: HTMLElement,
  onOpenTour: (id: string) => void,
  rerender: () => void
): void {
  root.querySelectorAll("[data-prospecting-path]").forEach((el) => {
    el.addEventListener("click", () => {
      const path = el.getAttribute("data-prospecting-path");
      if (isProspectingPath(path)) {
        setProspectingPath(path);
        rerender();
      }
    });
  });

  root.querySelectorAll("[data-crumb]").forEach((el) => {
    el.addEventListener("click", () => {
      if (el.getAttribute("data-crumb") === "prospecting-path") {
        setProspectingPath(null);
        rerender();
      }
    });
  });

  root.querySelectorAll(".qs-item").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-tour");
      if (id) onOpenTour(id);
    });
  });
}

export function renderPanel(
  rt: QuickStartRuntime,
  onOpenTour: (id: string) => void
): void {
  const p = completionPct();
  const pctEl = document.getElementById("qsPct");
  const pctBig = document.getElementById("qsPctBig");
  const barFill = document.getElementById("qsBarFill");
  if (pctEl) pctEl.textContent = p + "%";
  if (pctBig) pctBig.textContent = p + "%";
  if (barFill) barFill.style.width = p + "%";

  const view = getPanelView();
  const path = getProspectingPath();
  const rerender = () => renderPanel(rt, onOpenTour);

  const body =
    view === "prospecting-path"
      ? prospectingPathPickerHtml()
      : getToursForProspectingPath(path)
          .map((t) =>
            tourItemHtml(
              t,
              path
                ? isProspectingTourDoneForPath(t.id, path)
                : isProspectingTourDone(t.id)
            )
          )
          .join("");

  const crumbEl = document.getElementById("qsCrumb");
  if (crumbEl) {
    if (view === "tours" && path) {
      crumbEl.innerHTML = crumbHtml(path);
      crumbEl.hidden = false;
      wirePanelActions(crumbEl, onOpenTour, rerender);
    } else {
      crumbEl.innerHTML = "";
      crumbEl.hidden = true;
    }
  }

  rt.dom.list.innerHTML = body;
  wirePanelActions(rt.dom.list, onOpenTour, rerender);
  repositionQuickStartPanelIfOpen(rt.dom.panel.parentElement);
}
