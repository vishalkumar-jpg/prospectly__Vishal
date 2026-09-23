import { FIND_PROSPECT_DEMO as D } from "../builders/find-prospect-demo";
import {
  prospectingFinancePageMeta,
  prospectingFinanceTabContent,
} from "../builders/prospecting-finance";
import type { PfFinanceTab } from "../builders/transactions-demo";
import { OPP_SHARE_DEMO } from "../builders/share-opportunity-demo";
import { IC, svgIc } from "../icons";
import { PROSPECTLY_LOGO_URLS } from "../logo-url";
import type { QuickStartRuntime } from "./context";
import { attachCallout } from "./callout";

export function bindQuickStartLogos(rt: QuickStartRuntime): void {
  const imgs = rt.dom.stage.querySelectorAll(
    ".m-logo-img"
  ) as NodeListOf<HTMLImageElement>;
  imgs.forEach((img) => {
    let attempt = 0;
    img.alt = "";
    img.decoding = "async";
    const tryLoad = () => {
      if (attempt >= PROSPECTLY_LOGO_URLS.length) return;
      img.src = PROSPECTLY_LOGO_URLS[attempt];
      attempt += 1;
    };
    img.onerror = tryLoad;
    tryLoad();
  });
}

function typeInInput(
  rt: QuickStartRuntime,
  inpId: string,
  text: string,
  cb?: () => void
): void {
  const inp = rt.dom.stage.querySelector(inpId) as HTMLInputElement | null;
  if (!inp) {
    cb?.();
    return;
  }
  inp.value = "";
  let n = 0;
  const t = setInterval(() => {
    n++;
    inp.value = text.slice(0, n);
    if (n >= text.length) {
      clearInterval(t);
      cb?.();
    }
  }, 45);
}

export function bindFindProspectSearch(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  const expectedIdx = rt.idx;
  setTimeout(() => {
    if (rt.idx !== expectedIdx || rt.tour?.id !== "find-prospect") return;

    const { stage } = rt.dom;
    const searchBtn = stage.querySelector(
      "#phSearchBtn"
    ) as HTMLButtonElement | null;
    const hint = stage.querySelector("#phSearchHint");

    if (searchBtn) {
      searchBtn.classList.remove("ready", "qsd-hot");
      searchBtn.removeAttribute("data-callout");
    }

    typeInInput(rt, "#phLinkedinIn", D.linkedin, () => {
      typeInInput(rt, "#phCompanyIn", D.company, () => {
        typeInInput(rt, "#phNameIn", D.prospectName, () => {
          typeInInput(rt, "#phEmailIn", D.email, () => {
            typeInInput(rt, "#phWebsiteIn", D.website, () => {
              if (hint) {
                hint.className = "m-ph-hint success m-ref-fade-in";
                hint.innerHTML =
                  IC.checkCircle + "Ready to search with profile details.";
              }
              if (searchBtn) {
                searchBtn.classList.add("ready", "qsd-hot");
                searchBtn.setAttribute(
                  "data-callout",
                  "Click Search Prospects"
                );
                searchBtn.setAttribute("data-co-side", "top");
                searchBtn.onclick = (e) => {
                  e.stopPropagation();
                  onAdvance();
                };
              }
              attachCallout(rt, onAdvance);
            });
          });
        });
      });
    });
  }, 200);
}

export function bindTrackRequestEducationStep(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindTrackRequestHotBtn(rt, rt.idx, "#mpTourContinueBtn", onAdvance);
}

export function bindTrackRequestPipeline(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindTrackRequestHotBtn(rt, rt.idx, "#mpContinueBtn", onAdvance);
}

function bindTrackRequestHotBtn(
  rt: QuickStartRuntime,
  expectedIdx: number,
  selector: string,
  onAdvance: () => void
): void {
  setTimeout(() => {
    if (rt.idx !== expectedIdx || rt.tour?.id !== "track-request") return;
    const btn = rt.dom.stage.querySelector(
      selector
    ) as HTMLButtonElement | null;
    if (btn) {
      btn.onclick = (e) => {
        e.stopPropagation();
        onAdvance();
      };
    }
    attachCallout(rt, onAdvance);
  }, 100);
}

export function bindTrackRequestDetailsHot(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindTrackRequestHotBtn(rt, rt.idx, "#mpDetailsBtn", onAdvance);
}

export function bindTrackRequestDetailsModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindTrackRequestHotBtn(rt, rt.idx, "#mpDetailsCloseBtn", onAdvance);
}

export function bindTrackRequestFinanceHot(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindTrackRequestHotBtn(rt, rt.idx, "#mpFinanceBtn", onAdvance);
}

export function bindTrackRequestFinanceModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindTrackRequestHotBtn(rt, rt.idx, "#mpFinanceCloseBtn", onAdvance);
}

export function bindTrackRequestConfirmHot(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindTrackRequestHotBtn(rt, rt.idx, "#mpConfirmBtn", onAdvance);
}

export function bindTrackRequestAcknowledgeModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindTrackRequestHotBtn(rt, rt.idx, "#mpAcknowledgeBtn", onAdvance);
}

export function bindTrackRequestFeedbackHot(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindTrackRequestHotBtn(rt, rt.idx, "#mpFeedbackBtn", onAdvance);
}

export function bindTrackRequestFeedbackModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  const expectedIdx = rt.idx;
  setTimeout(() => {
    if (rt.idx !== expectedIdx || rt.tour?.id !== "track-request") return;

    const { stage } = rt.dom;
    const stars = stage.querySelectorAll(
      ".m-mp-fb-star"
    ) as NodeListOf<HTMLButtonElement>;
    const textarea = stage.querySelector(
      "#mpFeedbackText"
    ) as HTMLTextAreaElement | null;
    const submitBtn = stage.querySelector(
      "#mpFeedbackSubmitBtn"
    ) as HTMLButtonElement | null;

    const feedbackText =
      "Marcus was responsive and the intro led to a productive conversation. Great experience overall.";

    const isStepActive = () =>
      rt.idx === expectedIdx && rt.tour?.id === "track-request";

    let starTimer: ReturnType<typeof setInterval> | null = null;
    let textTimer: ReturnType<typeof setInterval> | null = null;

    const stopTimers = () => {
      if (starTimer) clearInterval(starTimer);
      if (textTimer) clearInterval(textTimer);
      starTimer = null;
      textTimer = null;
    };

    let starIdx = 0;
    starTimer = setInterval(() => {
      if (!isStepActive()) {
        stopTimers();
        return;
      }
      starIdx++;
      stars.forEach((star, i) => {
        star.classList.toggle("on", i < starIdx);
      });
      rt.calloutReposition?.();
      if (starIdx >= 5) {
        if (starTimer) clearInterval(starTimer);
        starTimer = null;
        if (textarea) {
          let n = 0;
          textTimer = setInterval(() => {
            if (!isStepActive()) {
              stopTimers();
              return;
            }
            n++;
            textarea.value = feedbackText.slice(0, n);
            if (n % 10 === 0) rt.calloutReposition?.();
            if (n >= feedbackText.length) {
              if (textTimer) clearInterval(textTimer);
              textTimer = null;
              rt.calloutReposition?.();
            }
          }, 16);
        }
      }
    }, 120);

    if (submitBtn) {
      submitBtn.onclick = (e) => {
        e.stopPropagation();
        onAdvance();
      };
    }
    setTimeout(() => {
      if (!isStepActive()) return;
      attachCallout(rt, onAdvance);
    }, 900);
  }, 150);
}

export function bindFindProspectMoreInfo(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  const expectedIdx = rt.idx;
  setTimeout(() => {
    if (rt.idx !== expectedIdx || rt.tour?.id !== "find-prospect") return;
    const btn = rt.dom.stage.querySelector(
      "#phMoreInfoBtn"
    ) as HTMLButtonElement | null;
    if (btn) {
      btn.onclick = (e) => {
        e.stopPropagation();
        onAdvance();
      };
    }
    attachCallout(rt, onAdvance);
  }, 200);
}

export function bindFindProspectRequestIntro(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  const expectedIdx = rt.idx;
  setTimeout(() => {
    if (rt.idx !== expectedIdx || rt.tour?.id !== "find-prospect") return;
    const btn = rt.dom.stage.querySelector(
      "#phRequestIntroBtn"
    ) as HTMLButtonElement | null;
    if (btn) {
      btn.onclick = (e) => {
        e.stopPropagation();
        onAdvance();
      };
    }
    attachCallout(rt, onAdvance);
  }, 200);
}

export function bindFindProspectIntroModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  const expectedIdx = rt.idx;
  setTimeout(() => {
    if (rt.idx !== expectedIdx || rt.tour?.id !== "find-prospect") return;

    const { stage } = rt.dom;
    const title = stage.querySelector(
      "#phMeetingTitle"
    ) as HTMLInputElement | null;
    const desc = stage.querySelector(
      "#phMeetingDesc"
    ) as HTMLTextAreaElement | null;
    const ctx = stage.querySelector(
      "#phMeetingCtx"
    ) as HTMLTextAreaElement | null;
    const sendBtn = stage.querySelector(
      "#phSendIntroBtn"
    ) as HTMLButtonElement | null;

    if (sendBtn) {
      sendBtn.classList.add("qsd-hot");
      sendBtn.setAttribute("data-callout", "Click Send Request");
      sendBtn.setAttribute("data-co-side", "top");
      sendBtn.onclick = (e) => {
        e.stopPropagation();
        onAdvance();
      };
      const scrollEl = sendBtn.closest(
        ".m-ph-dialog-scroll"
      ) as HTMLElement | null;
      if (scrollEl) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
    }

    attachCallout(rt, onAdvance);

    const typeTextarea = (
      el: HTMLTextAreaElement | null,
      text: string,
      cb?: () => void
    ) => {
      if (!el) {
        cb?.();
        return;
      }
      el.value = "";
      let n = 0;
      const timer = setInterval(() => {
        n++;
        el.value = text.slice(0, n);
        if (n % 12 === 0) rt.calloutReposition?.();
        if (n >= text.length) {
          clearInterval(timer);
          rt.calloutReposition?.();
          cb?.();
        }
      }, 18);
    };

    typeInInput(rt, "#phMeetingTitle", D.meetingTitle, () => {
      rt.calloutReposition?.();
      typeTextarea(desc, D.meetingDescription, () => {
        rt.calloutReposition?.();
        typeTextarea(ctx, D.additionalContext, () => {
          rt.calloutReposition?.();
        });
      });
    });
  }, 50);
}

function bindFulfillHotBtn(
  rt: QuickStartRuntime,
  tourId: string,
  expectedIdx: number,
  selector: string,
  onAdvance: () => void
): void {
  setTimeout(() => {
    if (rt.idx !== expectedIdx || rt.tour?.id !== tourId) return;
    const btn = rt.dom.stage.querySelector(
      selector
    ) as HTMLButtonElement | null;
    if (btn) {
      btn.onclick = (e) => {
        e.stopPropagation();
        onAdvance();
      };
    }
    attachCallout(rt, onAdvance);
  }, 100);
}

export function bindFulfillInboxAccept(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindFulfillHotBtn(rt, "fulfill-request", rt.idx, "#irAcceptBtn", onAdvance);
}

export function bindFulfillIntroAccept(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindFulfillHotBtn(
    rt,
    "fulfill-request",
    rt.idx,
    "#irAcceptRequestBtn",
    onAdvance
  );
}

export function bindFulfillSendIntro(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindFulfillHotBtn(
    rt,
    "fulfill-request",
    rt.idx,
    "#irSendIntroBtn",
    onAdvance
  );
}

export function bindFulfillPipelineContinue(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindFulfillHotBtn(rt, "fulfill-request", rt.idx, "#irContinueBtn", onAdvance);
}

export function bindProspectingFinanceTabs(rt: QuickStartRuntime): void {
  const { stage } = rt.dom;
  const main = stage.querySelector(".m-pf-main");
  const hero = stage.querySelector(".m-pf-hero-text");
  if (!main || !hero) return;

  stage.querySelectorAll("[data-pf-tab]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const tab = el.getAttribute("data-pf-tab") as PfFinanceTab | null;
      if (!tab) return;

      main.innerHTML = prospectingFinanceTabContent(tab);
      const meta = prospectingFinancePageMeta(tab);
      const h1 = hero.querySelector("h1");
      const p = hero.querySelector("p");
      if (h1) h1.textContent = meta.heading;
      if (p) p.textContent = meta.description;

      stage.querySelectorAll(".m-pf-tab").forEach((tabEl) => {
        tabEl.classList.toggle("on", tabEl.getAttribute("data-pf-tab") === tab);
      });
    });
  });
}

export function bindTransactionsContinue(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindFulfillHotBtn(rt, "transactions", rt.idx, "#pfContinueBtn", onAdvance);
}

export function bindShareOpportunityModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  setTimeout(() => {
    const { stage } = rt.dom;
    const linkEl = stage.querySelector("#shareLinkText");
    const copyBtn = stage.querySelector(
      "#shareCopyBtn"
    ) as HTMLButtonElement | null;
    const toast = stage.querySelector("#shareCopiedToast");
    const preview = stage.querySelector(".m-share-preview");

    if (linkEl) {
      linkEl.classList.remove("ready");
      linkEl.textContent = "Click a share option to generate your link";
    }
    if (copyBtn) {
      copyBtn.disabled = true;
      copyBtn.classList.remove("copied", "qsd-hot");
      copyBtn.innerHTML = IC.copy + "<span>Copy</span>";
    }
    if (toast) toast.classList.remove("show");
    if (preview) preview.remove();

    setTimeout(() => {
      if (linkEl) {
        linkEl.textContent = OPP_SHARE_DEMO.shareUrl;
        linkEl.classList.add("ready", "m-ref-fade-in");
      }
      const body = stage.querySelector(".m-share-body");
      if (body && !stage.querySelector(".m-share-preview")) {
        const a = document.createElement("a");
        a.className = "m-share-preview m-ref-fade-in";
        a.href = "#";
        a.innerHTML = IC.externalLink + "<span>Preview public page</span>";
        body.appendChild(a);
      }
      if (copyBtn) copyBtn.disabled = false;
    }, 550);

    setTimeout(() => {
      if (!copyBtn) return;
      copyBtn.classList.add("qsd-hot");
      copyBtn.setAttribute("data-callout", "Click Copy");
      copyBtn.setAttribute("data-co-side", "top");
      attachCallout(rt, onAdvance);
      setTimeout(() => {
        if (!copyBtn) return;
        copyBtn.onclick = (e) => {
          e.stopPropagation();
          if (copyBtn.classList.contains("copied")) return;
          copyBtn.classList.add("copied");
          copyBtn.classList.remove("qsd-hot");
          copyBtn.innerHTML =
            svgIc('<path d="M20 6 9 17l-5-5"/>', 14, 14) +
            "<span>Copied</span>";
          if (toast) toast.classList.add("show");
          stage
            .querySelectorAll(".qsd-callout-wrap")
            .forEach((el) => el.remove());
          setTimeout(() => onAdvance(), 750);
        };
      }, 360);
    }, 1100);
  }, 200);
}
