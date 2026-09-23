import {
  attachCallout as attachCalloutBase,
  clearCallout as clearCalloutBase,
} from "../../recruiting-quick-start/runtime/callout";
import type { QuickStartRuntime } from "./context";

export function clearCallout(rt: QuickStartRuntime): void {
  clearCalloutBase(rt);
}

export function attachCallout(
  rt: QuickStartRuntime,
  onAdvance: () => void
): void {
  attachCalloutBase(rt, onAdvance);
}
