/** Vite-resolved bundled logo (works in dev + production builds). */
export const PROSPECTLY_LOGO_BUNDLED = new URL(
  "../../assets/prospectly-logo.png",
  import.meta.url
).href;

/** Same path as AppSidebar — served from `client/public/prospectly-logo.png`. */
export const PROSPECTLY_LOGO_PUBLIC = `${
  import.meta.env.BASE_URL || "/"
}prospectly-logo.png`;

export const PROSPECTLY_LOGO_URLS = [
  PROSPECTLY_LOGO_BUNDLED,
  PROSPECTLY_LOGO_PUBLIC,
] as const;
