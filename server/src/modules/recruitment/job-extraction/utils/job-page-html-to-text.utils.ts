import sanitizeHtml from "sanitize-html";

type ListFrame = { kind: "ol" | "ul"; counter: number };

/**
 * Converts job page HTML to plain text while preserving line breaks and list
 * structure (markdown-style `- ` and `1. ` prefixes) for extraction models.
 */
export function jobPageHtmlToExtractionPlainText(rawHtml: string): string {
  let s = stripScriptsAndStyles(rawHtml);
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(
    /<\/(?:p|div|section|article|header|footer|blockquote|tr|h[1-6])\s*>/gi,
    "\n"
  );
  s = replaceListTags(s);
  const stripped = sanitizeHtml(s, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return normalizeExtractionPlainText(stripped);
}

function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
}

function replaceListTags(html: string): string {
  const stack: ListFrame[] = [];
  return html.replace(/<\/?(ol|ul|li)\b[^>]*>/gi, (match, tagName: string) => {
    const low = match.toLowerCase();
    const isClose = low.startsWith("</");
    const tag = tagName.toLowerCase();

    if (!isClose && tag === "ol") {
      stack.push({ kind: "ol", counter: 0 });
      return "\n";
    }
    if (isClose && tag === "ol") {
      while (stack.length > 0) {
        const top = stack.pop();
        if (top?.kind === "ol") break;
      }
      return "\n";
    }
    if (!isClose && tag === "ul") {
      stack.push({ kind: "ul", counter: 0 });
      return "\n";
    }
    if (isClose && tag === "ul") {
      while (stack.length > 0) {
        const top = stack.pop();
        if (top?.kind === "ul") break;
      }
      return "\n";
    }
    if (!isClose && tag === "li") {
      const frame = stack[stack.length - 1];
      if (frame?.kind === "ol") {
        frame.counter += 1;
        return `\n${frame.counter}. `;
      }
      return "\n- ";
    }
    if (isClose && tag === "li") {
      return "\n";
    }
    return "";
  });
}

function normalizeExtractionPlainText(text: string): string {
  const lines = text
    .split(/\n/)
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim());
  const parts: string[] = [];
  let consecutiveBlanks = 0;
  for (const line of lines) {
    if (line === "") {
      consecutiveBlanks += 1;
      if (consecutiveBlanks <= 2) {
        parts.push("");
      }
    } else {
      consecutiveBlanks = 0;
      parts.push(line);
    }
  }
  let out = parts.join("\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

/** Single-line collapse for min-length checks (same idea as legacy pipeline). */
export function collapseWhitespaceForLengthCheck(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
