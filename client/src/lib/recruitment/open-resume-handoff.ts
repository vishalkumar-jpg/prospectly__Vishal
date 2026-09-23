import { isHttpOrHttpsUrl } from "@/lib/url-utils";

export type ResumeHandoffSource = "connector-candidate" | "pool-match";

const RESUME_HANDOFF_FEATURES = "noopener,noreferrer";

/** Opens a cached presigned resume URL in a new tab (must run synchronously on click). */
export function openResumeUrl(url: string): void {
  if (!isHttpOrHttpsUrl(url)) return;
  window.open(url, "_blank", RESUME_HANDOFF_FEATURES);
}

/**
 * Opens a same-origin handoff page synchronously so the child tab can fetch the
 * presigned URL without losing the user-gesture / popup allowance.
 */
export function openResumeHandoff(params: {
  source: ResumeHandoffSource;
  id: string;
}): void {
  const search = new URLSearchParams({
    source: params.source,
    id: params.id,
  });
  window.open(
    `/resume-handoff.html?${search.toString()}`,
    "_blank",
    RESUME_HANDOFF_FEATURES
  );
}
