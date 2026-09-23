import { appConfig } from "config/app.config";
import type { Request } from "express";
import type { OgPageMeta } from "./og-meta.types";
import {
  DEFAULT_OG_IMAGE_PATH,
  OG_DESCRIPTION_MAX_LENGTH,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
} from "./og-meta.constants";

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(
  value: string,
  maxLength = OG_DESCRIPTION_MAX_LENGTH
): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function isLocalHost(host: string): boolean {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
}

/**
 * Resolve public origin from the incoming request.
 * Cloudflare tunnel sends the public host in `Host` — no .env change needed for local Slack tests.
 */
export function resolveRequestOrigin(
  req: Pick<Request, "headers" | "protocol" | "get">
): string {
  const host = req.get?.("host") ?? "";
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto =
    (typeof forwardedProto === "string"
      ? forwardedProto.split(",")[0]?.trim()
      : null) ||
    req.protocol ||
    "https";

  if (host && !isLocalHost(host)) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  const configured = appConfig.frontendUrl?.replace(/\/$/, "") ?? "";
  if (configured) return configured;
  return host ? `${proto}://${host}`.replace(/\/$/, "") : "";
}

export function resolveOgImageUrl(
  origin: string,
  imagePath = DEFAULT_OG_IMAGE_PATH
): string {
  return `${origin.replace(/\/$/, "")}${imagePath}`;
}

export function buildOgUrls(req: Request, imagePath = DEFAULT_OG_IMAGE_PATH) {
  const origin = resolveRequestOrigin(req);
  return {
    pageUrl: `${origin}${req.originalUrl}`,
    imageUrl: resolveOgImageUrl(origin, imagePath),
  };
}

export function buildPageUrl(req: Request): string {
  return buildOgUrls(req).pageUrl;
}

function replaceTitle(html: string, title: string): string {
  const safe = escapeHtmlAttr(title);
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safe}</title>`);
}

function replaceMeta(
  html: string,
  attr: "name" | "property",
  key: string,
  content: string
): string {
  const safe = escapeHtmlAttr(content);
  const pattern = new RegExp(
    `<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`,
    "i"
  );
  const tag = `<meta ${attr}="${key}" content="${safe}" />`;

  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }

  return html.replace("</head>", `    ${tag}\n  </head>`);
}

/** Inject dynamic OG/Twitter meta into the SPA index.html template. */
export function injectOgMeta(html: string, meta: OgPageMeta): string {
  let output = html;
  output = replaceTitle(output, meta.title);
  output = replaceMeta(output, "name", "description", meta.description);
  output = replaceMeta(output, "property", "og:title", meta.title);
  output = replaceMeta(output, "property", "og:description", meta.description);
  output = replaceMeta(output, "property", "og:type", meta.type);
  output = replaceMeta(output, "property", "og:url", meta.url);
  output = replaceMeta(output, "property", "og:image", meta.image);
  output = replaceMeta(
    output,
    "property",
    "og:image:width",
    String(OG_IMAGE_WIDTH)
  );
  output = replaceMeta(
    output,
    "property",
    "og:image:height",
    String(OG_IMAGE_HEIGHT)
  );
  output = replaceMeta(output, "property", "og:image:alt", meta.title);
  output = replaceMeta(output, "name", "twitter:card", "summary_large_image");
  output = replaceMeta(output, "name", "twitter:title", meta.title);
  output = replaceMeta(output, "name", "twitter:description", meta.description);
  output = replaceMeta(output, "name", "twitter:image", meta.image);
  return output;
}
