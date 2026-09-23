/**
 * Generic helpers for rich-text fields rendered by {@link RichTextEditor} /
 * {@link RichTextContent}. Content is stored as sanitized HTML but stays
 * backward compatible with legacy plain-text values and with pipelines that
 * emit plain text with `\n` + `•` bullets (e.g. AI generation / extraction).
 */

/** Shared styling for rendered rich text (lists, paragraphs, emphasis). */
export const RICH_TEXT_CLASS =
  "text-[15px] leading-relaxed text-foreground/90 marker:text-brand-amethyst " +
  "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 " +
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 " +
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 " +
  "[&_li]:my-1 [&_strong]:font-semibold [&_b]:font-semibold";

/** Tags the editor may produce and the renderer may keep (basic toolbar). */
export const RICH_TEXT_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
];

/** Heuristic: does this value already contain HTML markup? */
export function isHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Visible-text length (tags stripped). Used for char limits / required checks. */
export function richTextLength(value: string | null | undefined): number {
  if (!value) return 0;
  if (!isHtml(value)) return value.trim().length;
  if (typeof DOMParser === "undefined") {
    return value.replace(/<[^>]*>/g, "").trim().length;
  }
  const text =
    new DOMParser().parseFromString(value, "text/html").body.textContent ?? "";
  return text.trim().length;
}

/** Convert HTML to plain text for truncated previews (card line-clamps). */
export function htmlToPlainText(value: string | null | undefined): string {
  if (!value) return "";
  if (!isHtml(value)) return value;
  if (typeof DOMParser === "undefined") {
    return value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return (
    new DOMParser().parseFromString(value, "text/html").body.textContent ?? ""
  ).trim();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Convert plain text (with `\n` and `•`/`-`/`*` bullets or `1.` numbering)
 * into basic HTML so AI / extraction / legacy content seeds the editor as
 * real paragraphs and lists.
 */
export function plainTextToHtml(value: string | null | undefined): string {
  if (!value) return "";
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    const bullet = /^[•\-*]\s+(.*)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet) {
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${escapeHtml(bullet[1])}</li>`);
    } else if (ordered) {
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${escapeHtml(ordered[1])}</li>`);
    } else {
      closeList();
      out.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  closeList();
  return out.join("");
}

/** Normalize a stored value to HTML for the editor (converts legacy plain text). */
export function toEditorHtml(value: string | null | undefined): string {
  if (!value) return "";
  return isHtml(value) ? value : plainTextToHtml(value);
}
