import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";

function abortError(): Error {
  const e = new Error("The operation was aborted");
  e.name = "AbortError";
  return e;
}

function headersToOutgoing(headers: Headers): http.OutgoingHttpHeaders {
  const out: http.OutgoingHttpHeaders = {};
  headers.forEach((value, key) => {
    const k = key.toLowerCase();
    const cur = out[k];
    if (cur === undefined) {
      out[k] = value;
    } else if (Array.isArray(cur)) {
      cur.push(value);
    } else {
      out[k] = [cur as string, value];
    }
  });
  return out;
}

function incomingToHeaders(incoming: http.IncomingMessage): Headers {
  const h = new Headers();
  for (const [key, val] of Object.entries(incoming.headers)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      for (const v of val) {
        if (v) h.append(key, v);
      }
    } else {
      h.set(key, val);
    }
  }
  return h;
}

/**
 * Connects to the validated public `resolvedIp` while using TLS SNI
 * `tlsServerName` (and HTTP Host from headers). IP-pinned `fetch(https://ip/)`
 * sends the wrong SNI and breaks many CDNs; this matches browser behavior.
 */
export function fetchJobPageWithPinnedIp(
  targetUrl: URL,
  resolvedIp: string,
  tlsServerName: string,
  mergedHeaders: Headers,
  signal: AbortSignal,
  method = "GET"
): Promise<Response> {
  const path = `${targetUrl.pathname}${targetUrl.search}`;
  const defaultPort = targetUrl.protocol === "https:" ? 443 : 80;
  const port = targetUrl.port
    ? Number.parseInt(targetUrl.port, 10)
    : defaultPort;
  if (!Number.isFinite(port)) {
    return Promise.reject(new Error("Invalid URL port"));
  }

  const outgoing = headersToOutgoing(mergedHeaders);

  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    let req: http.ClientRequest | undefined;

    const onAbort = () => {
      req?.destroy();
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });

    const detachAbort = () => {
      signal.removeEventListener("abort", onAbort);
    };

    const onIncoming = (incoming: http.IncomingMessage) => {
      detachAbort();
      const status = incoming.statusCode ?? 0;
      const resHeaders = incomingToHeaders(incoming);
      const webStream = Readable.toWeb(incoming);
      resolve(
        new Response(webStream as BodyInit, {
          status,
          statusText: incoming.statusMessage ?? "",
          headers: resHeaders,
        })
      );
    };

    const onRequestError = (err: Error) => {
      detachAbort();
      reject(err);
    };

    if (targetUrl.protocol === "https:") {
      req = https.request(
        {
          hostname: resolvedIp,
          port,
          path,
          method,
          headers: outgoing,
          servername: tlsServerName,
          rejectUnauthorized: true,
        },
        onIncoming
      );
    } else {
      req = http.request(
        {
          hostname: resolvedIp,
          port,
          path,
          method,
          headers: outgoing,
        },
        onIncoming
      );
    }

    req.on("error", onRequestError);
    req.end();
  });
}
