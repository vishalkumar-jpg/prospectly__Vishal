/**
 * Error messages for job page extraction service.
 * Centralized for better maintainability and consistency.
 */

export const JOB_PAGE_ERROR_MESSAGES = {
  // General errors
  COULD_NOT_LOAD_URL:
    "We couldn't open this link. Please check if it's correct and try again.",

  NOT_HTML_PAGE:
    "This link doesn't look like a job page. Please share a direct job posting link.",

  NOT_ENOUGH_TEXT:
    "We couldn't find enough details on this page to extract the job information.",

  PAGE_TOO_LARGE:
    "This job page is too large to process. Please try another link.",

  // HTTP Status Code Messages
  HTTP_403_GENERAL:
    "This website doesn't allow us to access the job details. Please copy and paste the job details manually, or try a different job posting link.",

  HTTP_403_JOB_SITE: (hostname?: string) =>
    `We can't access job details from ${hostname}. Please copy and paste the job details manually, or try a different job posting link.`,

  HTTP_404:
    "This job link doesn't seem to work anymore. It may have been removed or expired.",

  HTTP_401:
    "This job requires login to view. Please share a public job link instead.",

  HTTP_429:
    "You've made too many requests. Please wait a few minutes and try again.",

  HTTP_5XX:
    "The job website is having issues right now. Please try again shortly.",

  // Default messages
  HTTP_4XX_DEFAULT:
    "We couldn't access this job link. It may be expired or require login.",

  HTTP_DEFAULT:
    "We couldn't extract job details from this link. Please try another link or paste the job details manually.",
} as const;

// List of job sites that commonly block automated access
export const JOB_SITES_THAT_BLOCK = [
  "naukri.com",
  "indeed.com",
  "linkedin.com",
  "glassdoor.com",
] as const;
