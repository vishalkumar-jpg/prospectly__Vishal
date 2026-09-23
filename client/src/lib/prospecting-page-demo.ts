import { utcDayjs } from "./dayjs";

/** Shared fictitious entities used across prospecting demo datasets. */
export const PROSPECTING_DEMO = {
  prospect: {
    id: "demo-prospect-sarah",
    firstName: "Sarah",
    lastName: "Chen",
    company: "NovaTech Solutions",
    title: "VP of Sales",
  },
  prospect2: {
    id: "demo-prospect-david",
    firstName: "David",
    lastName: "Kim",
    company: "Pinnacle SaaS",
    title: "Chief Revenue Officer",
  },
  connector: {
    name: "Marcus Reed",
    company: "Bridge Partners",
    title: "Managing Partner",
  },
  requester: {
    name: "Alex Rivera",
    company: "GrowthStack Inc",
    title: "Head of Partnerships",
  },
} as const;

function daysAgo(days: number): string {
  return utcDayjs().subtract(days, "day").toISOString();
}

export { daysAgo };

/** Enable demo data in dev or with `?demo=1` in the URL. */
export function isProspectingDemoMode(): boolean {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") return true;
  }
  return import.meta.env.DEV;
}

export const PROSPECTING_DEMO_BANNER_TEXT =
  "Demo mode — showing sample prospecting data for UI testing. Add ?demo=1 to force demo data in production builds.";
