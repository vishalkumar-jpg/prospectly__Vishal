import { ROOT_TEMPLATE } from "./dom/root-template";
import { createRuntime, createPlayer, type QuickStartRuntime } from "./runtime";
import { renderPanel } from "./runtime/panel";
import { loadState, resetState } from "./runtime/state";
import {
  positionQuickStartPanel,
  setupQuickStartLauncher,
  openQuickStartPanel,
  closeQuickStartPanel,
} from "../quick-start-launcher";
import "../recruiting-quick-start/recruiting-quick-start.css";
import "./prospecting-quick-start.css";

const ROOT_ID = "prospecting-quick-start-root";
let runtime: QuickStartRuntime | null = null;
let disposeQuickStartLauncher: (() => void) | null = null;

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

function wireEvents(rt: QuickStartRuntime) {
  const player = createPlayer(rt);
  const { launcher, panel } = rt.dom;

  renderPanel(rt, player.openDemo);

  launcher.onclick = () => {
    if (launcher.dataset.suppressClick) return;
    renderPanel(rt, player.openDemo);
    openQuickStartPanel(launcher, panel);
  };

  const closeBtn = document.getElementById("qsClose");
  if (closeBtn) {
    closeBtn.onclick = () => {
      closeQuickStartPanel(launcher, panel);
    };
  }

  const resetBtn = document.getElementById("qsReset");
  if (resetBtn) {
    resetBtn.onclick = () => {
      resetState();
      renderPanel(rt, player.openDemo);
    };
  }

  const xBtn = document.getElementById("qsdX");
  const skipBtn = document.getElementById("qsdSkip");
  const prevBtn = document.getElementById("qsdPrev");
  const nextBtn = document.getElementById("qsdNext");

  if (xBtn) xBtn.onclick = () => player.closeDemo(true);
  if (skipBtn) skipBtn.onclick = () => player.closeDemo(true);
  if (prevBtn) prevBtn.onclick = () => player.prev();
  if (nextBtn) nextBtn.onclick = () => player.next();
  rt.dom.back.onclick = () => player.closeDemo(true);

  return player;
}

export function mountProspectingQuickStart(): void {
  if (document.getElementById(ROOT_ID)) return;

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.innerHTML = ROOT_TEMPLATE;
  document.body.appendChild(root);
  disposeQuickStartLauncher = setupQuickStartLauncher(root);

  const dom = getDom();
  if (!dom) return;

  runtime = createRuntime(dom);
  loadState();
  wireEvents(runtime);
}

export function unmountProspectingQuickStart(): void {
  if (runtime?.calloutCleanup) runtime.calloutCleanup();
  if (runtime?.calloutTimer) clearTimeout(runtime.calloutTimer);
  disposeQuickStartLauncher?.();
  disposeQuickStartLauncher = null;
  document.getElementById(ROOT_ID)?.remove();
  runtime = null;
}
