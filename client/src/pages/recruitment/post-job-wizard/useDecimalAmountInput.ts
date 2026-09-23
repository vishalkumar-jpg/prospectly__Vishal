import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  formatMoneyWithCommas,
  parseFormattedDecimal,
} from "@/lib/formatted-decimal";
import { BLOCKED_KEYS_DECIMAL } from "./constants";

/** Settled display for an amount that is not being typed into. */
function settled(value: number): string {
  return value ? formatMoneyWithCommas(value) : "";
}

/**
 * Draft-string state for a money input that accepts cents.
 *
 * The wizard stores amounts as numbers, so a controlled input bound straight to
 * the number would drop the "." the moment it is typed ("312." -> 312 -> "312").
 * This hook keeps the in-progress string, forwards each accepted keystroke to
 * the owner's change handler, normalises to two decimals on blur, and re-syncs
 * when the amount changes from outside the field (edit-mode hydration, step
 * re-entry, AI extraction).
 */
export function useDecimalAmountInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (raw: string) => void;
}) {
  const [draft, setDraft] = useState(() => settled(value));
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    // Only overwrite the draft when the incoming amount no longer matches what
    // the user is typing — otherwise "312." would be rewritten to "312".
    const parsed = parseFormattedDecimal(draftRef.current);
    const current = parsed ?? 0;
    if (current !== value) {
      setDraft(settled(value));
    }
  }, [value]);

  const handleChange = useCallback(
    (raw: string) => {
      if (raw.trim() !== "" && parseFormattedDecimal(raw) === null) return;
      setDraft(raw);
      onChange(raw);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    setDraft(settled(value));
  }, [value]);

  const blockInvalidKeys = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_KEYS_DECIMAL.includes(e.key)) e.preventDefault();
  }, []);

  return { draft, handleChange, handleBlur, blockInvalidKeys };
}
