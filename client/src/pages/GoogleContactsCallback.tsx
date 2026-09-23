import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { getFriendlyOAuthErrorMessage } from "@/lib/oauth-user-error";
import { toUTC } from "@/lib/dayjs";
import { queryClient } from "@/lib/queryClient";
import { ALL_IMPORT_ACCOUNTS_QUERY_KEYS } from "@/lib/contact-import-query-keys";

const GOOGLE_CONTACTS_MESSAGE_TYPE = "google-contacts-connected" as const;
const GOOGLE_OAUTH_CHANNEL = "google-oauth";
const GOOGLE_OAUTH_STORAGE_KEY = "google-oauth-result";

type NavigateFunction = ReturnType<typeof useNavigate>;

type GoogleContactsOAuthPayload = {
  type: typeof GOOGLE_CONTACTS_MESSAGE_TYPE;
  error?: string;
  message?: string | null;
  success?: boolean;
  warning?: string | null;
  alreadyConnected?: boolean;
};

type MessageSentState = { sent: boolean };

type PopupContext = {
  hasWindowOpener: boolean;
  isPopup: boolean;
};

function resolveGooglePopupContext({
  popupParam,
}: {
  popupParam: string | null;
}): PopupContext {
  const hasWindowOpener = Boolean(window.opener && !window.opener.closed);
  return {
    hasWindowOpener,
    isPopup: hasWindowOpener || popupParam === "1",
  };
}

function parseAlreadyConnectedParam(
  alreadyConnectedParam: string | null
): boolean {
  return alreadyConnectedParam === "1" || alreadyConnectedParam === "true";
}

function buildGoogleSuccessRedirectUrl(
  warning: string | null | undefined
): string {
  if (warning) {
    return `/getting-started?google_contacts_connected=true&warning=${encodeURIComponent(warning)}`;
  }
  return "/getting-started?google_contacts_connected=true";
}

function notifyGoogleOAuthClients({
  payload,
  hasWindowOpener,
  messageSent,
}: {
  payload: GoogleContactsOAuthPayload;
  hasWindowOpener: boolean;
  messageSent: MessageSentState;
}): void {
  try {
    localStorage.setItem(
      GOOGLE_OAUTH_STORAGE_KEY,
      JSON.stringify({
        ...payload,
        timestamp: toUTC().getTime(),
      })
    );
  } catch {
    // Silent fail for localStorage
  }

  try {
    const channel = new BroadcastChannel(GOOGLE_OAUTH_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // Silent fail for BroadcastChannel
  }

  if (hasWindowOpener && !messageSent.sent) {
    messageSent.sent = true;
    window.opener.postMessage(payload, window.location.origin);
  }
}

function invalidateImportAccountQueries(): void {
  Promise.all(
    ALL_IMPORT_ACCOUNTS_QUERY_KEYS.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey })
    )
  ).catch(() => {
    // Best-effort cache refresh after OAuth redirect
  });
}

function finishGoogleOAuthFlow({
  isPopup,
  navigate,
  redirectUrl,
  invalidateQueries = false,
}: {
  isPopup: boolean;
  navigate: NavigateFunction;
  redirectUrl: string;
  invalidateQueries?: boolean;
}): void {
  if (isPopup) {
    setTimeout(() => window.close(), 100);
    return;
  }

  if (invalidateQueries) {
    invalidateImportAccountQueries();
  }

  navigate(redirectUrl);
}

function handleGoogleOAuthQueryError({
  error,
  errorMessage,
  hasWindowOpener,
  isPopup,
  navigate,
  messageSent,
}: {
  error: string;
  errorMessage: string | null;
  hasWindowOpener: boolean;
  isPopup: boolean;
  navigate: NavigateFunction;
  messageSent: MessageSentState;
}): void {
  notifyGoogleOAuthClients({
    payload: {
      type: GOOGLE_CONTACTS_MESSAGE_TYPE,
      error,
      message: errorMessage,
    },
    hasWindowOpener,
    messageSent,
  });

  finishGoogleOAuthFlow({
    isPopup,
    navigate,
    redirectUrl: `/getting-started?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorMessage || "")}`,
  });
}

function handleGoogleOAuthQuerySuccess({
  warning,
  warningMessage,
  alreadyConnectedParam,
  hasWindowOpener,
  isPopup,
  navigate,
  messageSent,
}: {
  warning: string | null;
  warningMessage: string | null;
  alreadyConnectedParam: string | null;
  hasWindowOpener: boolean;
  isPopup: boolean;
  navigate: NavigateFunction;
  messageSent: MessageSentState;
}): void {
  const alreadyConnected = parseAlreadyConnectedParam(alreadyConnectedParam);

  notifyGoogleOAuthClients({
    payload: {
      type: GOOGLE_CONTACTS_MESSAGE_TYPE,
      success: true,
      warning,
      alreadyConnected,
      message: warningMessage || undefined,
    },
    hasWindowOpener,
    messageSent,
  });

  finishGoogleOAuthFlow({
    isPopup,
    navigate,
    redirectUrl: buildGoogleSuccessRedirectUrl(warning),
    invalidateQueries: !isPopup,
  });
}

async function processGoogleOAuthCallback({
  code,
  hasWindowOpener,
  isPopup,
  navigate,
  messageSent,
}: {
  code: string;
  hasWindowOpener: boolean;
  isPopup: boolean;
  navigate: NavigateFunction;
  messageSent: MessageSentState;
}): Promise<void> {
  try {
    const data = await apiRequest<{
      success: boolean;
      warning?: string;
      jobId?: string;
      alreadyConnected?: boolean | string;
      message?: string;
    }>("/contacts/google-import/process-callback", {
      method: "POST",
      body: JSON.stringify({ code }),
    });

    const warning = data.warning;
    const alreadyConnected =
      data.alreadyConnected === true || data.alreadyConnected === "true";
    const message = typeof data.message === "string" ? data.message : undefined;
    const resolvedMessage = message ?? warning ?? undefined;

    notifyGoogleOAuthClients({
      payload: {
        type: GOOGLE_CONTACTS_MESSAGE_TYPE,
        success: true,
        warning,
        alreadyConnected,
        message: resolvedMessage,
      },
      hasWindowOpener,
      messageSent,
    });

    finishGoogleOAuthFlow({
      isPopup,
      navigate,
      redirectUrl: buildGoogleSuccessRedirectUrl(warning),
      invalidateQueries: !isPopup,
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error
        ? error.message
        : "Failed to process Google connection";
    const errorMessage = getFriendlyOAuthErrorMessage(rawMessage);

    notifyGoogleOAuthClients({
      payload: {
        type: GOOGLE_CONTACTS_MESSAGE_TYPE,
        error: "processing_failed",
        message: errorMessage,
      },
      hasWindowOpener,
      messageSent,
    });

    finishGoogleOAuthFlow({
      isPopup,
      navigate,
      redirectUrl: `/getting-started?error=${encodeURIComponent("processing_failed")}&message=${encodeURIComponent(errorMessage)}`,
    });
  }
}

export default function GoogleContactsCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const messageSent: MessageSentState = { sent: false };
    const popupParam = searchParams.get("popup");
    const { hasWindowOpener, isPopup } = resolveGooglePopupContext({
      popupParam,
    });

    const error = searchParams.get("error");
    if (error) {
      handleGoogleOAuthQueryError({
        error,
        errorMessage: searchParams.get("message"),
        hasWindowOpener,
        isPopup,
        navigate,
        messageSent,
      });
      return;
    }

    const success = searchParams.get("google_contacts_connected");
    const warning = searchParams.get("warning");
    if (success || warning) {
      handleGoogleOAuthQuerySuccess({
        warning,
        warningMessage: searchParams.get("message"),
        alreadyConnectedParam: searchParams.get("already_connected"),
        hasWindowOpener,
        isPopup,
        navigate,
        messageSent,
      });
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (code && state) {
      processGoogleOAuthCallback({
        code,
        hasWindowOpener,
        isPopup,
        navigate,
        messageSent,
      });
    }
  }, [navigate, searchParams]);

  // Return nothing for all scenarios - popup will close or redirect silently
  return null;
}
