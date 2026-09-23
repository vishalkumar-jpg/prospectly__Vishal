import { Logger, NotFoundException } from "@nestjs/common";
import { GlobalMarketplaceService } from "modules/global-marketplace/global-marketplace.service";
import { RecruitmentJobShareService } from "modules/recruitment/share/share.service";
import type { Request, Response, NextFunction } from "express";
import type { OgMetaCacheEntry, OgPageMeta } from "./og-meta.types";
import { existsSync, readFileSync } from "fs";
import { buildJobOgMeta, buildRequestOgMeta } from "./og-meta-builders";
import {
  OG_JOB_PATH,
  OG_META_CACHE_TTL_MS,
  OG_RECRUITING_IMAGE_PATH,
  OG_PROSPECTING_IMAGE_PATH,
  OG_REQUEST_PATH,
} from "./og-meta.constants";
import { buildOgUrls, injectOgMeta } from "./og-meta.utils";

export type SpaOgMiddlewareDeps = {
  indexPath: string;
  shareService: RecruitmentJobShareService;
  marketplaceService: GlobalMarketplaceService;
};

export function createSpaOgMiddleware(deps: SpaOgMiddlewareDeps) {
  const logger = new Logger("SpaOgMiddleware");
  let baseHtml: string | null = null;
  const metaCache = new Map<string, OgMetaCacheEntry>();

  const loadBaseHtml = () => {
    if (!baseHtml) {
      baseHtml = readFileSync(deps.indexPath, "utf-8");
    }
    return baseHtml;
  };

  const getCachedMeta = (cacheKey: string): OgPageMeta | null => {
    const entry = metaCache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      metaCache.delete(cacheKey);
      return null;
    }
    return entry.meta;
  };

  const setCachedMeta = (cacheKey: string, meta: OgPageMeta) => {
    metaCache.set(cacheKey, {
      meta,
      expiresAt: Date.now() + OG_META_CACHE_TTL_MS,
    });
  };

  const sendHtml = (res: Response, html: string) => {
    res.type("html").send(html);
  };

  const sendDefaultHtml = (res: Response) => {
    sendHtml(res, loadBaseHtml());
  };

  const sendWithMeta = (res: Response, meta: OgPageMeta) => {
    sendHtml(res, injectOgMeta(loadBaseHtml(), meta));
  };

  const resolveJobMeta = async (
    jobId: string,
    pageUrl: string,
    imageUrl: string
  ): Promise<OgPageMeta | null> => {
    const cacheKey = `job:${jobId}`;
    const cached = getCachedMeta(cacheKey);
    if (cached) return { ...cached, url: pageUrl, image: imageUrl };

    const job = await deps.shareService.getPublicJob(jobId, true);
    if (!job) return null;

    const meta = buildJobOgMeta(job, pageUrl, imageUrl);
    setCachedMeta(cacheKey, meta);
    return meta;
  };

  const resolveRequestMeta = async (
    requestId: string,
    sharerCode: string,
    pageUrl: string,
    imageUrl: string
  ): Promise<OgPageMeta | null> => {
    const cacheKey = `request:${requestId}:${sharerCode}`;
    const cached = getCachedMeta(cacheKey);
    if (cached) return { ...cached, url: pageUrl, image: imageUrl };

    const request = await deps.marketplaceService.getPublicRequestDetails(
      requestId,
      sharerCode
    );
    const meta = buildRequestOgMeta(request, pageUrl, imageUrl);
    setCachedMeta(cacheKey, meta);
    return meta;
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!existsSync(deps.indexPath)) {
      return next();
    }

    const { pageUrl, imageUrl } = buildOgUrls(req, OG_RECRUITING_IMAGE_PATH);
    const jobMatch = req.path.match(OG_JOB_PATH);

    if (jobMatch) {
      try {
        const meta = await resolveJobMeta(jobMatch[1], pageUrl, imageUrl);
        if (meta) return sendWithMeta(res, meta);
      } catch (error) {
        logger.warn(`SPA_OG :: JOB :: ERROR :: ${error}`);
      }
      return sendDefaultHtml(res);
    }

    const requestMatch = req.path.match(OG_REQUEST_PATH);
    if (requestMatch) {
      const requestUrls = buildOgUrls(req, OG_PROSPECTING_IMAGE_PATH);
      try {
        const meta = await resolveRequestMeta(
          requestMatch[1],
          requestMatch[2],
          requestUrls.pageUrl,
          requestUrls.imageUrl
        );
        if (meta) return sendWithMeta(res, meta);
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          logger.warn(`SPA_OG :: REQUEST :: ERROR :: ${error}`);
        }
      }
      return sendDefaultHtml(res);
    }

    return sendDefaultHtml(res);
  };
}
