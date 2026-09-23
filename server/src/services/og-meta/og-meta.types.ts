export type OgPageMeta = {
  title: string;
  description: string;
  image: string;
  url: string;
  type: "website" | "article";
};

export type OgMetaCacheEntry = {
  meta: OgPageMeta;
  expiresAt: number;
};
