/** Public share routes that receive dynamic Open Graph metadata. */
export const OG_JOB_PATH =
  /^\/jobs\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

export const OG_REQUEST_PATH = /^\/request\/([^/]+)\/([^/]+)\/?$/;

/** 1.91:1 OG card — full hero scaled to fit (letterboxed), no crop. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const OG_RECRUITING_IMAGE_PATH = "/og/recruiting-share.webp";
export const OG_PROSPECTING_IMAGE_PATH = "/og/prospecting-share.webp";

/** Default preview for homepage, request shares, and all non-job routes. */
export const DEFAULT_OG_IMAGE_PATH = OG_PROSPECTING_IMAGE_PATH;

export const OG_META_CACHE_TTL_MS = 60 * 60 * 1000;

export const OG_DESCRIPTION_MAX_LENGTH = 160;
