import type { PublicJobData } from "../src/lib/api/recruitment";
import { getSsrApiBaseUrl } from "./resolve-api-url";

export async function fetchPublicJobForSsr(
  jobId: string,
  ref?: string | null
): Promise<PublicJobData | null> {
  const params = new URLSearchParams();
  if (ref) params.set("ref", ref);
  params.set("includeClosed", "true");
  const qs = params.toString();
  const url = `${getSsrApiBaseUrl()}/recruitment/jobs/public/${encodeURIComponent(jobId)}${qs ? `?${qs}` : ""}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: PublicJobData };
    return payload.data ?? null;
  } catch {
    return null;
  }
}
