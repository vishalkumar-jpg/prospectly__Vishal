import {
  RESUME_TEXT_MAX_CHARS,
  RESUME_TEXT_MIN_ALPHA_RATIO,
  RESUME_TEXT_MIN_CHARS,
} from "../resume-indexing.constants";
import {
  stripResumePii,
  type PiiHints,
  type PiiRedactionCounts,
} from "../pii/resume-pii-redactor";

/**
 * Which branch the resume text came from. No longer persisted — it survives as
 * a diagnostic, logged per index run so a corpus of scanned PDFs is visible in
 * the logs even though nothing filters on it any more.
 */
export const RESUME_TEXT_SOURCE = {
  PDF: "pdf",
  STRUCTURED: "structured",
} as const;

export type ResumeTextSource =
  (typeof RESUME_TEXT_SOURCE)[keyof typeof RESUME_TEXT_SOURCE];

export interface ResolveResumeTextInput {
  /** Raw text from the PDF, before any redaction. */
  extractedRaw: string;
  /** `ResumeTextService.buildResumeText()` output, used when the PDF yields nothing. */
  structuredFallback: string;
  /** PII-stripped `ai_summary`, prepended on the PDF branch only. */
  summary: string;
  hints: PiiHints;
}

export interface ResolvedResumeText {
  text: string;
  source: ResumeTextSource;
  highRemoval: boolean;
  redactions: PiiRedactionCounts;
}

function alphaRatio(value: string): number {
  if (!value.length) return 0;
  let alpha = 0;
  for (const char of value) {
    if (/\p{L}/u.test(char)) alpha += 1;
  }
  return alpha / value.length;
}

function truncateOnNewline(value: string, max: number): string {
  if (value.length <= max) return value;
  const slice = value.slice(0, max);
  const cut = slice.lastIndexOf("\n");
  return (cut > max * 0.5 ? slice.slice(0, cut) : slice).trimEnd();
}

/**
 * A pure PDF-text length check is not enough: scanned resumes routinely produce
 * pages of whitespace and CID garbage that clear the character threshold while
 * containing no readable words.
 */
export function resolveResumeText(
  input: ResolveResumeTextInput
): ResolvedResumeText {
  const stripped = stripResumePii(input.extractedRaw, input.hints);

  const usablePdfText =
    stripped.text.length >= RESUME_TEXT_MIN_CHARS &&
    alphaRatio(stripped.text) >= RESUME_TEXT_MIN_ALPHA_RATIO;

  if (usablePdfText) {
    const body = input.summary
      ? `${input.summary}\n\n${stripped.text}`
      : stripped.text;

    return {
      text: truncateOnNewline(body, RESUME_TEXT_MAX_CHARS),
      source: RESUME_TEXT_SOURCE.PDF,
      highRemoval: stripped.highRemoval,
      redactions: stripped.redactions,
    };
  }

  // buildResumeText() already folds the summary in, so it is not prepended here.
  const fallback = stripResumePii(input.structuredFallback, input.hints);

  return {
    text: truncateOnNewline(fallback.text, RESUME_TEXT_MAX_CHARS),
    source: RESUME_TEXT_SOURCE.STRUCTURED,
    highRemoval: fallback.highRemoval,
    redactions: fallback.redactions,
  };
}
