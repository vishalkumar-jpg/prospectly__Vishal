import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchPublicJobForSsr } from "./fetch-public-job";
import { fetchPublicRequestForSsr } from "./fetch-public-request";
import {
  assembleSsrHtml,
  matchPublicJobPath,
  matchPublicRequestPath,
  resolveRequestOrigin,
} from "./ssr-utils";
import type { SsrRenderInput, SsrRenderResult } from "../src/entry-server";

type SsrRenderFn = (input: SsrRenderInput) => Promise<SsrRenderResult>;

type ViteDevServer = {
  middlewares: express.RequestHandler;
  transformIndexHtml: (url: string, html: string) => Promise<string>;
  ssrLoadModule: (id: string) => Promise<{ render: SsrRenderFn }>;
  ssrFixStacktrace: (error: Error) => void;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, "..");
const isProd = process.env.NODE_ENV === "production";

async function createViteDevServer(): Promise<ViteDevServer> {
  const { createServer } = await import("vite");
  return createServer({
    root: clientRoot,
    server: {
      middlewareMode: true,
      // Allow localhost in SSR dev; .env may restrict hosts for tunneling only.
      allowedHosts: true,
    },
    appType: "custom",
  }) as ViteDevServer;
}

async function createApp() {
  const app = express();
  let vite: ViteDevServer | undefined;

  if (!isProd) {
    vite = await createViteDevServer();
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(path.resolve(clientRoot, "dist"), {
        index: false,
      })
    );
  }

  app.use(async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const renderInput = await resolveSsrRenderInput(url);

      if (!renderInput) {
        return sendSpaFallback({ res, vite, url });
      }

      const template = await loadTemplate({ vite, url });
      const render = await loadRender({ vite });
      const origin = resolveRequestOrigin(req);
      const result = await render({ ...renderInput, origin });

      const html = assembleSsrHtml({
        template,
        appHtml: result.appHtml,
        headTags: result.headTags,
        dehydratedState: result.dehydratedState,
      });

      res
        .status(result.statusCode)
        .set({ "Content-Type": "text/html" })
        .end(html);
    } catch (error) {
      if (vite) {
        vite.ssrFixStacktrace(error as Error);
      }
      console.error(
        `SSR :: ${req.method} ${req.originalUrl} :: ERROR ::`,
        error
      );
      next(error);
    }
  });

  return app;
}

async function resolveSsrRenderInput(
  url: string
): Promise<Omit<SsrRenderInput, "origin"> | null> {
  const jobRoute = matchPublicJobPath(url);
  if (jobRoute) {
    const job = await fetchPublicJobForSsr(jobRoute.jobId, jobRoute.ref);
    if (!job) return null;

    return {
      kind: "job",
      url: jobRoute.pathname,
      job,
    };
  }

  const requestRoute = matchPublicRequestPath(url);
  if (requestRoute) {
    const request = await fetchPublicRequestForSsr(
      requestRoute.requestId,
      requestRoute.sharerCode
    );
    if (!request) return null;

    return {
      kind: "request",
      url: requestRoute.pathname,
      requestId: requestRoute.requestId,
      sharerCode: requestRoute.sharerCode,
      requestData: request,
    };
  }

  return null;
}

async function loadTemplate(params: {
  vite?: ViteDevServer;
  url: string;
}): Promise<string> {
  const { vite, url } = params;

  if (vite) {
    const raw = fs.readFileSync(
      path.resolve(clientRoot, "index.html"),
      "utf-8"
    );
    return vite.transformIndexHtml(url, raw);
  }

  return fs.readFileSync(path.resolve(clientRoot, "dist/index.html"), "utf-8");
}

async function loadRender(params: { vite?: ViteDevServer }) {
  if (params.vite) {
    const mod = await params.vite.ssrLoadModule("/src/entry-server.tsx");
    return mod.render;
  }

  const mod = await import(
    path.resolve(clientRoot, "dist/server/entry-server.js")
  );
  return mod.render;
}

async function sendSpaFallback(params: {
  res: express.Response;
  vite?: ViteDevServer;
  url: string;
}) {
  const { res, vite, url } = params;

  if (vite) {
    const template = await loadTemplate({ vite, url });
    return res.status(200).set({ "Content-Type": "text/html" }).end(template);
  }

  return res.sendFile(path.resolve(clientRoot, "dist/index.html"));
}

async function startServer() {
  const host = process.env.HOST || "0.0.0.0";
  const port = Number(process.env.PORT || 5000);

  try {
    const app = await createApp();
    await new Promise<void>((resolve, reject) => {
      const server = app.listen(port, host);

      server.once("listening", () => {
        console.log(`Client SSR server ready at http://localhost:${port}`);
        resolve();
      });

      server.once("error", (error: NodeJS.ErrnoException) => {
        server.close();
        if (error.code === "EADDRINUSE") {
          console.error(
            `Port ${port} is already in use. Stop the other process (lsof -ti :${port} | xargs kill) or set PORT to another value.`
          );
        } else {
          console.error("Failed to start client SSR server:", error);
        }
        reject(error);
      });
    });
  } catch {
    process.exit(1);
  }
}

startServer();
