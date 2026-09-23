import { repositionQuickStartPanelIfOpen } from "../../quick-start-launcher";
import { TOURS as PROSPECTING_TOURS } from "../../prospecting-quick-start/tours";
import {
  PATH_LABELS,
  getToursForProspectingPath,
  isProspectingPath,
} from "../../prospecting-quick-start/roles";
import {
  getProspectingPath,
  isProspectingTourDone,
  isProspectingTourDoneForPath,
  setProspectingPath,
} from "../../quick-start-storage";
import { getToursForRole, MODULE_LABELS, ROLE_LABELS } from "../roles";
import { QS_PICK_ICONS } from "../builders/pick-icons";
import { TOURS } from "../tours";
import type {
  DashboardModule,
  ProspectingPath,
  RecruitingRole,
  Tour,
} from "../types";
import type { QuickStartRuntime } from "./context";
import {
  completionPct,
  getState,
  isTourDone,
  setDashboardModule,
  setRecruitingRole,
} from "./state";

type PanelView = "module" | "role" | "prospecting-path" | "tours";

function getPanelView(rt: QuickStartRuntime): PanelView {
  const state = getState();
  if (rt.context === "dashboard") {
    if (!state.dashboardModule) return "module";
    if (state.dashboardModule === "prospecting") {
      if (!state.prospectingPath) return "prospecting-path";
      return "tours";
    }
    if (!state.recruitingRole) return "role";
    return "tours";
  }
  if (!state.recruitingRole) return "role";
  return "tours";
}

type CrumbTarget = "module" | "role" | "prospecting-path";

type CrumbItem = {
  label: string;
  target: CrumbTarget | null;
  active?: boolean;
};

type CrumbConfig = {
  backTarget: CrumbTarget;
  items: CrumbItem[];
};

function getCrumbConfig(
  rt: QuickStartRuntime,
  view: PanelView
): CrumbConfig | null {
  const state = getState();
  if (view === "module") return null;

  if (view === "role" && rt.context === "dashboard") {
    return {
      backTarget: "module",
      items: [
        {
          label: MODULE_LABELS[state.dashboardModule!],
          target: "module",
          active: true,
        },
      ],
    };
  }

  if (
    rt.context === "dashboard" &&
    state.dashboardModule === "prospecting" &&
    view === "prospecting-path"
  ) {
    return {
      backTarget: "module",
      items: [
        { label: MODULE_LABELS.prospecting, target: "module", active: true },
      ],
    };
  }

  if (
    rt.context === "dashboard" &&
    state.dashboardModule === "prospecting" &&
    view === "tours" &&
    state.prospectingPath
  ) {
    return {
      backTarget: "prospecting-path",
      items: [
        { label: MODULE_LABELS.prospecting, target: "module" },
        {
          label: PATH_LABELS[state.prospectingPath],
          target: "prospecting-path",
          active: true,
        },
      ],
    };
  }

  if (view === "tours" && state.recruitingRole) {
    if (rt.context === "dashboard") {
      return {
        backTarget: "role",
        items: [
          { label: MODULE_LABELS.recruiting, target: "module" },
          {
            label: ROLE_LABELS[state.recruitingRole],
            target: "role",
            active: true,
          },
        ],
      };
    }
    return {
      backTarget: "role",
      items: [
        {
          label: ROLE_LABELS[state.recruitingRole],
          target: "role",
          active: true,
        },
      ],
    };
  }

  return null;
}

function crumbHtml(config: CrumbConfig): string {
  const parts: string[] = [
    '<nav class="qs-crumb" aria-label="Breadcrumb">',
    '<button type="button" class="qs-crumb-arrow" data-crumb="' +
      config.backTarget +
      '" aria-label="Go back one step"><span class="qs-crumb-arrow-txt" aria-hidden="true">←</span></button>',
  ];

  config.items.forEach((item, i) => {
    if (item.target) {
      parts.push(
        '<button type="button" class="qs-crumb-link' +
          (item.active ? " active" : "") +
          '" data-crumb="' +
          item.target +
          '">' +
          item.label +
          "</button>"
      );
    } else {
      parts.push('<span class="qs-crumb-current">' + item.label + "</span>");
    }
    if (i < config.items.length - 1) {
      parts.push('<span class="qs-crumb-sep" aria-hidden="true">›</span>');
    }
  });

  parts.push("</nav>");
  return parts.join("");
}

function modulePickerHtml(): string {
  return (
    '<div class="qs-pick">' +
    '<p class="qs-pick-lead">Which guide do you need?</p>' +
    '<button type="button" class="qs-pick-opt" data-module="recruiting">' +
    QS_PICK_ICONS.recruiting +
    '<span class="qs-pick-t">Recruiting</span>' +
    '<span class="qs-pick-d">Post jobs, refer candidates, track applications</span></button>' +
    '<button type="button" class="qs-pick-opt" data-module="prospecting">' +
    QS_PICK_ICONS.prospecting +
    '<span class="qs-pick-t">Prospecting</span>' +
    '<span class="qs-pick-d">Find prospects, fulfill requests, share opportunities</span></button>' +
    "</div>"
  );
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

function rolePickerHtml(): string {
  const roles: { id: RecruitingRole; icon: string; d: string }[] = [
    {
      id: "recruiter",
      icon: QS_PICK_ICONS.recruiter,
      d: "Post jobs, notify connectors, manage candidates",
    },
    {
      id: "connector",
      icon: QS_PICK_ICONS.connector,
      d: "Refer candidates, share jobs, track earnings",
    },
    {
      id: "candidate",
      icon: QS_PICK_ICONS.candidate,
      d: "Track your applications and bonuses",
    },
  ];
  return (
    '<div class="qs-pick">' +
    '<p class="qs-pick-lead">What best describes you?</p>' +
    roles
      .map(
        (r) =>
          '<button type="button" class="qs-pick-opt" data-role="' +
          r.id +
          '">' +
          r.icon +
          '<span class="qs-pick-t">' +
          ROLE_LABELS[r.id] +
          "</span>" +
          '<span class="qs-pick-d">' +
          r.d +
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

function toursListHtml(rt: QuickStartRuntime): string {
  const state = getState();
  const useProspecting =
    rt.context === "dashboard" && state.dashboardModule === "prospecting";

  if (useProspecting) {
    const path = getProspectingPath();
    return getToursForProspectingPath(path)
      .map((t) =>
        tourItemHtml(
          t,
          path
            ? isProspectingTourDoneForPath(t.id, path)
            : isProspectingTourDone(t.id)
        )
      )
      .join("");
  }

  const tours = getToursForRole(state.recruitingRole!);
  return tours
    .map((t) => tourItemHtml(t, isTourDone(t.id, state.recruitingRole)))
    .join("");
}

function wirePanelActions(
  root: HTMLElement,
  onOpenTour: (id: string) => void,
  rerender: () => void
): void {
  root.querySelectorAll("[data-module]").forEach((el) => {
    el.addEventListener("click", () => {
      const mod = el.getAttribute("data-module") as DashboardModule;
      setDashboardModule(mod);
      if (mod === "prospecting") setRecruitingRole(null);
      if (mod === "recruiting") setProspectingPath(null);
      rerender();
    });
  });

  root.querySelectorAll("[data-prospecting-path]").forEach((el) => {
    el.addEventListener("click", () => {
      const path = el.getAttribute("data-prospecting-path");
      if (isProspectingPath(path)) {
        setProspectingPath(path);
        rerender();
      }
    });
  });

  root.querySelectorAll("[data-role]").forEach((el) => {
    el.addEventListener("click", () => {
      setRecruitingRole(el.getAttribute("data-role") as RecruitingRole);
      rerender();
    });
  });

  root.querySelectorAll("[data-crumb]").forEach((el) => {
    el.addEventListener("click", () => {
      const crumb = el.getAttribute("data-crumb");
      if (crumb === "module") {
        setDashboardModule(null);
        setRecruitingRole(null);
        setProspectingPath(null);
      } else if (crumb === "role") {
        setRecruitingRole(null);
      } else if (crumb === "prospecting-path") {
        setProspectingPath(null);
      }
      rerender();
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
  const p = completionPct(rt.context);
  const pctEl = document.getElementById("qsPct");
  const pctBig = document.getElementById("qsPctBig");
  const barFill = document.getElementById("qsBarFill");
  if (pctEl) pctEl.textContent = p + "%";
  if (pctBig) pctBig.textContent = p + "%";
  if (barFill) barFill.style.width = p + "%";

  const view = getPanelView(rt);
  const rerender = () => renderPanel(rt, onOpenTour);

  let body = "";
  if (view === "module") body = modulePickerHtml();
  else if (view === "role") body = rolePickerHtml();
  else if (view === "prospecting-path") body = prospectingPathPickerHtml();
  else body = toursListHtml(rt);

  const crumbEl = document.getElementById("qsCrumb");
  const showCrumb =
    rt.context === "dashboard"
      ? view !== "module"
      : view === "tours" && !!getState().recruitingRole;
  const crumbConfig = showCrumb ? getCrumbConfig(rt, view) : null;

  if (crumbEl) {
    if (crumbConfig) {
      crumbEl.innerHTML = crumbHtml(crumbConfig);
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

export function resolveTourById(id: string): Tour | undefined {
  return (
    TOURS.find((t) => t.id === id) || PROSPECTING_TOURS.find((t) => t.id === id)
  );
}
