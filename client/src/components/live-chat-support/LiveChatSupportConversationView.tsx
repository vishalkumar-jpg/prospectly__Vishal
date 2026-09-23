import { useRef } from "react";
import TawkMessengerReact from "@tawk.to/tawk-messenger-react";
import { AnyType } from "@/types/common";

const TAWK_PROPERTY_ID = import.meta.env.VITE_TAWK_PROPERTY_ID ?? "";
const TAWK_WIDGET_ID = import.meta.env.VITE_TAWK_WIDGET_ID ?? "";
const TAWK_EMBED_ID = TAWK_PROPERTY_ID ? `tawk_${TAWK_PROPERTY_ID}` : "";

declare global {
  interface Window {
    Tawk_API?: {
      showWidget?: () => void;
      maximize?: () => void;
    };
  }
}

export function LiveChatSupportConversationView({
  useTawkWidget = true,
  onReady,
}: {
  // TODO: Use conversationId to identify the chat, render messages in the UI, and call onSendMessage when the user submits a new message.
  conversationId: string;
  messages: AnyType[];
  onSendMessage: AnyType;
  useTawkWidget?: boolean;
  onReady?: () => void;
}) {
  const tawkRef = useRef<{ showWidget: () => void } | null>(null);

  const handleTawkLoad = () => {
    // Ensure the embed widget is shown and maximized so the chat UI is visible
    try {
      tawkRef.current?.showWidget();
      if (typeof window !== "undefined" && window.Tawk_API?.maximize) {
        window.Tawk_API.maximize();
      }
    } catch {
      // no-op if API not ready
    }
    onReady?.();
  };

  if (!useTawkWidget) return null;

  if (!TAWK_PROPERTY_ID || !TAWK_WIDGET_ID) {
    console.error(
      "LiveChatSupport: VITE_TAWK_PROPERTY_ID and VITE_TAWK_WIDGET_ID must be set in .env"
    );
    return null;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background">
      {/* Embed container must exist in DOM before Tawk script runs; explicit min-height so iframe gets space */}
      <div id={TAWK_EMBED_ID} className="flex-1 w-full min-h-[400px]" />
      <TawkMessengerReact
        ref={tawkRef}
        propertyId={TAWK_PROPERTY_ID}
        widgetId={TAWK_WIDGET_ID}
        embedId={TAWK_EMBED_ID}
        onLoad={handleTawkLoad}
      />
    </div>
  );
}
