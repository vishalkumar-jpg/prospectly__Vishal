import { payoutSummaryText } from "../builders/wizard-steps/payout-helpers";
import { IC, svgIc } from "../icons";
import { utcDayjs } from "@/lib/dayjs";
import { detectBrowserTimezone, majorTimezoneLabel } from "@/lib/timezones";
import type { PayoutBindState } from "../types";
import type { QuickStartRuntime } from "./context";
import { runTypeEffects } from "./effects";
import { attachCallout } from "./callout";
import { PROSPECTLY_LOGO_URLS } from "../logo-url";

function setWalkthroughFooterDesc(html: string): void {
  const descEl = document.getElementById("qsdD");
  if (descEl) descEl.innerHTML = html;
}

const BUDGET_FOOTER_DESC =
  "No per-candidate charge — shortlist as many candidates as you like.<br>A small fee is charged when you shortlist your first candidate; the full flat referral fee is charged only when you hire.";

function payoutFooterDesc(empHire: boolean, outHire: boolean): string {
  if (empHire && outHire) {
    return "All connectors are payable as soon as you hire.";
  }
  if (!empHire && !outHire) {
    return "All connectors are payable after the waiting period.";
  }
  if (empHire && !outHire) {
    return "Your employees are payable as soon as you hire, and outside connectors are payable after the waiting period.";
  }
  return "Your outside connectors are payable as soon as you hire, and your employees are payable after the waiting period.";
}

/** Ensure sidebar logo loads (innerHTML img src can fail without Vite URL resolution). */
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

export function bindReferInboxApprove(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  setTimeout(() => {
    const btn = rt.dom.stage.querySelector(
      "#refApproveBtn"
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

export function bindReferConsentModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindPipeModalConfirm(rt, "refConsentSendBtn", "Send Consent", onAdvance);
}

export function bindReferUploadModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  setTimeout(() => {
    const { stage } = rt.dom;
    const fileList = stage.querySelector("#refFileList");
    const emailField = stage.querySelector("#refEmailField");
    const consentBox = stage.querySelector("#refConsentBox");
    const consentCheck = stage.querySelector("#refConsentCheck");
    const uploadBtn = stage.querySelector(
      "#refUploadBtn"
    ) as HTMLButtonElement | null;
    const uploadLabel = stage.querySelector("#refUploadLabel");

    if (fileList) fileList.classList.add("m-ref-hidden");
    if (emailField) emailField.classList.add("m-ref-hidden");
    if (consentBox) consentBox.classList.remove("checked");
    if (consentCheck) consentCheck.classList.remove("on");
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.classList.add("locked");
      uploadBtn.classList.remove("qsd-hot");
    }
    if (uploadLabel) uploadLabel.textContent = "Upload Resume";

    setTimeout(() => {
      if (fileList) {
        fileList.classList.remove("m-ref-hidden");
        fileList.classList.add("m-ref-fade-in");
      }
    }, 500);

    setTimeout(() => {
      if (emailField) {
        emailField.classList.remove("m-ref-hidden");
        emailField.classList.add("m-ref-fade-in");
      }
      runTypeEffects(rt, "#refEmailIn", 0);
    }, 950);

    setTimeout(() => {
      if (consentBox) consentBox.classList.add("checked");
      if (consentCheck) consentCheck.classList.add("on");
    }, 1500);

    setTimeout(() => {
      if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.classList.remove("locked");
        uploadBtn.classList.add("qsd-hot");
        uploadBtn.setAttribute("data-callout", "Upload Resume (1)");
        uploadBtn.setAttribute("data-co-side", "top");
        uploadBtn.onclick = (e) => {
          e.stopPropagation();
          onAdvance();
        };
      }
      if (uploadLabel) uploadLabel.textContent = "Upload Resume (1)";
      attachCallout(rt, onAdvance);
    }, 1850);
  }, 200);
}

export function bindShareModal(
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
        linkEl.textContent =
          "https://prospectly.com/jobs/insurance-va-office-beacon?ref=you";
        linkEl.classList.add("ready", "m-ref-fade-in");
      }
      const body = stage.querySelector(".m-share-body");
      if (body && !stage.querySelector(".m-share-preview")) {
        const a = document.createElement("a");
        a.className = "m-share-preview m-ref-fade-in";
        a.href = "#";
        a.innerHTML =
          svgIc(
            '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
            12,
            12
          ) + "<span>Preview public page</span>";
        body.appendChild(a);
      }
      if (copyBtn) {
        copyBtn.disabled = false;
      }
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

export function bindNotifyModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  setTimeout(() => {
    const { stage } = rt.dom;
    const orgBox = stage.querySelector("#notifyOrgBox");
    const send = stage.querySelector(
      "#notifySendBtn"
    ) as HTMLButtonElement | null;
    const recip = stage.querySelector("#notifyRecip");

    if (orgBox) {
      orgBox.classList.remove("filled");
      orgBox.innerHTML =
        svgIc(
          '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>'
        ) +
        '<span class="m-notify-org-placeholder">Select Organization…</span>' +
        '<span class="m-notify-org-chev">' +
        svgIc('<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>', 16, 16) +
        "</span>";
    }
    if (recip) {
      recip.classList.add("m-notify-recip-hidden");
      recip.innerHTML = "";
    }
    if (send) {
      send.classList.add("locked");
      send.disabled = true;
      const label = send.querySelector("span:last-child");
      if (label) label.textContent = "Send Notification";
    }

    setTimeout(() => {
      if (orgBox) {
        orgBox.classList.add("filled");
        orgBox.innerHTML =
          svgIc(
            '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>'
          ) +
          '<span class="m-notify-org-val">1 Organization selected</span>' +
          '<span class="m-notify-org-chev">' +
          svgIc('<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>', 16, 16) +
          "</span>";
      }
      if (recip) {
        recip.classList.remove("m-notify-recip-hidden");
        recip.innerHTML =
          svgIc(
            '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
          ) + "<span>This will email <b>~48</b> user(s).</span>";
      }
      if (send) {
        send.classList.remove("locked");
        send.disabled = false;
        send.classList.add("qsd-hot");
        send.setAttribute("data-callout", "Click Send Notification");
        send.setAttribute("data-co-side", "top");
        send.onclick = (e) => {
          e.stopPropagation();
          onAdvance();
        };
      }
      attachCallout(rt, onAdvance);
    }, 550);
  }, 200);
}

function bindPipeModalConfirm(
  rt: QuickStartRuntime,
  confirmId: string,
  callout: string,
  onAdvance: () => void
): void {
  setTimeout(() => {
    const confirm = rt.dom.stage.querySelector(
      "#" + confirmId
    ) as HTMLButtonElement | null;
    if (!confirm) return;
    confirm.classList.add("qsd-hot");
    confirm.setAttribute("data-callout", callout);
    confirm.setAttribute("data-co-side", "top");
    confirm.onclick = (e) => {
      e.stopPropagation();
      onAdvance();
    };
    attachCallout(rt, onAdvance);
  }, 200);
}

export function bindShortlistModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindPipeModalConfirm(
    rt,
    "pipeShortlistConfirm",
    "Authorize & Shortlist",
    onAdvance
  );
}

export function bindViewCandidateModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  setTimeout(() => {
    const { stage } = rt.dom;
    const dialog = stage.querySelector(".m-cdm-dialog");

    if (dialog && !dialog.hasAttribute("data-cdm-tabs-bound")) {
      dialog.setAttribute("data-cdm-tabs-bound", "1");
      dialog.addEventListener("click", (e) => {
        const tab = (e.target as HTMLElement).closest(
          ".m-cdm-tab"
        ) as HTMLElement | null;
        if (!tab) return;
        e.stopPropagation();
        const id = tab.getAttribute("data-tab");
        if (!id) return;
        dialog.querySelectorAll(".m-cdm-tab").forEach((t) => {
          const on = t.getAttribute("data-tab") === id;
          t.classList.toggle("on", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        dialog.querySelectorAll(".m-cdm-panel").forEach((p) => {
          p.classList.toggle("on", p.getAttribute("data-panel") === id);
        });
        const panels = dialog.querySelector(".m-cdm-panels");
        if (panels) panels.scrollTop = 0;
      });
    }

    const shortlist = stage.querySelector(
      "#pipeViewShortlist"
    ) as HTMLElement | null;
    if (!shortlist) return;
    shortlist.classList.add("qsd-hot");
    shortlist.setAttribute("data-callout", "Click Shortlist");
    shortlist.setAttribute("data-co-side", "top");
    shortlist.onclick = (e) => {
      e.stopPropagation();
      onAdvance();
    };
    attachCallout(rt, onAdvance);
  }, 200);
}

export function bindHireModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  setTimeout(() => {
    const { stage } = rt.dom;
    const dateInput = stage.querySelector(
      "#hireDateInput"
    ) as HTMLInputElement | null;
    const segInternal = stage.querySelector("#hireSegInternal");
    const segExternal = stage.querySelector("#hireSegExternal");
    const checkWrap = stage.querySelector("#hireActiveCheck");
    const checkInput = stage.querySelector(
      "#hireActiveInput"
    ) as HTMLInputElement | null;
    const connCard = stage.querySelector("#hireConnCard");
    const confirm = stage.querySelector(
      "#pipeHireConfirm"
    ) as HTMLButtonElement | null;

    if (dateInput) dateInput.value = "";
    if (segInternal) segInternal.classList.remove("on");
    if (segExternal) segExternal.classList.remove("on");
    if (checkWrap) checkWrap.classList.remove("on");
    if (checkInput) checkInput.checked = false;
    if (connCard) connCard.classList.remove("m-pm-conn-internal");
    if (confirm) {
      confirm.classList.remove("qsd-hot");
      confirm.disabled = true;
      confirm.classList.add("locked");
    }

    setTimeout(() => {
      if (dateInput) {
        dateInput.value = utcDayjs().format("YYYY-MM-DD");
        dateInput.classList.add("m-ref-fade-in", "m-pm-date-filled");
      }
      if (segInternal) segInternal.classList.add("on", "m-ref-fade-in");
      if (connCard)
        connCard.classList.add("m-pm-conn-internal", "m-ref-fade-in");
      if (checkWrap) checkWrap.classList.add("on", "m-ref-fade-in");
      if (checkInput) {
        checkInput.checked = true;
        checkInput.classList.add("m-ref-fade-in");
      }
      if (confirm) {
        confirm.disabled = false;
        confirm.classList.remove("locked");
        confirm.classList.add("qsd-hot");
        confirm.setAttribute("data-callout", "Pay & Move to Hired");
        confirm.setAttribute("data-co-side", "top");
        confirm.onclick = (e) => {
          e.stopPropagation();
          onAdvance();
        };
      }
      attachCallout(rt, onAdvance);
    }, 500);
  }, 200);
}

export function bindScheduleModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindInterviewInviteModal(rt, onAdvance, {
    startId: "pipeInviteStart",
    endId: "pipeInviteEnd",
    tzId: "pipeInviteTz",
    confirmId: "pipeScheduleConfirm",
    confirmCallout: "Send Interview Invite",
  });
}

export function bindRescheduleModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  bindInterviewInviteModal(rt, onAdvance, {
    startId: "pipeRescheduleStart",
    endId: "pipeRescheduleEnd",
    tzId: "pipeRescheduleTz",
    confirmId: "pipeRescheduleConfirm",
    confirmCallout: "Send New Booking Link",
  });
}

function bindInterviewInviteModal(
  rt: QuickStartRuntime,
  onAdvance: () => void,
  ids: {
    startId: string;
    endId: string;
    tzId: string;
    confirmId: string;
    confirmCallout: string;
  }
): void {
  const placeholders = {
    start: "Select time…",
    end: "Select time…",
    tz: "Select timezone…",
  };

  setTimeout(() => {
    const { stage } = rt.dom;
    const start = stage.querySelector("#" + ids.startId);
    const end = stage.querySelector("#" + ids.endId);
    const tz = stage.querySelector("#" + ids.tzId);
    const confirm = stage.querySelector(
      "#" + ids.confirmId
    ) as HTMLButtonElement | null;

    const resetSelect = (el: Element | null, placeholder: string) => {
      if (!el) return;
      el.classList.remove("filled", "m-ref-fade-in");
      const span = el.querySelector("span");
      if (span) span.textContent = placeholder;
    };

    resetSelect(start, placeholders.start);
    resetSelect(end, placeholders.end);
    resetSelect(tz, placeholders.tz);
    if (confirm) {
      confirm.classList.remove("qsd-hot");
      confirm.disabled = true;
      confirm.classList.add("locked");
    }

    const fillSelect = (el: Element | null, value: string) => {
      if (!el) return;
      const span = el.querySelector("span");
      if (span) span.textContent = value;
      el.classList.add("filled", "m-ref-fade-in");
    };

    const enableConfirm = () => {
      if (!confirm) return;
      confirm.disabled = false;
      confirm.classList.remove("locked");
      confirm.classList.add("qsd-hot");
      confirm.setAttribute("data-callout", ids.confirmCallout);
      confirm.setAttribute("data-co-side", "top");
      confirm.onclick = (e) => {
        e.stopPropagation();
        onAdvance();
      };
      attachCallout(rt, onAdvance);
    };

    setTimeout(() => fillSelect(start, formatTime12h("09:00")), 500);
    setTimeout(() => fillSelect(end, formatTime12h("17:00")), 750);
    setTimeout(() => {
      fillSelect(tz, majorTimezoneLabel(detectBrowserTimezone()));
      enableConfirm();
    }, 1000);
  }, 200);
}

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number.parseInt(hStr, 10);
  const m = mStr ?? "00";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${m} ${ampm}`;
}

export function bindOutcomeModal(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  setTimeout(() => {
    const { stage } = rt.dom;
    const box = stage.querySelector("#outcomeSelectBox");
    const confirm = stage.querySelector(
      "#pipeOutcomeConfirm"
    ) as HTMLButtonElement | null;

    if (box) {
      box.classList.remove("filled");
      const span = box.querySelector("span");
      if (span) span.textContent = "Select outcome…";
    }
    if (confirm) {
      confirm.classList.remove("qsd-hot");
      confirm.disabled = true;
      confirm.classList.add("locked");
    }

    setTimeout(() => {
      if (box) {
        box.classList.add("filled");
        const span = box.querySelector("span");
        if (span) span.textContent = "Interview Completed";
      }
      if (confirm) {
        confirm.disabled = false;
        confirm.classList.remove("locked");
        confirm.classList.add("qsd-hot");
        confirm.setAttribute("data-callout", "Confirm Outcome");
        confirm.setAttribute("data-co-side", "top");
        confirm.onclick = (e) => {
          e.stopPropagation();
          onAdvance();
        };
      }
      attachCallout(rt, onAdvance);
    }, 500);
  }, 200);
}

export function bindDescAccordion(rt: QuickStartRuntime): void {
  const { stage } = rt.dom;
  const items = stage.querySelectorAll(".m-desc-item");
  items.forEach((item) => {
    const btn = item.querySelector(".m-desc-head");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      item.classList.toggle("open");
      if (!item.classList.contains("open")) return;
      const area = item.querySelector(".m-desc-area.qsd-type");
      if (area && !area.textContent?.trim()) {
        area.textContent = "";
        area.classList.add("typing");
        const text = area.getAttribute("data-type") || "";
        let n = 0;
        const t = setInterval(() => {
          n++;
          area.textContent = text.slice(0, n);
          if (n >= text.length) {
            clearInterval(t);
            area.classList.remove("typing");
          }
        }, 32);
      }
    });
  });
}

export function bindBudgetStep(rt: QuickStartRuntime): void {
  const { stage } = rt.dom;

  setWalkthroughFooterDesc(BUDGET_FOOTER_DESC);

  setTimeout(() => {
    runTypeEffects(rt, "#salMin,#salMax", 200);
    setTimeout(() => {
      runTypeEffects(rt, "#flatFee", 120);
      const tbl = stage.querySelector("#flatFeeTbl") as HTMLElement | null;
      if (tbl) tbl.style.opacity = "0";
      setTimeout(() => {
        if (tbl) {
          tbl.style.transition = "opacity .4s";
          tbl.style.opacity = "1";
        }
      }, 600);
    }, 1200);
  }, 300);
}

export function bindPayoutOpts(rt: QuickStartRuntime): void {
  const { stage } = rt.dom;
  const bindState: PayoutBindState = { empHire: true, outHire: false, days: 0 };
  const waitBox = stage.querySelector("#payoutWait") as HTMLElement | null;
  const errEl = stage.querySelector("#payoutErr");
  const sumEl = stage.querySelector("#payoutSum span:last-child");

  function refresh(): void {
    const anyWait = !bindState.empHire || !bindState.outHire;
    if (waitBox) waitBox.style.display = anyWait ? "" : "none";
    if (errEl) errEl.classList.toggle("show", anyWait && bindState.days < 1);
    if (sumEl)
      sumEl.innerHTML = payoutSummaryText(
        bindState.empHire,
        bindState.outHire,
        bindState.days || 30
      );
    setWalkthroughFooterDesc(
      payoutFooterDesc(bindState.empHire, bindState.outHire)
    );
  }

  function pickGrp(grp: "emp" | "out", hire: boolean): void {
    if (grp === "emp") bindState.empHire = hire;
    else bindState.outHire = hire;
    const wrap = stage.querySelector(
      grp === "emp" ? "#payoutEmp" : "#payoutOut"
    );
    if (wrap) {
      const opts = wrap.querySelectorAll(".m-payout-opt");
      opts.forEach((o, i) =>
        o.classList.toggle("on", hire ? i === 0 : i === 1)
      );
    }
    refresh();
  }

  stage.querySelectorAll(".m-payout-type").forEach((block) => {
    const parent = block.parentElement;
    const grp = parent?.id === "payoutEmp" ? "emp" : "out";
    const opts = block.querySelectorAll(".m-payout-opt");
    opts.forEach((btn, i) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        pickGrp(grp, i === 0);
      });
    });
  });

  setTimeout(() => {
    pickGrp("out", false);
    runTypeEffects(rt, "#payoutDays", 120);
    setTimeout(() => {
      bindState.days = 30;
      if (errEl) errEl.classList.remove("show");
      refresh();
    }, 900);
  }, 400);
}

export function bindPaymentStep(
  rt: QuickStartRuntime,
  onContinue: () => void
): void {
  const { stage } = rt.dom;

  rt.paySaveHandler = () => {
    const save = stage.querySelector("#paySaveBtn");
    const cont = stage.querySelector("#payContinue");
    if (!save || save.classList.contains("saved")) return;
    save.classList.add("saved");
    save.classList.remove("qsd-hot");
    save.innerHTML =
      svgIc('<path d="M20 6 9 17l-5-5"/>', 12, 12) + " Payment Method Saved";
    stage.querySelectorAll(".qsd-callout-wrap").forEach((el) => el.remove());
    if (cont) {
      cont.classList.remove("locked");
      cont.classList.add("qsd-hot");
      (cont as HTMLElement).style.display = "inline-flex";
      (cont as HTMLElement).style.visibility = "visible";
      (cont as HTMLElement).style.opacity = "1";
    }
    const sc = stage.querySelector(".m-form-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
    const foot = stage.querySelector(".m-wiz-foot");
    if (foot) foot.scrollIntoView({ block: "end", inline: "nearest" });
    setTimeout(() => attachCallout(rt, onContinue), 80);
  };

  const save = stage.querySelector("#paySaveBtn");
  const cont = stage.querySelector("#payContinue");
  if (save) {
    save.addEventListener("click", (e) => {
      e.stopPropagation();
      rt.paySaveHandler?.();
    });
  }
  if (cont) {
    cont.addEventListener("click", (e) => {
      e.stopPropagation();
      if (cont.classList.contains("locked")) return;
      onContinue();
    });
  }
}

export function bindPreviewDrawer(rt: QuickStartRuntime): void {
  const { stage } = rt.dom;
  const btn = stage.querySelector(".m-preview-btn");
  const overlay = stage.querySelector("#mPvOverlay");
  const closeBtn = stage.querySelector("#mPvClose");

  if (btn && overlay) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
    });
  }
  if (closeBtn && overlay) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
      }
    });
  }
}
