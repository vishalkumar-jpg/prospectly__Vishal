export const JOB_EXTRACTION_ERRORS = {
  NO_JOB_DETAILS:
    "No job details could be extracted from this file. The file may not contain a job posting or the format is not supported.",
  PARSE_FAILURE:
    "No job details could be extracted from this URL. The page may not contain a job posting or the format is not supported.",
  CORRUPTED_FILE:
    "The file appears to be corrupted or unreadable. Please try a different file.",
  INVALID_FILE_TYPE: "Invalid file type. Please upload a PDF file.",
  FILE_TOO_LARGE:
    "File size is too large. Please upload a file smaller than 5MB.",
  FILE_REQUIRED: "Please select a file to upload.",
  GENERIC_EXTRACTION_FAILURE:
    "We couldn't extract job details right now. Please try again or enter them manually.",
} as const;

export const GEMINI_MAX_RETRIES = 3;
