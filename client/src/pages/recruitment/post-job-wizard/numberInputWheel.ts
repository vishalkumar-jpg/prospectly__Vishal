import type { WheelEvent } from "react";

/**
 * Prevents mouse wheel from changing a focused `type="number"` value.
 * Blurs so the page can scroll normally (same pattern as introduction flows).
 */
export function handleNumberInputWheel(
  e: WheelEvent<HTMLInputElement>
): void {
  e.currentTarget.blur();
}
