import sanitizeHtml from "sanitize-html";

export function sanitizeCustomHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "span",
      "div",
      "br",
      "hr",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["style", "class"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height"],
    },
    allowedStyles: {
      "*": {
        // Allow safe CSS properties
        color: [
          /^#(?:[0-9a-fA-F]{3}){1,2}$/,
          /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/,
          /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)$/,
          /^[a-z]+$/i,
        ],
        "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
        "font-size": [/^\d+(?:px|em|rem|%)$/],
        "font-weight": [/^\d+$/, /^bold$/, /^normal$/],
        "margin-top": [/^\d+(?:px|em|rem|%)$/],
        "margin-bottom": [/^\d+(?:px|em|rem|%)$/],
        "padding-top": [/^\d+(?:px|em|rem|%)$/],
        "padding-bottom": [/^\d+(?:px|em|rem|%)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}
