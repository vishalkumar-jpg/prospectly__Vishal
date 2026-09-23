import { parseAndAssertJobExtractionUrl } from "./hostname-assert";
import {
  fetchJobPageWithSsrfGuards,
  MAX_JOB_EXTRACTION_REDIRECTS,
} from "./network/pinning";

// Re-export for backward compatibility
export {
  parseAndAssertJobExtractionUrl,
  fetchJobPageWithSsrfGuards,
  MAX_JOB_EXTRACTION_REDIRECTS,
};
