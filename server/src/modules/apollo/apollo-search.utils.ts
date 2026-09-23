const CORPORATE_SUFFIXES = new Set([
  "pvt",
  "ltd",
  "private",
  "limited",
  "inc",
  "llc",
  "llp",
  "corp",
  "corporation",
  "co",
  "company",
  "group",
  "holdings",
  "enterprises",
]);

/**
 * Splits a search term into individual words, prepending the original value.
 * Optionally filters out corporate suffixes (Pvt, Ltd, Inc, etc.).
 */
export function splitSearchTerms(
  value: string,
  filterCorporateSuffixes = false
): string[] {
  const words = value
    .split(/[\s.-]+/)
    .filter((w) => w.length > 0)
    .filter(
      (w) =>
        !filterCorporateSuffixes || !CORPORATE_SUFFIXES.has(w.toLowerCase())
    );

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const word of words) {
    const lower = word.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(word);
    }
  }

  return [value, ...unique];
}

/**
 * Splits a domain into the full domain and the base name (without TLD).
 */
export function splitDomain(domain: string): string[] {
  const baseName = domain.replace(/\.[^.]+$/, "");
  const results = [domain];
  if (baseName && baseName !== domain) {
    results.push(baseName);
  }
  return results;
}
