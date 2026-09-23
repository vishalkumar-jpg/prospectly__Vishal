import LogRocket from "logrocket";
import { toUTC } from "@/lib/dayjs";

/**
 * LogRocket Configuration
 * Provides session replay, error tracking, and performance monitoring
 */

interface LogRocketConfig {
  appId: string;
  enabled: boolean;
}

class LogRocketService {
  private initialized = false;
  private config: LogRocketConfig;

  constructor() {
    this.config = {
      appId: import.meta.env.VITE_LOGROCKET_APP_ID || "",
      enabled: import.meta.env.VITE_LOGROCKET_ENABLED === "true",
    };
  }

  /**
   * Initialize LogRocket
   * Should be called once at app startup
   */
  init(): void {
    if (this.initialized) {
      return;
    }

    if (!this.config.enabled) {
      return;
    }

    if (!this.config.appId) {
      return;
    }

    try {
      LogRocket.init(this.config.appId, {
        // Console integration - capture console logs
        console: {
          shouldAggregateConsoleErrors: true,
        },
        // Network configuration - capture network requests
        network: {
          requestSanitizer: (request) => {
            // Sanitize sensitive headers
            if (request.headers) {
              const sanitizedHeaders = { ...request.headers };
              delete sanitizedHeaders["Authorization"];
              delete sanitizedHeaders["authorization"];
              request.headers = sanitizedHeaders;
            }

            // Sanitize sensitive request body fields
            if (request.body) {
              try {
                const body = JSON.parse(request.body);
                if (body.password) body.password = "[REDACTED]";
                if (body.token) body.token = "[REDACTED]";
                if (body.apiKey) body.apiKey = "[REDACTED]";
                request.body = JSON.stringify(body);
              } catch {
                // Not JSON, leave as is
              }
            }

            return request;
          },
          responseSanitizer: (response) => {
            // Sanitize sensitive response data
            if (response.body) {
              try {
                const body = JSON.parse(response.body);
                if (body.token) body.token = "[REDACTED]";
                if (body.accessToken) body.accessToken = "[REDACTED]";
                if (body.refreshToken) body.refreshToken = "[REDACTED]";
                if (body.apiKey) body.apiKey = "[REDACTED]";
                response.body = JSON.stringify(body);
              } catch {
                // Not JSON, leave as is
              }
            }
            return response;
          },
        },
        // DOM configuration - selective sanitization for PII only
        dom: {
          inputSanitizer: false,
          textSanitizer: false,
        },
      });

      this.initialized = true;
    } catch {
      // Silently ignored
    }
  }

  /**
   * Identify a user in LogRocket
   * Call this after user authentication
   */
  identify(
    userId: string | number,
    userTraits?: Record<string, string | number | boolean>
  ): void {
    if (!this.initialized || !this.config.enabled) {
      return;
    }

    try {
      LogRocket.identify(String(userId), {
        ...userTraits,
        // Add timestamp for when user was identified
        identifiedAt: toUTC().toISOString(),
      });
    } catch {
      // Silently ignored
    }
  }

  /**
   * Track custom events
   */
  track(
    eventName: string,
    properties?: Record<
      string,
      string | number | boolean | string[] | number[] | boolean[]
    >
  ): void {
    if (!this.initialized || !this.config.enabled) {
      return;
    }
    try {
      LogRocket.track(eventName, properties);
    } catch {
      // Silently ignored
    }
  }

  /**
   * Capture an exception manually
   */
  captureException(
    error: Error,
    extraData?: Record<string, string | number | boolean>
  ): void {
    if (!this.initialized || !this.config.enabled) {
      return;
    }

    try {
      LogRocket.captureException(error, {
        extra: extraData,
      });
    } catch {
      // Silently ignored
    }
  }

  /**
   * Add custom session data
   */
  addSessionData(
    key: string,
    value: string | number | boolean | Record<string, string | number | boolean>
  ): void {
    if (!this.initialized || !this.config.enabled) {
      return;
    }

    try {
      LogRocket.log(key, value);
    } catch {
      // Silently ignored
    }
  }

  /**
   * Get session URL for support/debugging
   */
  getSessionURL(callback: (sessionURL: string) => void): void {
    if (!this.initialized || !this.config.enabled) {
      callback("LogRocket not initialized");
      return;
    }

    try {
      LogRocket.getSessionURL(callback);
    } catch (error) {
      callback("Error getting session URL");
    }
  }

  /**
   * Check if LogRocket is initialized and enabled
   */
  isEnabled(): boolean {
    return this.initialized && this.config.enabled;
  }
}

// Export singleton instance
export const logRocketService = new LogRocketService();

// Export LogRocket for direct access if needed
export { LogRocket };
