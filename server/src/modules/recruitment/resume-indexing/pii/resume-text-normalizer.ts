import { MAX_TOKEN_LENGTH } from "./resume-pii.patterns";

const UNICODE_SPACES = new Set([
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  "　",
  "﻿",
]);

/**
 * Strips C0/C1 control characters (keeping tab and newline, which carry resume
 * layout) and folds every Unicode space variant a PDF extractor may emit down
 * to a plain space.
 */
function normalizeCharacters(input: string): string {
  let out = "";
  for (const char of input) {
    const code = char.codePointAt(0) ?? 0;

    if (char === "\n" || char === "\t") {
      out += char;
      continue;
    }
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) continue;
    if (UNICODE_SPACES.has(char)) {
      out += " ";
      continue;
    }
    out += char;
  }
  return out;
}

function splitOversizedTokens(line: string): string {
  if (line.length <= MAX_TOKEN_LENGTH) return line;

  return line
    .split(" ")
    .map((token) => {
      if (token.length <= MAX_TOKEN_LENGTH) return token;
      const chunks: string[] = [];
      for (let i = 0; i < token.length; i += MAX_TOKEN_LENGTH) {
        chunks.push(token.slice(i, i + MAX_TOKEN_LENGTH));
      }
      return chunks.join(" ");
    })
    .join(" ");
}

/**
 * A line with neither a letter nor a digit cannot produce a single token for
 * the tsvector or a single meaningful unit for the embedding, whatever glyph it
 * holds — so it is noise by construction.
 *
 * This is worth filtering because PDF extraction routinely emits it. Text comes
 * back in content-stream order, and a resume that draws its list markers as a
 * separate run yields the bullets detached from their text, clumped together —
 * typically a block of bare "•" lines at the end of the document. The bullet
 * text itself is present in place, so nothing is lost by dropping the markers.
 *
 * Deliberately a property test rather than a list of bullet characters: it
 * covers •, ◦, ▪, ‣, en/em dashes, *, |, rule lines and stray punctuation
 * without guessing, and being Unicode-aware it keeps CJK and accented text,
 * which \w would not.
 */
function hasContent(line: string): boolean {
  return /[\p{L}\p{N}]/u.test(line);
}

/**
 * The single entry point the redactor needs. Runs before any pattern matching,
 * so a PDF's exotic spacing cannot hide an email or a phone number from the
 * patterns that look for them.
 */
export function normalizeResumeWhitespace(input: string): string {
  return (
    normalizeCharacters(input.replace(/\r\n?/g, "\n").normalize("NFKC"))
      .replace(/[ \t]+/g, " ")
      .split("\n")
      .map((line) => splitOversizedTokens(line).trim())
      // Blank lines survive: they carry paragraph structure. Only lines that
      // hold something, but nothing readable, are dropped.
      .filter((line) => line === "" || hasContent(line))
      .join("\n")
      // After the join, because dropping lines can open new gaps.
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
