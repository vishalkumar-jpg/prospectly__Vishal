import { IC } from "../icons";
import type { QuickStartRuntime } from "./context";
import { attachCallout, clearCallout } from "./callout";

export function setGuide(t: string, d: string): void {
  const titleEl = document.getElementById("qsdT");
  const descEl = document.getElementById("qsdD");
  if (titleEl) titleEl.innerHTML = t;
  if (descEl) descEl.innerHTML = d;
}

export function setCount(stage: Element, n: number): void {
  const el = stage.querySelector("#aqCount");
  if (el) el.textContent = n + " question" + (n === 1 ? "" : "s");
}

/** Real AssessmentStep row: grip, #, text, In Bank?, edit, delete. */
export function appendQuestion(
  stage: Element,
  text: string,
  inBank: boolean,
  index: number
): void {
  stage.querySelector("#aqEmpty")?.remove();
  const list = stage.querySelector("#aqQuestionList");
  if (!list) return;
  const row = document.createElement("div");
  row.className = "m-card m-aq-added";
  row.style.cssText = "margin-top:6px;padding:8px 10px";
  row.innerHTML =
    '<div class="m-row m-aq-qitem">' +
    '<span class="m-aq-grip" aria-hidden="true">' +
    IC.grip +
    "</span>" +
    '<span class="m-aq-num">' +
    index +
    "</span>" +
    '<span class="m-aq-qtext">' +
    text +
    "</span>" +
    (inBank ? '<span class="m-aq-inbank">In Bank</span>' : "") +
    '<span class="m-aq-icon" title="Edit">' +
    IC.pencil +
    "</span>" +
    '<span class="m-aq-icon" title="Delete">' +
    IC.trash +
    "</span></div>";
  list.appendChild(row);
  setCount(stage, index);
}

function isNativeHotTarget(node: HTMLElement): boolean {
  const tag = node.tagName;
  return (
    tag === "BUTTON" ||
    tag === "A" ||
    tag === "INPUT" ||
    tag === "SELECT" ||
    tag === "TEXTAREA"
  );
}

function asHTMLElement(el: Element | null): HTMLElement | null {
  return el instanceof HTMLElement ? el : null;
}

function setElementHidden(el: Element | null, hidden: boolean): void {
  if (!el) return;
  if (hidden) el.setAttribute("hidden", "");
  else el.removeAttribute("hidden");
}

function isElementHidden(el: Element | null): boolean {
  if (!el) return true;
  return el.hasAttribute("hidden");
}

export function clearHot(stage: Element): void {
  stage.querySelectorAll(".qsd-hot").forEach((el) => {
    el.classList.remove("qsd-hot");
    el.removeAttribute("data-callout");
    const node = el as HTMLElement;
    node.onclick = null;
    node.onkeydown = null;
    if (node.dataset.qsdHotTabindex === "1") {
      node.removeAttribute("tabindex");
      delete node.dataset.qsdHotTabindex;
    }
    if (node.dataset.qsdHotRole === "1") {
      node.removeAttribute("role");
      delete node.dataset.qsdHotRole;
    }
  });
}

export function hot(
  el: Element | null,
  callout: string,
  onClick: () => void,
  side = "left"
): void {
  if (!el) return;
  const node = el as HTMLElement;
  el.classList.add("qsd-hot");
  el.setAttribute("data-callout", callout);
  el.setAttribute("data-co-side", side);
  const activate = (e: Event) => {
    e.stopPropagation();
    if (e instanceof KeyboardEvent && e.key === " ") e.preventDefault();
    onClick();
  };
  node.onclick = activate;

  if (isNativeHotTarget(node)) return;

  node.tabIndex = 0;
  node.dataset.qsdHotTabindex = "1";
  if (!node.hasAttribute("role")) {
    node.setAttribute("role", "button");
    node.dataset.qsdHotRole = "1";
  }
  node.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") activate(e);
  };
}

export function bindHot(
  rt: QuickStartRuntime,
  el: Element | null,
  callout: string,
  onClick: () => void,
  side = "left"
): void {
  hot(el, callout, onClick, side);
  attachCallout(rt, onClick);
}

export function resetBankSelection(els: {
  bankRow: Element | null;
  bankCk: Element | null;
  bankSel: Element | null;
  bankAdd: Element | null;
}): void {
  els.bankRow?.classList.remove("on");
  if (els.bankCk) {
    els.bankCk.classList.remove("on");
    els.bankCk.textContent = "";
  }
  if (els.bankSel) els.bankSel.textContent = "0 selected";
  els.bankAdd?.classList.add("locked");
  els.bankAdd?.classList.remove("qsd-hot");
}

export function markBankSelected(els: {
  bankRow: Element | null;
  bankCk: Element | null;
  bankSel: Element | null;
  bankAdd: Element | null;
}): void {
  els.bankRow?.classList.add("on");
  if (els.bankCk) {
    els.bankCk.classList.add("on");
    els.bankCk.textContent = "✓";
  }
  if (els.bankSel) els.bankSel.textContent = "1 selected";
  els.bankAdd?.classList.remove("locked");
}

export function markSaveToBank(els: {
  saveRow: Element | null;
  saveCk: Element | null;
}): void {
  els.saveRow?.classList.add("on");
  if (els.saveCk) {
    els.saveCk.classList.add("on");
    els.saveCk.textContent = "✓";
  }
}

export function clearSaveToBank(els: {
  saveRow: Element | null;
  saveCk: Element | null;
}): void {
  els.saveRow?.classList.remove("on");
  if (els.saveCk) {
    els.saveCk.classList.remove("on");
    els.saveCk.textContent = "";
  }
}

export function resetAnswerType(els: {
  answerTypeSelect: Element | null;
  answerTypeMenu: Element | null;
  answerTypeValue: Element | null;
  answerTypeHint: Element | null;
  answerTypeOptYesNo: Element | null;
  answerTypeOptText: Element | null;
}): void {
  els.answerTypeSelect?.classList.remove("filled", "open");
  els.answerTypeSelect?.setAttribute("aria-expanded", "false");
  closeAnswerTypeMenu(els);
  if (els.answerTypeValue) {
    els.answerTypeValue.textContent = "Select an answer type";
    els.answerTypeValue.classList.remove("filled");
  }
  if (els.answerTypeHint) setElementHidden(els.answerTypeHint, true);
  els.answerTypeOptYesNo?.classList.remove("on");
  els.answerTypeOptYesNo?.setAttribute("aria-selected", "false");
  els.answerTypeOptText?.classList.remove("on");
  els.answerTypeOptText?.setAttribute("aria-selected", "false");
}

export function openAnswerTypeMenu(els: {
  answerTypeSelect: Element | null;
  answerTypeMenu: Element | null;
  answerTypeOptYesNo?: Element | null;
}): void {
  els.answerTypeSelect?.classList.add("open");
  els.answerTypeSelect?.setAttribute("aria-expanded", "true");
  setElementHidden(els.answerTypeMenu, false);
  asHTMLElement(els.answerTypeOptYesNo)?.focus();
}

export function closeAnswerTypeMenu(els: {
  answerTypeSelect: Element | null;
  answerTypeMenu: Element | null;
}): void {
  els.answerTypeSelect?.classList.remove("open");
  els.answerTypeSelect?.setAttribute("aria-expanded", "false");
  setElementHidden(els.answerTypeMenu, true);
}

export function markAnswerTypeSelected(
  els: {
    answerTypeSelect: Element | null;
    answerTypeMenu: Element | null;
    answerTypeValue: Element | null;
    answerTypeHint: Element | null;
    answerTypeOptYesNo: Element | null;
    answerTypeOptText: Element | null;
  },
  choice: "yes_no" | "text"
): void {
  const label = choice === "text" ? "Text answer" : "Yes / No";
  const hint =
    choice === "text"
      ? "Candidates will type their answer in a text box."
      : "Candidates answer with Yes or No.";

  closeAnswerTypeMenu(els);
  els.answerTypeSelect?.classList.add("filled");
  if (els.answerTypeValue) {
    els.answerTypeValue.textContent = label;
    els.answerTypeValue.classList.add("filled");
  }
  if (els.answerTypeHint) {
    setElementHidden(els.answerTypeHint, false);
    els.answerTypeHint.textContent = hint;
  }
  const yesSelected = choice === "yes_no";
  els.answerTypeOptYesNo?.classList.toggle("on", yesSelected);
  els.answerTypeOptYesNo?.setAttribute(
    "aria-selected",
    yesSelected ? "true" : "false"
  );
  els.answerTypeOptText?.classList.toggle("on", !yesSelected);
  els.answerTypeOptText?.setAttribute(
    "aria-selected",
    yesSelected ? "false" : "true"
  );
}

/** Keyboard listbox navigation for the answer-type combobox (walkthrough demo). */
export function wireAnswerTypeListbox(els: {
  answerTypeSelect: Element | null;
  answerTypeMenu: Element | null;
  answerTypeOptYesNo: Element | null;
  answerTypeOptText: Element | null;
}): () => void {
  const trigger = asHTMLElement(
    els.answerTypeSelect
  ) as HTMLButtonElement | null;
  const options = [els.answerTypeOptYesNo, els.answerTypeOptText]
    .map((el) => asHTMLElement(el))
    .filter(Boolean) as HTMLButtonElement[];

  const onTriggerKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" && isElementHidden(els.answerTypeMenu)) {
      e.preventDefault();
      openAnswerTypeMenu({
        answerTypeSelect: els.answerTypeSelect,
        answerTypeMenu: els.answerTypeMenu,
        answerTypeOptYesNo: els.answerTypeOptYesNo,
      });
    }
    if (e.key === "Escape" && !isElementHidden(els.answerTypeMenu)) {
      e.preventDefault();
      closeAnswerTypeMenu(els);
      trigger?.focus();
    }
  };

  const onOptionKey = (e: KeyboardEvent) => {
    const idx = options.indexOf(e.currentTarget as HTMLButtonElement);
    if (idx < 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      options[(idx + 1) % options.length]?.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      options[(idx - 1 + options.length) % options.length]?.focus();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeAnswerTypeMenu(els);
      trigger?.focus();
    }
  };

  trigger?.addEventListener("keydown", onTriggerKey);
  options.forEach((opt) => opt.addEventListener("keydown", onOptionKey));

  return () => {
    trigger?.removeEventListener("keydown", onTriggerKey);
    options.forEach((opt) => opt.removeEventListener("keydown", onOptionKey));
  };
}

export { clearCallout };
