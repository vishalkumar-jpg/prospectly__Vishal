import { AQ_BANK_Q, AQ_WRITE_Q } from "../builders/wizard-steps/assessment";
import type { QuickStartRuntime } from "./context";
import { appendQuestion, wireAnswerTypeListbox } from "./assessment-demo-dom";
import {
  paintPhase,
  type AqEls,
  type PhaseCtx,
} from "./assessment-demo-phases";

/**
 * page → Add → bank → list (In Bank + edit/delete) →
 * Add → type → Answer type → Save to bank → Add → list → Continue
 *
 * Returns dispose() — call when leaving this screen / closing the tour.
 */
export function bindAssessmentDemo(
  rt: QuickStartRuntime,
  onTourNext: () => void
): () => void {
  const { stage } = rt.dom;
  const backdrop = stage.querySelector("#aqBackdrop");
  const overlay = stage.querySelector("#aqOverlay") as HTMLElement | null;
  const bankDialog = stage.querySelector("#aqBankDialog") as HTMLElement | null;
  const writeDialog = stage.querySelector(
    "#aqWriteDialog"
  ) as HTMLElement | null;

  const els: AqEls = {
    openAdd: stage.querySelector("#aqOpenAddBtn"),
    bankRow: stage.querySelector("#aqBankRow1"),
    bankCk: stage.querySelector("#aqBankCk1"),
    bankSel: stage.querySelector("#aqBankSel"),
    bankAdd: stage.querySelector("#aqBankAddBtn"),
    writeAdd: stage.querySelector("#aqWriteAddBtn"),
    writeArea: stage.querySelector("#aqWriteArea"),
    writeCount: stage.querySelector("#aqWriteCount"),
    answerTypeSelect: stage.querySelector("#aqAnswerTypeSelect"),
    answerTypeMenu: stage.querySelector("#aqAnswerTypeMenu"),
    answerTypeValue: stage.querySelector("#aqAnswerTypeValue"),
    answerTypeHint: stage.querySelector("#aqAnswerTypeHint"),
    answerTypeOptYesNo: stage.querySelector("#aqAnswerTypeOptYesNo"),
    answerTypeOptText: stage.querySelector("#aqAnswerTypeOptText"),
    saveRow: stage.querySelector("#aqSaveToBankRow"),
    saveCk: stage.querySelector("#aqSaveToBankCk"),
    foot: stage.querySelector("#aqFoot"),
    continueBtn: stage.querySelector("#aqContinue"),
  };

  const unwireAnswerType = wireAnswerTypeListbox(els);

  let phase = 0;
  let disposed = false;
  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  let startTimer: ReturnType<typeof setTimeout> | null = null;

  const showOverlay = (mode: "bank" | "write") => {
    backdrop?.classList.add("m-pm-backdrop");
    if (overlay) overlay.hidden = false;
    if (bankDialog) bankDialog.hidden = mode !== "bank";
    if (writeDialog) writeDialog.hidden = mode !== "write";
  };

  const hideOverlay = () => {
    backdrop?.classList.remove("m-pm-backdrop");
    if (overlay) overlay.hidden = true;
  };

  const clearWriteTimer = () => {
    if (writeTimer) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }
  };

  const paint = (): void => {
    if (disposed) return;
    const ctx: PhaseCtx = {
      rt,
      stage,
      els,
      showOverlay,
      hideOverlay,
      go: (next) => {
        if (disposed) return;
        phase = next;
        paint();
      },
      advanceFromBank: () => {
        if (disposed) return;
        hideOverlay();
        appendQuestion(stage, AQ_BANK_Q, true, 1);
        phase = 3;
        paint();
      },
      advanceFromWrite: () => {
        if (disposed) return;
        hideOverlay();
        appendQuestion(stage, AQ_WRITE_Q, false, 2);
        phase = 9;
        paint();
      },
      onTourNext,
      setWriteTimer: (t) => {
        writeTimer = t;
      },
    };
    paintPhase(phase, ctx, clearWriteTimer);
  };

  startTimer = setTimeout(paint, 80);

  return () => {
    disposed = true;
    if (startTimer) {
      clearTimeout(startTimer);
      startTimer = null;
    }
    clearWriteTimer();
    unwireAnswerType();
  };
}
