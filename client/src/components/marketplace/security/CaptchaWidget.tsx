import { useEffect, useCallback, useRef, useState } from "react";

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string }
      ) => Promise<string>;
    };
  }
}

interface CaptchaWidgetProps {
  siteKey: string;
  action: string;
  onVerify: (token: string) => void;
  onError?: (error: Error) => void;
  onExpire?: () => void;
}

/**
 * Invisible reCAPTCHA v3 widget.
 * Executes in the background and provides a token for server verification.
 */
export function CaptchaWidget({
  siteKey,
  action,
  onVerify,
  onError,
  onExpire,
}: CaptchaWidgetProps) {
  const scriptLoaded = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load reCAPTCHA script if not already loaded
    if (!scriptLoaded.current && !document.getElementById("recaptcha-script")) {
      const script = document.createElement("script");
      script.id = "recaptcha-script";
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        scriptLoaded.current = true;
        window.grecaptcha.ready(() => {
          setIsReady(true);
        });
      };

      script.onerror = () => {
        onError?.(new Error("Failed to load reCAPTCHA script"));
      };

      document.head.appendChild(script);
    } else if (window.grecaptcha) {
      window.grecaptcha.ready(() => {
        setIsReady(true);
      });
    }
  }, [siteKey, onError]);

  // Token expires after 2 minutes, set up refresh
  useEffect(() => {
    if (!isReady) return;

    const refreshInterval = setInterval(() => {
      onExpire?.();
    }, 110000); // Refresh before 2-minute expiry

    return () => clearInterval(refreshInterval);
  }, [isReady, onExpire]);

  return null; // Invisible widget
}

/**
 * Hook to execute reCAPTCHA verification.
 */
export function useCaptcha(siteKey: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (action: string): Promise<string | null> => {
      if (!window.grecaptcha) {
        setError(new Error("reCAPTCHA not loaded"));
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = await window.grecaptcha.execute(siteKey, { action });
        setIsLoading(false);
        return token;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("reCAPTCHA execution failed");
        setError(error);
        setIsLoading(false);
        return null;
      }
    },
    [siteKey]
  );

  return { execute, isLoading, error };
}

/**
 * Constant for reCAPTCHA actions used in the marketplace.
 */
export const CAPTCHA_ACTIONS = {
  CLAIM_START: "claim_start",
  CLAIM_VERIFY: "claim_verify",
  SHARE_CREATE: "share_create",
  TRACK_EVENT: "track_event",
} as const;
