import { ROOT_TEMPLATE } from "./dom/root-template";
import {
  hasQsSeen,
  markQsSeen,
  hasDashboardPanelDismissed,
  markDashboardPanelDismissed,
  getProspectingPath,
  markProspectingTourDone,
} from "../quick-start-storage";
import {
  setupQuickStartLauncher,
  openQuickStartPanel,
  closeQuickStartPanel,
} from "../quick-start-launcher";
import { createRuntime, createPlayer, type QuickStartRuntime } from "./runtime";
import { renderPanel } from "./runtime/panel";
import { completionPct, loadState, resetState } from "./runtime/state";
import type { QuickStartContext } from "./types";
import "./recruiting-quick-start.css";

const ROOT_ID = "recruiting-quick-start-root";

const PROSPECTING_TOUR_IDS = new Set([
  "find-prospect",
  "track-request",
  "fulfill-request",
  "opportunity",
  "transactions",
]);

type PlayerApi = ReturnType<typeof createPlayer>;

let runtime: QuickStartRuntime | null = null;
let prospectingPlayer: PlayerApi | null = null;
let disposeQuickStartLauncher: (() => void) | null = null;

function disposeLauncher(): void {
  disposeQuickStartLauncher?.();
  disposeQuickStartLauncher = null;
}

function getDom(): QuickStartRuntime["dom"] | null {
  const launcher = document.getElementById("qsLauncher");
  const panel = document.getElementById("qsPanel");
  const list = document.getElementById("qsList");
  const back = document.getElementById("qsdBack");
  const win = document.getElementById("qsdWin");
  const stage = document.getElementById("qsdStage");
  const tab = document.getElementById("qsdTab");
  if (!launcher || !panel || !list || !back || !win || !stage || !tab)
    return null;
  return { launcher, panel, list, back, win, stage, tab };
}

function isProspectingTourId(id: string): boolean {
  return PROSPECTING_TOUR_IDS.has(id);
}

function getActivePlayer(
  rt: QuickStartRuntime,
  recruitingPlayer: PlayerApi
): PlayerApi {
  if (rt.tour && isProspectingTourId(rt.tour.id) && prospectingPlayer) {
    return prospectingPlayer;
  }
  return recruitingPlayer;
}

async function ensureProspectingPlayer(
  rt: QuickStartRuntime,
  openTour: (id: string) => void
): Promise<PlayerApi> {
  if (prospectingPlayer) return prospectingPlayer;

  const { createPlayer: createProspectingPlayer } =
    await import("../prospecting-quick-start/runtime/player");

  const { launcher, panel } = rt.dom;

  prospectingPlayer = createProspectingPlayer(
    rt as Parameters<typeof createProspectingPlayer>[0],
    {
      onFinish(tourId) {
        markProspectingTourDone(tourId, getProspectingPath());
      },
      onClosePanel() {
        renderPanel(rt, openTour);
        openQuickStartPanel(launcher, panel);
      },
      completionMessage() {
        return completionPct(rt.context) + "% of your Quick Start is done.";
      },
    }
  );

  return prospectingPlayer;
}

function wireEvents(rt: QuickStartRuntime) {
  const recruitingPlayer = createPlayer(rt);
  const { launcher, panel } = rt.dom;

  const openTour = (id: string) => {
    if (rt.context === "dashboard" && isProspectingTourId(id)) {
      void ensureProspectingPlayer(rt, openTour)
        .then((player) => player.openDemo(id))
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error("Failed to load prospecting quick start player", error);
        });
      return;
    }
    recruitingPlayer.openDemo(id);
  };

  const active = () => getActivePlayer(rt, recruitingPlayer);

  renderPanel(rt, openTour);

  launcher.onclick = () => {
    if (launcher.dataset.suppressClick) return;
    renderPanel(rt, openTour);
    openQuickStartPanel(launcher, panel);
  };

  const closeBtn = document.getElementById("qsClose");
  if (closeBtn) {
    closeBtn.onclick = () => {
      closeQuickStartPanel(launcher, panel);
      if (rt.context === "dashboard") {
        markDashboardPanelDismissed();
      }
    };
  }

  const resetBtn = document.getElementById("qsReset");
  if (resetBtn) {
    resetBtn.onclick = () => {
      resetState();
      renderPanel(rt, openTour);
    };
  }

  const xBtn = document.getElementById("qsdX");
  const skipBtn = document.getElementById("qsdSkip");
  const prevBtn = document.getElementById("qsdPrev");
  const nextBtn = document.getElementById("qsdNext");

  if (xBtn) xBtn.onclick = () => active().closeDemo(true);
  if (skipBtn) skipBtn.onclick = () => active().closeDemo(true);
  if (prevBtn) prevBtn.onclick = () => active().prev();
  if (nextBtn) nextBtn.onclick = () => active().next();
  rt.dom.back.onclick = () => active().closeDemo(true);
}

function unmountIfContext(context: QuickStartContext): void {
  if (runtime?.context !== context) return;
  disposeLauncher();
  document.getElementById(ROOT_ID)?.remove();
  runtime = null;
  prospectingPlayer = null;
}

function mountQuickStart(context: QuickStartContext): void {
  const existing = document.getElementById(ROOT_ID);
  if (existing && runtime?.context === context) return;
  if (existing) {
    disposeLauncher();
    existing.remove();
    runtime = null;
    prospectingPlayer = null;
  }

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.innerHTML = ROOT_TEMPLATE;
  document.body.appendChild(root);
  disposeQuickStartLauncher = setupQuickStartLauncher(root);

  const dom = getDom();
  if (!dom) return;

  runtime = createRuntime(dom, context);
  loadState();
  wireEvents(runtime);

  if (context === "dashboard") {
    if (!hasDashboardPanelDismissed()) {
      setTimeout(() => {
        if (!runtime || runtime.context !== "dashboard") return;
        openQuickStartPanel(runtime.dom.launcher, runtime.dom.panel);
      }, 300);
    }
    return;
  }

  if (context === "recruiting") {
    try {
      if (!hasQsSeen()) {
        markQsSeen();
        setTimeout(() => {
          if (!runtime || runtime.context !== "recruiting") return;
          openQuickStartPanel(runtime.dom.launcher, runtime.dom.panel);
          const openTour = (id: string) => {
            const player = createPlayer(runtime!);
            player.openDemo(id);
          };
          renderPanel(runtime, openTour);
        }, 900);
      }
    } catch {
      /* ignore */
    }
  }
}

export function mountRecruitingQuickStart(): void {
  mountQuickStart("recruiting");
}

export function mountDashboardQuickStart(): void {
  mountQuickStart("dashboard");
}

export function unmountRecruitingQuickStart(): void {
  unmountIfContext("recruiting");
}

export function unmountDashboardQuickStart(): void {
  unmountIfContext("dashboard");
}
