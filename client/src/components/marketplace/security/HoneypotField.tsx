import { useEffect, useRef } from "react";

interface HoneypotFieldProps {
  name?: string;
  onBotDetected?: () => void;
}

/**
 * Honeypot field for bot detection.
 * This field is invisible to users but visible to bots.
 * If filled, it indicates a bot submission.
 *
 * Uses CSS positioning (not display:none) to avoid detection by smart bots.
 */
export function HoneypotField({
  name = "website_url",
  onBotDetected,
}: HoneypotFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if field was auto-filled (indicates bot)
    const checkInterval = setInterval(() => {
      if (inputRef.current && inputRef.current.value) {
        onBotDetected?.();
        clearInterval(checkInterval);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [onBotDetected]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        top: "-9999px",
        height: 0,
        width: 0,
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      <label htmlFor={name}>
        Leave this field empty
        <input
          ref={inputRef}
          type="text"
          name={name}
          id={name}
          tabIndex={-1}
          autoComplete="off"
          placeholder="Do not fill this"
        />
      </label>
    </div>
  );
}

/**
 * Validates honeypot field value.
 * Returns true if the field is empty (valid human submission).
 */
export function validateHoneypot(
  formData: FormData,
  fieldName = "website_url"
): boolean {
  const value = formData.get(fieldName);
  return !value || value === "";
}
