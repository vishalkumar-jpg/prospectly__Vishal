import { useEffect } from "react";

type SEOProps = {
  title: string;
  description?: string;
  canonical?: string;
  /** og:image absolute or root-relative URL. Defaults to prospecting share image. */
  ogImage?: string;
  /** og:type (defaults to "website"). */
  ogType?: "website" | "article";
  /** Override robots policy. Defaults to "index,follow". */
  robots?: string;
};

const DEFAULT_OG_IMAGE = "/og/prospecting-share.webp";

/**
 * Manages `<head>` metadata for each page. Sets (or creates) the title,
 * meta description, canonical link, Open Graph, Twitter card, and robots.
 */
export default function SEO({
  title,
  description,
  canonical,
  ogImage,
  ogType = "website",
  robots = "index,follow",
}: SEOProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = title;

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const canonicalHref = canonical
      ? canonical.startsWith("http")
        ? canonical
        : `${origin}${canonical}`
      : `${origin}${path}`;
    const imageUrl = (ogImage ?? DEFAULT_OG_IMAGE).startsWith("http")
      ? (ogImage ?? DEFAULT_OG_IMAGE)
      : `${origin}${ogImage ?? DEFAULT_OG_IMAGE}`;

    setMeta("name", "description", description);
    setMeta("name", "robots", robots);

    setLink("canonical", canonicalHref);

    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:url", canonicalHref);
    setMeta("property", "og:image", imageUrl);

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);
  }, [title, description, canonical, ogImage, ogType, robots]);

  return null;
}

/** Create-or-update a `<meta>` tag. */
function setMeta(
  attr: "name" | "property",
  key: string,
  value: string | undefined
) {
  if (!value) return;
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

/** Create-or-update a `<link rel="..." >` element. */
function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}
