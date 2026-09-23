import { useEffect } from "react";

interface StructuredDataProps {
  /** A valid schema.org JSON-LD object (or array). */
  data: Record<string, unknown> | Record<string, unknown>[];
  /** Unique id so the script tag can be replaced on remount. */
  id: string;
}

/**
 * Injects a `<script type="application/ld+json">` tag into `<head>`.
 * Removes the tag on unmount so only one instance per `id` is active.
 */
export default function StructuredData({ data, id }: StructuredDataProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const tagId = `ld-${id}`;
    let el = document.getElementById(tagId) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = tagId;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
    return () => {
      el?.remove();
    };
  }, [data, id]);

  return null;
}

/** Build a schema.org `BreadcrumbList` JSON-LD payload. */
export function buildBreadcrumb(
  origin: string,
  crumbs: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${origin}${c.path}`,
    })),
  };
}

/** Build a schema.org `FAQPage` JSON-LD payload. */
export function buildFaqPage(
  faqs: Array<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** Build a schema.org `Organization` JSON-LD payload. */
export function buildOrganization(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Prospectly",
    url: origin,
    logo: `${origin}/prospectly-logo.png`,
    sameAs: [
      "https://www.linkedin.com/company/prospectly",
      "https://twitter.com/prospectly",
    ],
  };
}

/** Resolve the runtime origin (empty string during SSR). */
export function getPageOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

/**
 * High-level helper that injects a `BreadcrumbList` + optional
 * `FAQPage` + optional `Organization` for a single page.
 */
export function PageStructuredData({
  page,
  crumbs,
  faqs,
  includeOrganization = false,
}: {
  page: string;
  crumbs: Array<{ name: string; path: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  includeOrganization?: boolean;
}) {
  const origin = getPageOrigin();
  return (
    <>
      <StructuredData
        id={`${page}-breadcrumb`}
        data={buildBreadcrumb(origin, crumbs)}
      />
      {faqs && faqs.length > 0 && (
        <StructuredData id={`${page}-faq`} data={buildFaqPage(faqs)} />
      )}
      {includeOrganization && (
        <StructuredData
          id={`${page}-org`}
          data={buildOrganization(origin)}
        />
      )}
    </>
  );
}
