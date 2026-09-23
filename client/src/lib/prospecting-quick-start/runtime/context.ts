import type { Tour } from "../types";

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
  tour: Tour | null;
  idx: number;
  paySaveHandler: (() => void) | null;
  calloutTimer: ReturnType<typeof setTimeout> | null;
  calloutCleanup: (() => void) | null;
  calloutReposition: (() => void) | null;
};

export function createRuntime(dom: QuickStartDom): QuickStartRuntime {
  return {
    dom,
    tour: null,
    idx: 0,
    paySaveHandler: null,
    calloutTimer: null,
    calloutCleanup: null,
    calloutReposition: null,
  };
}
