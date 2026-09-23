import type { QuickStartContext, Tour } from "../types";

export type QuickStartDom = {
  launcher: HTMLElement;
  panel: HTMLElement;
  list: HTMLElement;
  back: HTMLElement;
  win: HTMLElement;
  stage: HTMLElement;
  tab: HTMLElement;
};

export type QuickStartRuntime = {
  dom: QuickStartDom;
  context: QuickStartContext;
  tour: Tour | null;
  idx: number;
  paySaveHandler: (() => void) | null;
  calloutTimer: ReturnType<typeof setTimeout> | null;
  calloutCleanup: (() => void) | null;
  calloutReposition: (() => void) | null;
  /** Clears timers/bindings for the current step (e.g. assessment demo). */
  screenCleanup: (() => void) | null;
};

export function createRuntime(
  dom: QuickStartDom,
  context: QuickStartContext
): QuickStartRuntime {
  return {
    dom,
    context,
    tour: null,
    idx: 0,
    paySaveHandler: null,
    calloutTimer: null,
    calloutCleanup: null,
    calloutReposition: null,
    screenCleanup: null,
  };
}
