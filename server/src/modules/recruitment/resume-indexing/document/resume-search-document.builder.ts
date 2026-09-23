import { createHash } from "node:crypto";
import { EMBED_DOC_MAX_CHARS } from "../resume-indexing.constants";

export interface ResumeProfileInput {
  jobTitle: string | null;
  /** `numeric` column — postgres-js returns a string. */
  totalYearsExp: string | null;
  skills: unknown;
  metadata: unknown;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed) out.push(trimmed);
      continue;
    }
    if (item && typeof item === "object" && "name" in item) {
      const { name } = item as { name: unknown };
      if (typeof name === "string" && name.trim()) out.push(name.trim());
    }
  }
  return out;
}

function readMetadata(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function appendList(parts: string[], heading: string, values: string[]): void {
  if (values.length === 0) return;
  parts.push(`${heading}: ${values.join(", ")}`);
}

/**
 * The high-signal half of the index. Sourced only from structured extraction
 * fields, which are professional by intent but not by guarantee — the AI writes
 * them, so the caller runs the result through the redactor before storing or
 * embedding it. Returns the assembled text only; redaction is not this
 * builder's job.
 */
export function buildProfileText(input: ResumeProfileInput): string {
  const metadata = readMetadata(input.metadata);
  const parts: string[] = [];

  if (input.jobTitle?.trim()) {
    parts.push(`Job Title: ${input.jobTitle.trim()}`);
  }
  if (input.totalYearsExp != null && String(input.totalYearsExp).trim()) {
    parts.push(`Years of Experience: ${String(input.totalYearsExp).trim()}`);
  }

  appendList(parts, "Skills", toStringArray(input.skills));
  appendList(parts, "Technologies", toStringArray(metadata.technologies));
  appendList(parts, "Tools", toStringArray(metadata.tools));
  appendList(
    parts,
    "Domain Expertise",
    toStringArray(metadata.domainExpertise)
  );
  appendList(parts, "Certifications", toStringArray(metadata.certifications));

  return parts.join("\n");
}

/**
 * Embedding input. Profile first so that truncation, which always cuts the
 * tail, can never drop skills or job title — the terms queries actually match.
 *
 * The cap exists because `gemini-embedding-001` accepts 2048 input tokens; the
 * 768-dimension output setting does not change that. The margin is generous
 * because CJK and code-heavy resumes tokenise far worse than 4 chars/token.
 */
export function buildEmbeddingDocument(
  profileText: string,
  resumeText: string
): string {
  const profile = profileText.trim();
  const resume = resumeText.trim();

  if (!resume) return profile.slice(0, EMBED_DOC_MAX_CHARS);
  if (profile.length >= EMBED_DOC_MAX_CHARS) {
    return profile.slice(0, EMBED_DOC_MAX_CHARS);
  }

  const separator = profile ? "\n\n" : "";
  const budget = EMBED_DOC_MAX_CHARS - profile.length - separator.length;

  if (resume.length <= budget) return `${profile}${separator}${resume}`;

  const slice = resume.slice(0, budget);
  const boundary = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
  const trimmed = boundary > budget * 0.5 ? slice.slice(0, boundary) : slice;

  return `${profile}${separator}${trimmed.trimEnd()}`;
}

export function hashSearchDocument(document: string): string {
  return createHash("sha256").update(document).digest("hex");
}
