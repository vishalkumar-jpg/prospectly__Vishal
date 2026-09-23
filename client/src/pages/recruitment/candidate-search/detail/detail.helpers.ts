import { DATE_FORMATS } from "@/constants/date";
import { utcDayjs } from "@/lib/dayjs";
import type { ResumeMetadata } from "@/lib/api/recruitment";

export const HIDDEN_DETAIL_STAGES = [
  "processing",
  "in_review",
  "not_qualified",
] as const;

export type HiddenDetailStage = (typeof HIDDEN_DETAIL_STAGES)[number];

type CertificationItem =
  | string
  | { name?: string; issuer?: string | null; year?: number | string };

type LanguageItem = string | { language?: string; proficiency?: string };

export const CHIP_BASE =
  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-default";

const AVATAR_TINTS = [
  "bg-brand-rose/15 text-brand-rose",
  "bg-brand-amethyst/15 text-brand-amethyst",
  "bg-brand-success/15 text-brand-success",
  "bg-brand-warning/15 text-brand-warning",
];

export function initialsOf(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Real-name initials only — never "C#" from "Candidate #RC-…". */
export function revealedInitials(
  name: string | null | undefined
): string | null {
  const trimmed = name?.trim() ?? "";
  if (!trimmed || /^candidate\s*#/i.test(trimmed)) return null;
  return initialsOf(trimmed);
}

/** Same seed rule as the search table so a person keeps one colour. */
export function tintOf(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1)
    hash = (hash + seed.charCodeAt(i)) % 997;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

export function formatLanguageLabel(item: LanguageItem): string | null {
  if (typeof item === "string") {
    const label = item.trim();
    return label.length > 0 ? label : null;
  }
  if (!item || typeof item !== "object") return null;
  const language =
    typeof item.language === "string" ? item.language.trim() : "";
  const proficiency =
    typeof item.proficiency === "string" ? item.proficiency.trim() : "";
  if (!language && !proficiency) return null;
  return [language || "Language", proficiency].filter(Boolean).join(" · ");
}

export function formatCertificationLabel(
  item: CertificationItem
): string | null {
  if (typeof item === "string") {
    const label = item.trim();
    return label.length > 0 ? label : null;
  }
  if (!item || typeof item !== "object") return null;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const issuer = typeof item.issuer === "string" ? item.issuer.trim() : "";
  const year =
    typeof item.year === "number" || typeof item.year === "string"
      ? String(item.year).trim()
      : "";
  if (!name && !issuer && !year) return null;
  return [name || "Certification", issuer, year].filter(Boolean).join(" · ");
}

export function resumeMetadataStringArray(
  meta: ResumeMetadata | null | undefined,
  key: keyof ResumeMetadata
): string[] {
  if (!meta || typeof meta !== "object") return [];
  const raw = meta[key];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isDetailHidden(
  stage: string,
  detailsRevealed: boolean
): boolean {
  return (
    HIDDEN_DETAIL_STAGES.includes(stage as HiddenDetailStage) &&
    !detailsRevealed
  );
}

export function formatResumeDate(value: string | undefined): string {
  if (!value) return "";
  const parsed = utcDayjs(value);
  if (!parsed.isValid()) return value;
  return parsed.local().format(DATE_FORMATS.US_DATE);
}
