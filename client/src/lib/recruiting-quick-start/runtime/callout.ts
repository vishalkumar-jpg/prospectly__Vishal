import type { QuickStartDom, QuickStartRuntime } from "./context";

/** Subset used by callout positioning — shared by recruiting and prospecting runtimes. */
export type CalloutRuntime = Pick<
  QuickStartRuntime,
  | "dom"
  | "paySaveHandler"
  | "calloutTimer"
  | "calloutCleanup"
  | "calloutReposition"
> & {
  dom: Pick<QuickStartDom, "stage">;
};

function makeCalloutEl(
  text: string,
  side: string,
  theme?: string
): HTMLDivElement {
  const cls =
    side === "right" ? "co-right" : side === "top" ? "co-top" : "co-left";
  const light = theme === "light" ? " co-light" : "";
  const tip = side === "right" ? '<span class="co-block-arrow"></span>' : "";
  const tipEnd = side === "left" ? '<span class="co-block-arrow"></span>' : "";
  const tipBot = side === "top" ? '<span class="co-block-arrow"></span>' : "";
  const wrap = document.createElement("div");
  wrap.className = "qsd-callout-wrap qsd-callout-inline";
  const co = document.createElement("div");
  co.className = "qsd-callout " + cls + light;
  co.innerHTML =
    tip + '<span class="co-pill">' + text + "</span>" + tipEnd + tipBot;
  wrap.appendChild(co);
  return wrap;
}

function getCalloutHost(stage: HTMLElement): HTMLElement {
  return (stage.parentElement as HTMLElement | null) ?? stage;
}

function removeFloatingCallouts(stage: HTMLElement): void {
  const host = getCalloutHost(stage);
  host
    .querySelectorAll(".qsd-callout-wrap.qsd-callout-floating")
    .forEach((el) => el.remove());
  stage
    .querySelectorAll(".qsd-callout-wrap:not(.qsd-callout-floating)")
    .forEach((el) => el.remove());
}

function clearCallout(rt: CalloutRuntime): void {
  if (rt.calloutTimer) {
    clearTimeout(rt.calloutTimer);
    rt.calloutTimer = null;
  }
  rt.calloutCleanup?.();
  rt.calloutCleanup = null;
  rt.calloutReposition = null;
  removeFloatingCallouts(rt.dom.stage);
}

function findHotTarget(stage: HTMLElement): HTMLElement | null {
  return (
    (stage.querySelector(
      ".m-aq-overlay .qsd-hot, .m-pm-overlay .qsd-hot, .m-ref-overlay .qsd-hot, .m-share-overlay .qsd-hot, .m-notify-overlay .qsd-hot, .m-rc-consent-overlay .qsd-hot, .m-ph-overlay .qsd-hot, .m-ir-overlay .qsd-hot"
    ) as HTMLElement | null) ||
    (stage.querySelector(".qsd-hot") as HTMLElement | null)
  );
}

function collectScrollTargets(
  stage: HTMLElement,
  hot: HTMLElement
): Array<HTMLElement | Window> {
  const targets: Array<HTMLElement | Window> = [stage, window];
  let el: HTMLElement | null = hot.parentElement;
  while (el) {
    const style = getComputedStyle(el);
    const oy = style.overflowY;
    const o = style.overflow;
    if (
      oy === "auto" ||
      oy === "scroll" ||
      oy === "overlay" ||
      o === "auto" ||
      o === "scroll"
    ) {
      targets.push(el);
    }
    if (el === stage) break;
    el = el.parentElement;
  }
  return targets;
}

/** Position inside .qsd-frame so callouts stay within the walkthrough modal. */
function clampCalloutInHost(host: HTMLElement, wrap: HTMLElement): void {
  if (window.innerWidth > 700) return;
  const hostW = host.clientWidth;
  const left = parseFloat(wrap.style.left || "0");
  const top = parseFloat(wrap.style.top || "0");
  const pad = 6;
  const maxLeft = Math.max(pad, hostW - wrap.offsetWidth - pad);
  wrap.style.left = Math.min(Math.max(pad, left), maxLeft) + "px";
  wrap.style.top = Math.max(pad, top) + "px";
}

function resolveCalloutSide(
  stage: HTMLElement,
  hot: HTMLElement,
  side: string
): string {
  // Centered assessment modal: side callouts clip on the vrail / modal edge.
  // Always place the tip above the hot control inside the Add Question popup.
  if (hot.closest(".m-aq-overlay")) return "top";

  if (window.innerWidth > 700) return side;
  // Inline foot callouts stay beside the button — don't flip to top.
  if (hot.closest(".m-wiz-foot")) return side;
  if (side === "top") return side;

  const host = getCalloutHost(stage);
  const hostRect = host.getBoundingClientRect();
  const hr = hot.getBoundingClientRect();
  const estW = Math.min(200, hostRect.width * 0.45 + 28);

  if (side === "right" && hr.right + estW > hostRect.right - 8) {
    return "top";
  }
  if (side === "left" && hr.left - estW < hostRect.left + 8) {
    return "top";
  }

  // Right-aligned CTAs (Add Question, modal primary): a "left" callout is
  // clamped onto/past the target on narrow screens, leaving the arrow pointing
  // the wrong way. Prefer top so the tip always faces the hot control.
  if (side === "left" || side === "right") {
    const spaceBeside =
      side === "left" ? hr.left - hostRect.left : hostRect.right - hr.right;
    if (spaceBeside < estW + 20) return "top";
    if (side === "left" && hostRect.right - hr.right < 140) return "top";
  }
  return side;
}

function clampCalloutToAssessmentDialog(
  host: HTMLElement,
  wrap: HTMLElement,
  hot: HTMLElement
): void {
  const dialog = hot.closest(".m-aq-dialog") as HTMLElement | null;
  if (!dialog) return;
  const hostRect = host.getBoundingClientRect();
  const dialogRect = dialog.getBoundingClientRect();
  const pad = 8;
  const minLeft = dialogRect.left - hostRect.left + pad;
  const maxLeft = dialogRect.right - hostRect.left - wrap.offsetWidth - pad;
  const left = parseFloat(wrap.style.left || "0");
  wrap.style.left = Math.min(Math.max(minLeft, left), maxLeft) + "px";
}

function positionCalloutInFrame(
  stage: HTMLElement,
  wrap: HTMLElement,
  hot: HTMLElement,
  side: string,
  gap: number
): void {
  const host = getCalloutHost(stage);
  wrap.classList.remove("qsd-callout-inline");
  wrap.classList.add("qsd-callout-floating");
  host.appendChild(wrap);
  wrap.style.position = "absolute";
  wrap.style.zIndex = "45";

  const hostRect = host.getBoundingClientRect();
  const hr = hot.getBoundingClientRect();

  if (side === "top") {
    wrap.style.transform = "none";
    wrap.style.top = hr.top - hostRect.top - wrap.offsetHeight - gap + "px";
    wrap.style.left =
      hr.left - hostRect.left + hr.width / 2 - wrap.offsetWidth / 2 + "px";
    if (hot.closest(".m-aq-overlay")) {
      clampCalloutToAssessmentDialog(host, wrap, hot);
    }
    clampCalloutInHost(host, wrap);
    return;
  }

  wrap.style.transform = "translateY(-50%)";
  wrap.style.top = hr.top - hostRect.top + hr.height / 2 + "px";
  if (side === "right") {
    wrap.style.left = hr.right - hostRect.left + gap + "px";
  } else {
    const vrail = stage.querySelector(".m-vrail");
    const minLeft = vrail
      ? vrail.getBoundingClientRect().right - hostRect.left + 8
      : 8;
    const left = hr.left - hostRect.left - wrap.offsetWidth - gap;
    wrap.style.left = Math.max(minLeft, left) + "px";
  }
  clampCalloutInHost(host, wrap);
}

function bindCalloutReposition(
  rt: CalloutRuntime,
  stage: HTMLElement,
  hot: HTMLElement,
  place: (initial: boolean) => void
): void {
  if (rt.calloutCleanup) return;

  const targets = collectScrollTargets(stage, hot);
  let raf = 0;
  const onReposition = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!stage.isConnected || !hot.isConnected) return;
      place(false);
    });
  };

  const opts: AddEventListenerOptions = { passive: true };
  targets.forEach((target) => {
    if (target === window) {
      window.addEventListener("scroll", onReposition, {
        ...opts,
        capture: true,
      });
      window.addEventListener("resize", onReposition, opts);
    } else {
      target.addEventListener("scroll", onReposition, opts);
    }
  });

  rt.calloutCleanup = () => {
    if (raf) cancelAnimationFrame(raf);
    targets.forEach((target) => {
      if (target === window) {
        window.removeEventListener("scroll", onReposition, true);
        window.removeEventListener("resize", onReposition);
      } else {
        target.removeEventListener("scroll", onReposition);
      }
    });
  };
}

export function attachCallout(rt: CalloutRuntime, onAdvance: () => void): void {
  const { stage } = rt.dom;
  clearCallout(rt);

  function place(initial: boolean): void {
    const hot = findHotTarget(stage);
    if (!hot) return;
    removeFloatingCallouts(stage);
    stage
      .querySelectorAll(".m-co-foot")
      .forEach((el) => el.classList.remove("m-co-foot"));

    const side = resolveCalloutSide(
      stage,
      hot,
      hot.getAttribute("data-co-side") || "left"
    );
    const text = hot.getAttribute("data-callout") || "";
    const theme = hot.getAttribute("data-co-theme") || "";
    const action = hot.getAttribute("data-co-action") || "next";
    const interactive = action !== "none";

    const adv = (e: Event) => {
      e.stopPropagation();
      if (!interactive) return;
      if (action === "save") {
        rt.paySaveHandler?.();
        return;
      }
      if (hot.id === "payContinue" && hot.classList.contains("locked")) return;
      onAdvance();
    };

    let wrap = makeCalloutEl(text, side, theme);
    if (interactive) wrap.onclick = adv;
    const foot = hot.closest(".m-wiz-foot");

    if (hot.id === "paySaveBtn") {
      let row = hot.closest(".m-pay-save-row");
      if (!row) {
        row = document.createElement("div");
        row.className = "m-pay-save-row";
        hot.parentNode?.insertBefore(row, hot);
        row.appendChild(hot);
      }
      row.querySelectorAll(".qsd-callout-wrap").forEach((el) => el.remove());
      wrap = makeCalloutEl(text, "top", theme);
      if (interactive) wrap.onclick = adv;
      row.insertBefore(wrap, hot);
      if (interactive) hot.onclick = adv;
      if (initial) hot.scrollIntoView({ block: "nearest", inline: "nearest" });
      bindCalloutReposition(rt, stage, hot, place);
      return;
    }

    if (side === "top") {
      const gap =
        hot.id === "jmReferBtn" ||
        hot.id === "jmShareBtn" ||
        hot.id === "shareCopyBtn" ||
        hot.id === "refApproveBtn" ||
        hot.id === "refConsentSendBtn" ||
        hot.id === "phSendIntroBtn" ||
        hot.id === "phMoreInfoBtn" ||
        hot.id === "phRequestIntroBtn" ||
        hot.id === "phSearchBtn" ||
        hot.id === "irAcceptBtn" ||
        hot.id === "irAcceptRequestBtn" ||
        hot.id === "irSendIntroBtn" ||
        hot.id === "oppShareBtn" ||
        hot.id === "pfTabTransactions" ||
        hot.id === "pfTabPayouts" ||
        hot.id === "aqOpenAddBtn" ||
        hot.id === "aqBankAddBtn" ||
        hot.id === "aqWriteAddBtn" ||
        hot.id === "aqBankRow1" ||
        hot.id === "aqAnswerTypeSelect" ||
        hot.id === "aqAnswerTypeOptYesNo" ||
        hot.id === "aqSaveToBankRow"
          ? 12
          : 6;
      if (initial) hot.scrollIntoView({ block: "nearest", inline: "nearest" });
      positionCalloutInFrame(stage, wrap, hot, side, gap);
      if (interactive) hot.onclick = adv;
      bindCalloutReposition(rt, stage, hot, place);
      return;
    }

    if (
      foot &&
      (hot.classList.contains("continue") || hot.id === "payContinue")
    ) {
      foot.classList.add("m-co-foot");
      foot.querySelectorAll(".qsd-callout-wrap").forEach((el) => el.remove());
      foot.insertBefore(wrap, hot);
      if (interactive) hot.onclick = adv;
      if (initial) hot.scrollIntoView({ block: "nearest", inline: "nearest" });
      bindCalloutReposition(rt, stage, hot, place);
      return;
    }

    if (initial) hot.scrollIntoView({ block: "nearest", inline: "nearest" });
    positionCalloutInFrame(stage, wrap, hot, side, 2);
    if (interactive) hot.onclick = adv;
    bindCalloutReposition(rt, stage, hot, place);
  }

  rt.calloutReposition = () => place(false);

  const run = () => place(true);
  rt.calloutTimer = setTimeout(run, 50);
}

export { clearCallout };
