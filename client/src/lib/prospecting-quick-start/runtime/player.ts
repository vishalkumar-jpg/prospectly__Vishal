import { TOURS } from "../tours";
import { resolveTransactionsTour } from "../tours/transactions-tour-resolve";
import { getProspectingPath } from "../../quick-start-storage";
import {
  bindFindProspectIntroModal,
  bindFindProspectMoreInfo,
  bindFindProspectRequestIntro,
  bindFindProspectSearch,
  bindFulfillInboxAccept,
  bindFulfillIntroAccept,
  bindFulfillPipelineContinue,
  bindFulfillSendIntro,
  bindProspectingFinanceTabs,
  bindQuickStartLogos,
  bindShareOpportunityModal,
  bindTrackRequestAcknowledgeModal,
  bindTrackRequestConfirmHot,
  bindTrackRequestDetailsHot,
  bindTrackRequestDetailsModal,
  bindTrackRequestEducationStep,
  bindTrackRequestFeedbackHot,
  bindTrackRequestFeedbackModal,
  bindTrackRequestFinanceHot,
  bindTrackRequestFinanceModal,
  bindTrackRequestPipeline,
  bindTransactionsContinue,
} from "./bindings";
import { attachCallout, clearCallout } from "./callout";
import { openQuickStartPanel } from "../../quick-start-launcher";
import type { QuickStartRuntime } from "./context";
import { renderPanel } from "./panel";
import { completionPct, markTourDone } from "./state";

export type ProspectingPlayerHooks = {
  /** Persist tour completion (defaults to markTourDone). */
  onFinish?: (tourId: string) => void;
  /** Re-open checklist panel after tour closes (defaults to prospecting renderPanel). */
  onClosePanel?: (openTour: (id: string) => void) => void;
  /** Toast suffix after tour completes. */
  completionMessage?: () => string;
};

function createPlayer(rt: QuickStartRuntime, hooks?: ProspectingPlayerHooks) {
  function renderScreen(): void {
    clearCallout(rt);
    const { stage } = rt.dom;
    if (!rt.tour) return;

    const hideSidebar =
      (rt.tour.id === "find-prospect" && rt.idx >= 1 && rt.idx <= 4) ||
      (rt.tour.id === "track-request" &&
        rt.idx >= 1 &&
        rt.idx < rt.tour.screens.length - 1) ||
      (rt.tour.id === "fulfill-request" && rt.idx >= 1 && rt.idx <= 4) ||
      (rt.tour.id === "opportunity" && rt.idx >= 1 && rt.idx <= 2) ||
      (rt.tour.id === "transactions" &&
        rt.idx >= 1 &&
        rt.idx < rt.tour.screens.length - 1);
    stage.classList.toggle("qsd-no-sidebar-mode", hideSidebar);
    stage.innerHTML = rt.tour.screens[rt.idx]();
    bindQuickStartLogos(rt);

    const stepEl = document.getElementById("qsdStep");
    if (stepEl) stepEl.textContent = rt.idx + 1 + "/" + rt.tour.screens.length;

    const m = rt.tour.meta[rt.idx] || { t: rt.tour.label, d: "" };
    const titleEl = document.getElementById("qsdT");
    const descEl = document.getElementById("qsdD");
    if (titleEl) titleEl.innerHTML = m.t;
    if (descEl) descEl.innerHTML = m.d;

    const prevBtn = document.getElementById("qsdPrev");
    if (prevBtn) {
      if (rt.idx === 0) prevBtn.setAttribute("disabled", "");
      else prevBtn.removeAttribute("disabled");
    }

    const nextBtn = document.getElementById("qsdNext");
    if (nextBtn) {
      const isLast = rt.idx === rt.tour.screens.length - 1;
      nextBtn.textContent = isLast ? "Finish ✓" : "Next →";
    }

    if (rt.tour.id === "find-prospect") {
      if (rt.idx === 1) bindFindProspectSearch(rt, next);
      else if (rt.idx === 2) bindFindProspectMoreInfo(rt, next);
      else if (rt.idx === 3) bindFindProspectRequestIntro(rt, next);
      else if (rt.idx === 4) bindFindProspectIntroModal(rt, next);
      else attachCallout(rt, next);
      return;
    }

    if (rt.tour.id === "track-request") {
      if (rt.idx === 1 || rt.idx === 2 || rt.idx === 7) {
        bindTrackRequestEducationStep(rt, next);
      } else if (rt.idx === 3) bindTrackRequestDetailsHot(rt, next);
      else if (rt.idx === 4) bindTrackRequestDetailsModal(rt, next);
      else if (rt.idx === 5) bindTrackRequestFinanceHot(rt, next);
      else if (rt.idx === 6) bindTrackRequestFinanceModal(rt, next);
      else if (rt.idx === 8) bindTrackRequestConfirmHot(rt, next);
      else if (rt.idx === 9) bindTrackRequestAcknowledgeModal(rt, next);
      else if (rt.idx === 10) bindTrackRequestFeedbackHot(rt, next);
      else if (rt.idx === 11) bindTrackRequestFeedbackModal(rt, next);
      else if (rt.idx === 12) bindTrackRequestPipeline(rt, next);
      else attachCallout(rt, next);
      return;
    }

    if (rt.tour.id === "fulfill-request") {
      if (rt.idx === 1) bindFulfillInboxAccept(rt, next);
      else if (rt.idx === 2) bindFulfillIntroAccept(rt, next);
      else if (rt.idx === 3) bindFulfillSendIntro(rt, next);
      else if (rt.idx === 4) bindFulfillPipelineContinue(rt, next);
      else attachCallout(rt, next);
      return;
    }

    if (rt.tour.id === "opportunity") {
      if (rt.idx === 2) bindShareOpportunityModal(rt, next);
      else attachCallout(rt, next);
      return;
    }

    if (rt.tour.id === "transactions") {
      const continueIdx = rt.tour.screens.length - 2;
      if (rt.idx === continueIdx) {
        bindProspectingFinanceTabs(rt);
        bindTransactionsContinue(rt, next);
      } else {
        attachCallout(rt, next);
      }
      return;
    }

    attachCallout(rt, next);
  }

  function closeDemo(showPanel = true): void {
    clearCallout(rt);
    const { back, win, stage, panel, launcher } = rt.dom;
    back.classList.remove("show");
    win.classList.remove("show");
    stage.innerHTML = "";
    rt.tour = null;
    if (showPanel) {
      if (hooks?.onClosePanel) {
        hooks.onClosePanel(openDemo);
      } else {
        renderPanel(rt, openDemo);
        openQuickStartPanel(launcher, panel);
      }
    }
  }

  function finishDemo(): void {
    if (!rt.tour) return;
    const tourId = rt.tour.id;
    if (hooks?.onFinish) hooks.onFinish(tourId);
    else markTourDone(tourId);
    closeDemo(true);
    try {
      const toastFn = (
        window as Window & { toast?: (a: string, b: string) => void }
      ).toast;
      if (typeof toastFn === "function") {
        const suffix = hooks?.completionMessage
          ? hooks.completionMessage()
          : completionPct() + "% of your Quick Start is done.";
        toastFn("Walkthrough complete ✓", suffix);
      }
    } catch {
      /* ignore */
    }
  }

  function next(): void {
    if (!rt.tour) return;
    if (rt.idx >= rt.tour.screens.length - 1) {
      finishDemo();
      return;
    }
    rt.idx++;
    renderScreen();
  }

  function prev(): void {
    if (!rt.tour || rt.idx <= 0) return;
    rt.idx--;
    renderScreen();
  }

  function openDemo(id: string): void {
    const tour =
      id === "transactions"
        ? resolveTransactionsTour(getProspectingPath())
        : TOURS.find((t) => t.id === id);
    if (!tour) return;
    rt.tour = tour;
    rt.idx = 0;
    const { panel, launcher, back, win, tab } = rt.dom;
    panel.classList.remove("show");
    launcher.style.display = "none";
    tab.textContent = tour.label;
    back.classList.add("show");
    win.classList.add("show");
    renderScreen();
  }

  return { renderScreen, closeDemo, finishDemo, next, prev, openDemo };
}

export { createPlayer };
