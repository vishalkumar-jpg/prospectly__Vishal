import { Injectable } from "@nestjs/common";
import type { ResumeExtractionParsed } from "../../resume-extraction/services/resume-extraction-ai.service";
import { currentCompanyFromResumeMetadata } from "../../candidates/services/candidates-query.helpers";

@Injectable()
export class ResumeTextService {
  buildResumeText(resumeData: ResumeExtractionParsed): string {
    const parts: string[] = [];
    const metadata = (resumeData.metadata ?? {}) as Record<string, unknown>;

    if (resumeData.jobTitle) {
      parts.push(`Job Title: ${resumeData.jobTitle}`);
    }

    const currentEmployer =
      currentCompanyFromResumeMetadata(metadata) ||
      this.readMetadataString(metadata, "currentEmployer");
    if (currentEmployer) {
      parts.push(`Current employer: ${currentEmployer}`);
    }

    const location = this.readMetadataString(metadata, "location");
    if (location) {
      parts.push(`Location: ${location}`);
    }

    if (resumeData.skills?.length) {
      parts.push(`Skills: ${resumeData.skills.join(", ")}`);
    }

    if (resumeData.totalYearsExp != null) {
      parts.push(`Experience: ${resumeData.totalYearsExp} years`);
    }

    const employmentPreference = this.readMetadataString(
      metadata,
      "employmentPreference"
    );
    if (employmentPreference) {
      parts.push(`Employment preference: ${employmentPreference}`);
    }

    if (resumeData.aiSummary) {
      parts.push(`Summary: ${resumeData.aiSummary}`);
    }

    this.appendEducation(parts, metadata);
    this.appendJobHistory(parts, metadata);
    this.appendStringList(parts, metadata, "certifications", "Certifications");
    this.appendStringList(
      parts,
      metadata,
      "domainExpertise",
      "Domain expertise"
    );
    this.appendStringList(parts, metadata, "tools", "Tools");
    this.appendStringList(parts, metadata, "technologies", "Technologies");

    return parts.join("\n\n");
  }

  private readMetadataString(
    metadata: Record<string, unknown>,
    key: string
  ): string | null {
    const value = metadata[key];
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private formatEducationLine(edu: Record<string, unknown>): string | null {
    const degree = typeof edu.degree === "string" ? edu.degree.trim() : "";
    const institution =
      typeof edu.institution === "string" ? edu.institution.trim() : "";
    const field = typeof edu.field === "string" ? edu.field.trim() : "";

    if (!degree && !field) return null;

    const label = [degree, field].filter(Boolean).join(" ");
    if (institution) {
      return `${label} from ${institution}`;
    }
    return label;
  }

  private appendEducation(
    parts: string[],
    metadata: Record<string, unknown>
  ): void {
    if (!Array.isArray(metadata.education)) return;

    const lines: string[] = [];
    for (const item of metadata.education) {
      if (!item || typeof item !== "object") continue;
      const line = this.formatEducationLine(item as Record<string, unknown>);
      if (line) lines.push(`- ${line}`);
    }

    if (lines.length === 0) return;
    parts.push("Education:");
    parts.push(...lines);
  }

  private appendJobHistory(
    parts: string[],
    metadata: Record<string, unknown>
  ): void {
    if (!Array.isArray(metadata.jobHistory)) return;

    const validHistory = metadata.jobHistory
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null
      )
      .filter(
        (exp): exp is { title: string; company: string } =>
          typeof exp.title === "string" && typeof exp.company === "string"
      );

    if (validHistory.length === 0) return;

    parts.push("Work history:");
    for (const exp of validHistory) {
      parts.push(`- ${exp.title} at ${exp.company}`);
    }
  }

  private appendStringList(
    parts: string[],
    metadata: Record<string, unknown>,
    key: string,
    heading: string
  ): void {
    const value = metadata[key];
    if (!Array.isArray(value) || value.length === 0) return;

    const labels = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && "name" in item) {
          return String((item as { name: string }).name);
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));

    if (labels.length === 0) return;
    parts.push(`${heading}: ${labels.join(", ")}`);
  }
}
