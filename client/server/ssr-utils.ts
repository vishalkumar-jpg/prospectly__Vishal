const SSR_FETCH_TIMEOUT_MS = 10_000;

/** AbortSignal that fires after `timeoutMs`. Prefers AbortSignal.timeout when available. */
export function createSsrFetchSignal(timeoutMs = SSR_FETCH_TIMEOUT_MS): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  if (typeof AbortSignal.timeout === "function") {
    return { signal: AbortSignal.timeout(timeoutMs), cleanup: () => undefined };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

export function matchPublicJobPath(url: string): {
  jobId: string;
  ref: string | null;
  pathname: string;
} | null {
  const [pathname, search = ""] = url.split("?");
  const match = pathname.match(/^\/jobs\/([^/]+)\/?$/);
  if (!match) return null;

  const ref = new URLSearchParams(search).get("ref");
  return {
    jobId: match[1],
    ref,
    pathname: search ? `${pathname}?${search}` : pathname,
  };
}

export function matchPublicRequestPath(url: string): {
  requestId: string;
  sharerCode: string;
  pathname: string;
} | null {
  const [pathname] = url.split("?");
  const match = pathname.match(/^\/request\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;

  return {
    requestId: match[1],
    sharerCode: match[2],
    pathname,
  };
}

export function resolveRequestOrigin(req: {
  protocol: string;
  get(name: string): string | undefined;
}): string {
  const forwardedProto = req.get("x-forwarded-proto");
  const protocol = forwardedProto?.split(",")[0]?.trim() || req.protocol;
  const host =
    req.get("x-forwarded-host") ||
    req.get("host") ||
    `localhost:${process.env.PORT || 3000}`;
  return `${protocol}://${host}`;
}

export function assembleSsrHtml(params: {
  template: string;
  appHtml: string;
  headTags?: string;
  dehydratedState?: unknown;
}): string {
  const { template, appHtml, headTags, dehydratedState } = params;
  const stateScript = dehydratedState
    ? `<script>window.__REACT_QUERY_STATE__=${JSON.stringify(dehydratedState).replace(/</g, "\\u003c")}</script>`
    : "";

  let html = template
    .replace("<!--ssr-outlet-->", appHtml)
    .replace("<!--ssr-data-->", stateScript);

  if (headTags) {
    html = html.replace(/<!--ssr-head-->[\s\S]*?<!--ssr-head-end-->/, headTags);
  }

  return html;
}
