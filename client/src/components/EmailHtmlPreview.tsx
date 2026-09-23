import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface EmailHtmlPreviewProps {
  html: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Renders transactional email HTML in an isolated iframe so `<head>` styles
 * (e.g. `.px-pad`) apply correctly. App typography/CSS must not wrap email markup.
 */
export function EmailHtmlPreview({
  html,
  className,
  minHeight = 320,
  maxHeight = 420,
}: EmailHtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resize = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body) return;
      const height = Math.max(
        doc.body.scrollHeight,
        doc.documentElement.scrollHeight
      );
      iframe.style.height = `${height}px`;
    };

    iframe.addEventListener("load", resize);
    resize();

    return () => iframe.removeEventListener("load", resize);
  }, [html]);

  return (
    <div
      className={cn("overflow-y-auto border-b bg-app p-3 sm:p-4", className)}
      style={{ maxHeight }}
    >
      <iframe
        ref={iframeRef}
        title="Email preview"
        srcDoc={html}
        sandbox="allow-same-origin"
        className="mx-auto block w-full max-w-[600px] border-0 bg-transparent"
        style={{ minHeight }}
      />
    </div>
  );
}
