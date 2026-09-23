import { redactPath, redactReferrer, redactSearch } from "./redact";

/**
 * Google Analytics 4
 *
 * Production only: initialization is gated on VITE_GA_MEASUREMENT_ID, which is
 * deliberately unset for local development and the dev server so their traffic
 * never reaches the production property. The gate also covers the Capacitor
 * mobile shell, which ships the same bundle.
 *
 * Anonymous by design — no user id and no user properties are ever sent.
 * Every page_view is dispatched explicitly with a redacted URL; see ./redact.
 */

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

/** The subset of react-router's location this service needs. */
export interface TrackableLocation {
  pathname: string;
  search: string;
}

const GTAG_SRC = "https://www.googletagmanager.com/gtag/js?id=";
const MEASUREMENT_ID_PREFIX = "G-";
const IDLE_TIMEOUT_MS = 3000;
const IDLE_FALLBACK_MS = 1000;

/**
 * Google's own snippet, kept verbatim: gtag.js expects each dataLayer entry to
 * be an `arguments` object, not an array.
 */
function createGtag(): GtagFn {
  return function gtag() {
    // `arguments` is required here: gtag.js does not reliably process plain
    // arrays pushed onto dataLayer. Do not convert to rest parameters.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  } as GtagFn;
}

class GtagService {
  private initialized = false;
  private previousLocation = "";
  private readonly measurementId: string;

  constructor() {
    this.measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || "";
  }

  /**
   * Enabled only when a real measurement id is configured. The prefix check
   * also rejects blank strings and placeholder values.
   */
  private get enabled(): boolean {
    return this.measurementId.startsWith(MEASUREMENT_ID_PREFIX);
  }

  /**
   * Initialize GA. Safe to call more than once.
   * Commands are queued immediately, so deferring the script loses no data.
   */
  init(): void {
    if (this.initialized || !this.enabled) {
      return;
    }

    try {
      window.dataLayer = window.dataLayer || [];
      const gtag = createGtag();
      window.gtag = gtag;

      // Required by gtag.js. Not stored and not an API payload, so the
      // repo-wide UTC rule does not apply here.
      gtag("js", new Date());

      // send_page_view is disabled so gtag.js never transmits an un-redacted
      // page_location on load. Every page_view comes from trackPageview().
      gtag("config", this.measurementId, { send_page_view: false });

      this.initialized = true;
      this.loadScriptWhenIdle();
    } catch {
      // Silently ignored
    }
  }

  /**
   * Send a page_view for the current route with a redacted URL and referrer.
   */
  trackPageview(location: TrackableLocation): void {
    const path = redactPath(location.pathname);
    const query = redactSearch(location.search);
    const pagePath = `${path}${query}`;

    if (import.meta.env.DEV) {
      // Lets the redaction rules be verified locally even though GA itself
      // stays disabled outside production.
      // eslint-disable-next-line no-console
      console.debug("[gtag] page_view", { pagePath, sent: this.initialized });
    }

    if (!this.initialized) {
      return;
    }

    try {
      const origin = window.location.origin;
      const pageLocation = `${origin}${pagePath}`;
      const referrer =
        this.previousLocation || redactReferrer(document.referrer, origin);

      window.gtag?.("event", "page_view", {
        page_location: pageLocation,
        page_path: pagePath,
        page_title: document.title,
        ...(referrer ? { page_referrer: referrer } : {}),
      });

      this.previousLocation = pageLocation;
    } catch {
      // Silently ignored
    }
  }

  /** True once GA has been initialized. */
  isEnabled(): boolean {
    return this.initialized;
  }

  private loadScriptWhenIdle(): void {
    const inject = () => {
      try {
        if (document.querySelector(`script[src^="${GTAG_SRC}"]`)) {
          return;
        }
        const script = document.createElement("script");
        script.async = true;
        script.src = `${GTAG_SRC}${encodeURIComponent(this.measurementId)}`;
        document.head.appendChild(script);
      } catch {
        // Silently ignored
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(inject, { timeout: IDLE_TIMEOUT_MS });
    } else {
      window.setTimeout(inject, IDLE_FALLBACK_MS);
    }
  }
}

export const gtagService = new GtagService();
