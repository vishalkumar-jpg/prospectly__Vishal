import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import {
  isHtml,
  RICH_TEXT_ALLOWED_TAGS,
  RICH_TEXT_CLASS,
} from "@/lib/rich-text";

interface RichTextContentProps {
  value: string | null | undefined;
  className?: string;
}

/**
 * Renders a rich-text value produced by {@link RichTextEditor}. HTML is
 * sanitized (DOMPurify) and rendered; plain-text values fall back to
 * `whitespace-pre-line`. Sanitization here is defense-in-depth — callers that
 * persist content should also sanitize server-side. Generic / reusable.
 */
export function RichTextContent({ value, className }: RichTextContentProps) {
  if (!value) return null;

  if (!isHtml(value)) {
    return (
      <p className={cn("whitespace-pre-line", RICH_TEXT_CLASS, className)}>
        {value}
      </p>
    );
  }

  const clean =
    typeof window === "undefined"
      ? value
      : DOMPurify.sanitize(value, {
          ALLOWED_TAGS: RICH_TEXT_ALLOWED_TAGS,
          ALLOWED_ATTR: [],
        });

  return (
    <div
      className={cn(RICH_TEXT_CLASS, className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
