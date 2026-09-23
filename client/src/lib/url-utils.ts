/**
 * Validates if a URL is a proper HTTP or HTTPS URL
 * @param url - The URL to validate
 * @returns true if the URL is a valid HTTP or HTTPS URL, false otherwise
 */
export const isHttpOrHttpsUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url);
    return ["https:", "http:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

/**
 * Validates if a URL is a proper HTTPS URL
 * @param url - The URL to validate
 * @returns true if the URL is a valid HTTPS URL, false otherwise
 */
export const isHttpsUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Detects whether a resource is a PDF, by filename extension first then URL path.
 * @param url - The resource URL
 * @param filename - Optional original filename
 * @returns true if the resource appears to be a PDF
 */
export const isPdfFile = (
  url: string | undefined | null,
  filename?: string | null
): boolean => {
  if (!url && !filename) return false;

  if (filename && filename.toLowerCase().endsWith(".pdf")) return true;

  if (url) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.pathname.toLowerCase().endsWith(".pdf");
    } catch {
      return false;
    }
  }

  return false;
};
