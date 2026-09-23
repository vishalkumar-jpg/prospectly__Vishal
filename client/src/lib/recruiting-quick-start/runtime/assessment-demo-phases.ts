import { AQ_WRITE_Q } from "../builders/wizard-steps/assessment";
import {
  runTypeEffects,
  TYPE_EFFECT_CHAR_MS,
  TYPE_EFFECT_SETTLE_MS,
} from "./effects";
import type { QuickStartRuntime } from "./context";
import {
  bindHot,
  clearHot,
  clearSaveToBank,
  closeAnswerTypeMenu,
  markBankSelected,
  markAnswerTypeSelected,
  markSaveToBank,
  openAnswerTypeMenu,
  resetAnswerType,
  resetBankSelection,
  setGuide,
  clearCallout,
} from "./assessment-demo-dom";

/** Matches the delay passed to runTypeEffects for the write-new phase. */
const AQ_TYPE_DELAY_MS = 200;

export type AqEls = {
  openAdd: Element | null;
  bankRow: Element | null;
  bankCk: Element | null;
  bankSel: Element | null;
  bankAdd: Element | null;
  writeAdd: Element | null;
  writeArea: Element | null;
  writeCount: Element | null;
  answerTypeSelect: Element | null;
  answerTypeMenu: Element | null;
  answerTypeValue: Element | null;
  answerTypeHint: Element | null;
  answerTypeOptYesNo: Element | null;
  answerTypeOptText: Element | null;
  saveRow: Element | null;
  saveCk: Element | null;
  foot: HTMLElement | null;
  continueBtn: Element | null;
};

type Overlay = "bank" | "write" | null;

export type PhaseCtx = {
  rt: QuickStartRuntime;
  stage: Element;
  els: AqEls;
  showOverlay: (mode: "bank" | "write") => void;
  hideOverlay: () => void;
  go: (phase: number) => void;
  advanceFromBank: () => void;
  advanceFromWrite: () => void;
  onTourNext: () => void;
  setWriteTimer: (t: ReturnType<typeof setTimeout> | null) => void;
};

type PhaseDef = {
  guide: [string, string];
  overlay: Overlay;
  run: (ctx: PhaseCtx) => void;
};

export const AQ_PHASES: PhaseDef[] = [
  {
    guide: [
      "Add assessment questions (optional)",
      "Turn on assessment, then click <b>Add Question</b> to open the popup — same flow as the real job wizard.",
    ],
    overlay: null,
    run: ({ rt, els, go }) =>
      bindHot(rt, els.openAdd, "Click Add Question", () => go(1)),
  },
  {
    guide: [
      "Pick from Question Bank",
      "Click the highlighted bank question to select it.",
    ],
    overlay: "bank",
    run: ({ rt, els, go }) => {
      resetBankSelection(els);
      bindHot(rt, els.bankRow, "Select this question", () => go(2), "top");
    },
  },
  {
    guide: [
      "Add the bank question",
      "Tap <b>Add 1 Question</b> — it appears with <b>In Bank</b>, edit, and delete.",
    ],
    overlay: "bank",
    run: ({ rt, els, advanceFromBank }) => {
      markBankSelected(els);
      bindHot(rt, els.bankAdd, "Add 1 Question", advanceFromBank, "top");
    },
  },
  {
    guide: [
      "Bank question is on the page",
      "Same as the real wizard: <b>In Bank</b> + edit &amp; delete. Click <b>Add Question</b> to write a fresh one.",
    ],
    overlay: null,
    run: ({ rt, els, go }) =>
      bindHot(rt, els.openAdd, "Add another question", () => go(4)),
  },
  {
    guide: [
      "Write a fresh question",
      "The question is entered under <b>Write New</b>. Next, choose <b>Answer type</b> *.",
    ],
    overlay: "write",
    run: ({ els, go, setWriteTimer, rt }) => {
      clearSaveToBank(els);
      resetAnswerType(els);
      if (els.writeArea) {
        els.writeArea.textContent = "";
        els.writeArea.classList.add("qsd-type");
      }
      if (els.writeCount) els.writeCount.textContent = "0 / 500";
      els.writeAdd?.classList.add("locked");
      runTypeEffects(rt, "#aqWriteArea", AQ_TYPE_DELAY_MS);
      setWriteTimer(
        setTimeout(
          () => {
            setWriteTimer(null);
            if (els.writeCount) {
              els.writeCount.textContent = AQ_WRITE_Q.length + " / 500";
            }
            go(5);
          },
          AQ_TYPE_DELAY_MS +
            AQ_WRITE_Q.length * TYPE_EFFECT_CHAR_MS +
            TYPE_EFFECT_SETTLE_MS
        )
      );
    },
  },
  {
    guide: [
      "Open Answer type *",
      "Tap the arrow to open the list — you will see <b>Yes / No</b> and <b>Text answer</b>.",
    ],
    overlay: "write",
    run: ({ rt, els, go }) => {
      els.writeAdd?.classList.add("locked");
      closeAnswerTypeMenu(els);
      bindHot(
        rt,
        els.answerTypeSelect,
        "Open answer type",
        () => {
          openAnswerTypeMenu(els);
          go(6);
        },
        "top"
      );
    },
  },
  {
    guide: [
      "Pick Yes / No",
      "Choose <b>Yes / No</b> from the open list — same as the real Add Question popup.",
    ],
    overlay: "write",
    run: ({ rt, els, go }) => {
      els.writeAdd?.classList.add("locked");
      openAnswerTypeMenu(els);
      bindHot(
        rt,
        els.answerTypeOptYesNo,
        "Pick Yes / No",
        () => {
          markAnswerTypeSelected(els, "yes_no");
          go(7);
        },
        "top"
      );
    },
  },
  {
    guide: [
      "Save to bank for reuse",
      "Click the arrow target to tick <b>Save to bank for reuse in future job posts</b>.",
    ],
    overlay: "write",
    run: ({ rt, els, go }) => {
      els.writeAdd?.classList.add("locked");
      bindHot(rt, els.saveRow, "Tick Save to bank", () => go(8), "top");
    },
  },
  {
    guide: [
      "Add the fresh question",
      "Answer type is set and Save to bank is on. Tap <b>Add Question</b> — it joins the list with edit &amp; delete.",
    ],
    overlay: "write",
    run: ({ rt, els, advanceFromWrite }) => {
      markSaveToBank(els);
      els.writeAdd?.classList.remove("locked");
      bindHot(rt, els.writeAdd, "Add Question", advanceFromWrite, "top");
    },
  },
  {
    guide: [
      "Both questions are ready",
      "Only the bank pick shows <b>In Bank</b>; the fresh question has edit &amp; delete only. Tap <b>Continue</b>.",
    ],
    overlay: null,
    run: ({ rt, els, onTourNext }) => {
      if (els.foot) els.foot.hidden = false;
      bindHot(rt, els.continueBtn, "Click Continue", onTourNext);
    },
  },
];

export function paintPhase(
  phase: number,
  ctx: PhaseCtx,
  clearWriteTimer: () => void
): void {
  clearWriteTimer();
  clearCallout(ctx.rt);
  clearHot(ctx.stage);

  const def = AQ_PHASES[phase];
  if (!def) return;

  setGuide(def.guide[0], def.guide[1]);
  if (def.overlay) ctx.showOverlay(def.overlay);
  else ctx.hideOverlay();
  def.run(ctx);
}
