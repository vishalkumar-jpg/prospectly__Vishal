import { resolveMoneyTour } from "../tours/money-tour-resolve";
import {
  bindBudgetStep,
  bindDescAccordion,
  bindNotifyModal,
  bindOutcomeModal,
  bindPaymentStep,
  bindPayoutOpts,
  bindPreviewDrawer,
  bindReferUploadModal,
  bindReferInboxApprove,
  bindReferConsentModal,
  bindScheduleModal,
  bindRescheduleModal,
  bindShareModal,
  bindShortlistModal,
  bindViewCandidateModal,
  bindHireModal,
  bindQuickStartLogos,
} from "./bindings";
import { attachCallout, clearCallout } from "./callout";
import { openQuickStartPanel } from "../../quick-start-launcher";
import type { QuickStartRuntime } from "./context";
import {
  runPaymentDemo,
  runSkillsDemo,
  runSuccessDemo,
  runTypeEffects,
} from "./effects";
import { bindAssessmentDemo } from "./assessment-demo";
import { renderPanel, resolveTourById } from "./panel";
import { completionPct, getState, isTourDone, markTourDone } from "./state";

function createPlayer(rt: QuickStartRuntime) {
  function renderScreen(): void {
    rt.screenCleanup?.();
    rt.screenCleanup = null;
    clearCallout(rt);
    const { stage } = rt.dom;
    if (!rt.tour) return;

    stage.classList.toggle(
      "qsd-wizard-mode",
      rt.idx >= 1 && rt.tour.id === "postjob"
    );
    const isShortMoneyTour =
      rt.tour.id === "money" && rt.tour.screens.length <= 2;
    const hideSidebar =
      (rt.tour.id === "notify" ||
        rt.tour.id === "candidates" ||
        rt.tour.id === "refer" ||
        rt.tour.id === "share" ||
        rt.tour.id === "money" ||
        rt.tour.id === "applications") &&
      (rt.idx >= 1 || isShortMoneyTour);
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
      const isPipeHired =
        rt.tour.id === "candidates" && rt.idx === rt.tour.screens.length - 2;
      const isReferPipeline =
        rt.tour.id === "refer" && rt.idx === rt.tour.screens.length - 2;
      nextBtn.textContent = isLast
        ? "Finish ✓"
        : isPipeHired || isReferPipeline
          ? "Continue →"
          : "Next →";
    }

    if (rt.tour.id === "postjob" && rt.idx !== 9) rt.paySaveHandler = null;

    if (rt.tour.id === "postjob") {
      if (rt.idx === 2) runTypeEffects(rt, ".qsd-type", 200);
      if (rt.idx === 3) runSkillsDemo(rt);
      if (rt.idx === 4) {
        bindDescAccordion(rt);
        runTypeEffects(rt, ".m-desc-item.open .m-desc-area.qsd-type", 300);
        setTimeout(() => {
          const sc = stage.querySelector(".m-form-scroll");
          if (sc) sc.scrollTop = sc.scrollHeight;
        }, 400);
      }
      if (rt.idx === 5) {
        rt.screenCleanup = bindAssessmentDemo(rt, next);
      }
      if (rt.idx === 6) bindBudgetStep(rt);
      if (rt.idx === 7) bindPayoutOpts(rt);
      if (rt.idx === 8) runSuccessDemo(rt);
      if (rt.idx === 9) {
        runPaymentDemo(rt);
        bindPaymentStep(rt, next);
      }
      if (rt.idx >= 2) bindPreviewDrawer(rt);
    }

    if (rt.tour.id === "notify" && rt.idx === 3) {
      bindNotifyModal(rt, next);
    } else if (rt.tour.id === "candidates" && rt.idx === 3) {
      bindViewCandidateModal(rt, next);
    } else if (rt.tour.id === "candidates" && rt.idx === 4) {
      bindShortlistModal(rt, next);
    } else if (rt.tour.id === "candidates" && rt.idx === 6) {
      bindScheduleModal(rt, next);
    } else if (rt.tour.id === "candidates" && rt.idx === 8) {
      bindRescheduleModal(rt, next);
    } else if (rt.tour.id === "candidates" && rt.idx === 10) {
      bindOutcomeModal(rt, next);
    } else if (rt.tour.id === "candidates" && rt.idx === 12) {
      bindHireModal(rt, next);
    } else if (rt.tour.id === "refer" && rt.idx === 2) {
      bindReferUploadModal(rt, next);
    } else if (rt.tour.id === "refer" && rt.idx === 3) {
      bindReferInboxApprove(rt, next);
    } else if (rt.tour.id === "refer" && rt.idx === 4) {
      bindReferConsentModal(rt, next);
    } else if (rt.tour.id === "refer" && rt.idx === 5) {
      attachCallout(rt, next);
    } else if (rt.tour.id === "share" && rt.idx === 2) {
      bindShareModal(rt, next);
    } else {
      attachCallout(rt, next);
    }
  }

  function closeDemo(showPanel = true): void {
    rt.screenCleanup?.();
    rt.screenCleanup = null;
    const { back, win, stage, panel, launcher } = rt.dom;
    back.classList.remove("show");
    win.classList.remove("show");
    stage.innerHTML = "";
    rt.tour = null;
    if (showPanel) {
      renderPanel(rt, openDemo);
      openQuickStartPanel(launcher, panel);
    }
  }

  function finishDemo(): void {
    if (!rt.tour) return;
    markTourDone(rt.tour.id, getState().recruitingRole);
    closeDemo(true);
    try {
      const toastFn = (
        window as Window & { toast?: (a: string, b: string) => void }
      ).toast;
      if (typeof toastFn === "function") {
        toastFn(
          "Walkthrough complete ✓",
          completionPct(rt.context) + "% of your Quick Start is done."
        );
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
    let tour = resolveTourById(id);
    if (!tour) return;
    if (id === "money") {
      tour = resolveMoneyTour(getState().recruitingRole);
    }
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
