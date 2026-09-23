import {
  COMPANY_STOPWORDS,
  TITLE_STOPWORDS,
} from "./typesense-search.constants";
import {
  TypesenseContactDocument,
  ApolloCacheDocument,
  SearchResultDocument,
  TypesenseSearchParams,
  TypesenseHit,
  TypesenseSearchResult,
} from "../core/typesense.types";

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function matchesCompany(
  searchCompany: string,
  recordCompany: string
): boolean {
  const searchTokensAll = tokenize(searchCompany);
  const recordTokensAll = tokenize(recordCompany);
  const searchTokens = searchTokensAll.filter((t) => !COMPANY_STOPWORDS.has(t));
  const recordTokens = recordTokensAll.filter((t) => !COMPANY_STOPWORDS.has(t));

  // If the user query is entirely stopwords (e.g. just "LLC"), fall back to
  // a normalized substring check so we don't accept every company on the "llc" token.
  if (searchTokens.length === 0) {
    const normalized = searchTokensAll.join(" ");
    if (!normalized) return false;
    return recordTokensAll.join(" ").includes(normalized);
  }

  return searchTokens.some((token) => recordTokens.includes(token));
}

export function matchesTitle(
  searchTitle: string,
  recordTitle: string
): boolean {
  const searchTokens = tokenize(searchTitle).filter(
    (t) => !TITLE_STOPWORDS.has(t)
  );
  const recordTokens = tokenize(recordTitle).filter(
    (t) => !TITLE_STOPWORDS.has(t)
  );

  // If all search tokens were stopwords, no meaningful filter can be applied — skip match
  if (searchTokens.length === 0) return false;
  return searchTokens.some((token) => recordTokens.includes(token));
}

export function normalizeWebsite(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

export function matchesWebsite(
  searchWebsite: string,
  recordWebsite: string
): boolean {
  return normalizeWebsite(searchWebsite) === normalizeWebsite(recordWebsite);
}

export function matchesLocation(
  searchLocation: string,
  recordLocation: string
): boolean {
  const searchTokens = tokenize(searchLocation);
  const recordTokens = tokenize(recordLocation);
  if (searchTokens.length === 0) return false;
  return searchTokens.some((token) => recordTokens.includes(token));
}

export function postFilterResults(
  results: SearchResultDocument[],
  params: TypesenseSearchParams
): SearchResultDocument[] {
  return results.filter((result) => {
    if (params.company) {
      if (!result.company) return false;
      if (!matchesCompany(params.company, result.company)) return false;
    }

    if (params.title) {
      if (!result.title) return false;
      if (!matchesTitle(params.title, result.title)) return false;
    }

    if (params.website) {
      if (!("website" in result) || !result.website) return false;
      if (!matchesWebsite(params.website, result.website)) return false;
    }

    if (params.location) {
      const contactResult = result as TypesenseContactDocument;
      const recordLocation = [
        contactResult.location,
        contactResult.city,
        contactResult.state,
        contactResult.country,
      ]
        .filter(Boolean)
        .join(" ");
      // Lenient: location is a soft narrowing hint. Only drop when the record
      // has location data AND it doesn't match — records with no location data
      // are kept (Typesense already de-prioritized them via ranking).
      if (recordLocation && !matchesLocation(params.location, recordLocation)) {
        return false;
      }
    }

    return true;
  });
}

export function mergeByRelevanceScore(
  contactsResult: TypesenseSearchResult,
  cacheResult: TypesenseSearchResult
): SearchResultDocument[] {
  const mapHits = (
    hits: TypesenseHit[],
    docType: "contact" | "cache"
  ): { score: number; doc: SearchResultDocument }[] =>
    hits.map((hit) => ({
      score: hit.text_match_info?.score || hit.text_match || 0,
      doc:
        docType === "contact"
          ? (hit.document as unknown as TypesenseContactDocument)
          : (hit.document as unknown as ApolloCacheDocument),
    }));

  const contactHits = mapHits(contactsResult?.hits || [], "contact");
  const cacheHits = mapHits(cacheResult?.hits || [], "cache");

  // Merge and sort by relevance score descending
  return [...contactHits, ...cacheHits]
    .sort((a, b) => b.score - a.score)
    .map((item) => item.doc);
}
