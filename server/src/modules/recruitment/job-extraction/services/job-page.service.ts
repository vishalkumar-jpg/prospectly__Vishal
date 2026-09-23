import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  collapseWhitespaceForLengthCheck,
  jobPageHtmlToExtractionPlainText,
} from "../utils/job-page-html-to-text.utils";
import {
  fetchJobPageWithSsrfGuards,
  parseAndAssertJobExtractionUrl,
} from "../utils/job-extraction-url.utils";
import {
  JOB_PAGE_ERROR_MESSAGES,
  JOB_SITES_THAT_BLOCK,
} from "../constants/job-page-error-messages.constants";

/** Max raw HTML bytes read from a job URL (memory / DoS bound). */
const MAX_JOB_PAGE_HTML_BYTES = 500_000;

@Injectable()
export class JobPageService {
  private readonly logger = new Logger(JobPageService.name);

  /**
   * Fetches a public job page, reads a bounded HTML body, strips tags, and
   * returns plain text truncated for the extraction model.
   */
  async fetchJobPagePlainText(urlString: string): Promise<string> {
    const safeUrl = parseAndAssertJobExtractionUrl(urlString);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    let res: Response;
    try {
      res = await fetchJobPageWithSsrfGuards(safeUrl, {
        signal: controller.signal,
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (compatible; ProspectlyJobBot/1.0; +https://prospectly.com)",
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const safeUrlForLog = `${safeUrl.origin}${safeUrl.pathname}`;
      const cause =
        error instanceof Error &&
        "cause" in error &&
        (error as Error & { cause?: unknown }).cause !== undefined
          ? ` : cause=${(error as Error & { cause?: unknown }).cause}`
          : "";
      this.logger.warn(
        `JOB_EXTRACTION_PAGE :: fetchJobPagePlainText : fetch failed : ${safeUrlForLog} : ${error}${cause}`
      );
      throw new BadRequestException(JOB_PAGE_ERROR_MESSAGES.COULD_NOT_LOAD_URL);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      throw new BadRequestException(
        this.getUserFriendlyErrorMessage(res.status, safeUrl.hostname)
      );
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const isHtml =
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml+xml");
    if (!isHtml) {
      throw new BadRequestException(JOB_PAGE_ERROR_MESSAGES.NOT_HTML_PAGE);
    }

    const rawHtml = await this.readBoundedJobPageHtml(res);
    const structured = jobPageHtmlToExtractionPlainText(rawHtml);
    const collapsed = collapseWhitespaceForLengthCheck(structured);
    if (collapsed.length < 80) {
      throw new BadRequestException(JOB_PAGE_ERROR_MESSAGES.NOT_ENOUGH_TEXT);
    }

    return structured.substring(0, 15000);
  }

  /**
   * Reject oversized bodies via Content-Length when trustworthy; otherwise read
   * from the response stream and cap at MAX_JOB_PAGE_HTML_BYTES (no full-body buffer).
   */
  private async readBoundedJobPageHtml(res: Response): Promise<string> {
    const max = MAX_JOB_PAGE_HTML_BYTES;
    const clHeader = res.headers.get("content-length");
    if (clHeader !== null && clHeader.trim() !== "") {
      const parsed = Number.parseInt(clHeader.trim(), 10);
      if (Number.isFinite(parsed) && parsed > max) {
        throw new BadRequestException(JOB_PAGE_ERROR_MESSAGES.PAGE_TOO_LARGE);
      }
    }

    if (!res.body) {
      return "";
    }

    const reader = res.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value?.length) continue;
        if (total + value.length > max) {
          await reader.cancel();
          throw new BadRequestException(JOB_PAGE_ERROR_MESSAGES.PAGE_TOO_LARGE);
        }
        total += value.length;
        chunks.push(Buffer.from(value));
      }
    } catch (err) {
      await reader.cancel().catch(() => undefined);
      throw err;
    }

    return Buffer.concat(chunks).toString("utf8");
  }

  /**
   * Generates user-friendly error messages based on HTTP status codes.
   */
  private getUserFriendlyErrorMessage(
    status: number,
    hostname?: string
  ): string {
    // Check if this is a job site that commonly blocks automated access
    const normalizedHostname = hostname
      ?.replace(/^www\./, "")
      .replace(/\.$/, "");
    const isJobSite =
      normalizedHostname &&
      JOB_SITES_THAT_BLOCK.some(
        (site) =>
          normalizedHostname === site || normalizedHostname.endsWith("." + site)
      );

    switch (status) {
      case 403:
        return isJobSite
          ? JOB_PAGE_ERROR_MESSAGES.HTTP_403_JOB_SITE(hostname)
          : JOB_PAGE_ERROR_MESSAGES.HTTP_403_GENERAL;

      case 404:
        return JOB_PAGE_ERROR_MESSAGES.HTTP_404;

      case 401:
        return JOB_PAGE_ERROR_MESSAGES.HTTP_401;

      case 429:
        return JOB_PAGE_ERROR_MESSAGES.HTTP_429;

      case 500:
      case 502:
      case 503:
      case 504:
        return JOB_PAGE_ERROR_MESSAGES.HTTP_5XX;

      default:
        if (status >= 400 && status < 500) {
          return JOB_PAGE_ERROR_MESSAGES.HTTP_4XX_DEFAULT;
        }
        return JOB_PAGE_ERROR_MESSAGES.HTTP_DEFAULT;
    }
  }
}
