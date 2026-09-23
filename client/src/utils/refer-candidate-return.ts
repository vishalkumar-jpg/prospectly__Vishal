import type { MarketplaceJob } from "@/types/marketplace";

export type ReferCandidateJobPayload = {
  id: string;
  title: string;
  companyName: string;
};

export type ReferCandidateOrigin = "card" | "drawer";

export type ReferCandidateReturnContext = {
  returnPath: string;
  job: ReferCandidateJobPayload;
  origin: ReferCandidateOrigin;
};

const RETURN_CONTEXT_KEY = "prospectly_refer_candidate_return_context";

function isSafeReturnPath(path: string): boolean {
  return (
    path.startsWith("/") && !path.startsWith("//") && !path.includes("://")
  );
}

export function setReferCandidateReturnContext(
  context: ReferCandidateReturnContext
): void {
  if (!isSafeReturnPath(context.returnPath)) return;
  try {
    sessionStorage.setItem(RETURN_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // Ignore storage errors
  }
}

export function peekReferCandidateReturnContext(): ReferCandidateReturnContext | null {
  try {
    const raw = sessionStorage.getItem(RETURN_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReferCandidateReturnContext;
    if (!parsed?.job?.id || !isSafeReturnPath(parsed.returnPath)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function consumeReferCandidateReturnContext(): ReferCandidateReturnContext | null {
  const context = peekReferCandidateReturnContext();
  try {
    sessionStorage.removeItem(RETURN_CONTEXT_KEY);
  } catch {
    // Ignore storage errors
  }
  return context;
}

export function isReferCandidateStripeReturn(
  searchParams: URLSearchParams
): boolean {
  const isStripeSuccessReturn =
    searchParams.get("stripeRefer") === "success" ||
    searchParams.get("status") === "success";

  return isStripeSuccessReturn && peekReferCandidateReturnContext() != null;
}

export function buildReferCandidateStripeRefreshUrl(
  returnPath: string
): string {
  if (!isSafeReturnPath(returnPath)) {
    return "/recruiting/job-marketplace";
  }

  const [pathname, search = ""] = returnPath.split("?");
  const params = new URLSearchParams(search);
  params.delete("stripeRefer");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildReferCandidateStripeReturnUrl(returnPath: string): string {
  if (!isSafeReturnPath(returnPath)) {
    return "/recruiting/job-marketplace?stripeRefer=success";
  }

  const [pathname, search = ""] = returnPath.split("?");
  const params = new URLSearchParams(search);
  params.set("stripeRefer", "success");
  const query = params.toString();
  return query ? `${pathname}?${query}` : `${pathname}?stripeRefer=success`;
}

export function toAbsoluteAppUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}

export function referPayloadToMarketplaceJob(
  job: ReferCandidateJobPayload
): MarketplaceJob {
  return {
    id: job.id,
    title: job.title,
    companyName: job.companyName,
    description: "",
    salaryRangeMin: "0",
    salaryRangeMax: "0",
    bountyAmount: "0",
    connectorPayout: "0",
    sharerPayout: "0",
    createdAt: new Date(0).toISOString(),
    viewCount: 0,
  };
}
