import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { JobExtractionGeminiService } from "modules/recruitment/job-extraction/services/job-extraction-gemini.service";
import {
  escapeNewlinesInsideJsonStrings,
  extractOrRepairTopLevelJsonObject,
} from "modules/recruitment/job-extraction/utils/job-extraction-json-repair.utils";
import { mergeUniqueTrimmedStrings } from "utils/helper.utils";
import type { AiUsageTrackingData } from "services/ai-usage-logger.service";
import {
  RESUME_EXTRACTION_JSON_SCHEMA,
  RESUME_EXTRACTION_CRITICAL_INSTRUCTIONS,
  RESUME_EXTRACTION_WITH_CONTACT_JSON_SCHEMA,
} from "../resume-extraction.constants";

export interface ResumeExtractionParsed {
  jobTitle: string | null;
  skills: string[];
  totalYearsExp: string | null;
  aiSummary: string | null;
  metadata: Record<string, unknown>;
}

export interface ResumeContactInfo {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
}

export interface ResumeExtractionWithContact extends ResumeExtractionParsed {
  contactInfo: ResumeContactInfo;
}

@Injectable()
export class ResumeExtractionAiService {
  private readonly logger = new Logger(ResumeExtractionAiService.name);

  constructor(private readonly gemini: JobExtractionGeminiService) {}

  // Extract structured data from resume files (PDF only)
  async extractFromResumeFile(
    fileBuffer: Buffer,
    mimeType: string,
    tracking?: AiUsageTrackingData
  ): Promise<ResumeExtractionParsed> {
    const prompt = `You are an expert resume parser. Analyze this resume file and extract structured information.

${RESUME_EXTRACTION_JSON_SCHEMA}

${RESUME_EXTRACTION_CRITICAL_INSTRUCTIONS}

Please carefully analyze the entire document, including any images, tables, or complex layouts. Extract all relevant information accurately.`;

    const raw = await this.gemini.generateContentWithFile(
      prompt,
      fileBuffer,
      mimeType,
      3,
      tracking
    );
    return this.parseResponse(raw);
  }

  // Extract structured data + contact info from resume (for connector uploads)
  async extractFromResumeFileWithContactInfo(
    fileBuffer: Buffer,
    mimeType: string,
    tracking?: AiUsageTrackingData
  ): Promise<ResumeExtractionWithContact> {
    const prompt = `You are an expert resume parser. Analyze this resume file and extract structured information including the candidate's contact details.

${RESUME_EXTRACTION_WITH_CONTACT_JSON_SCHEMA}

${RESUME_EXTRACTION_CRITICAL_INSTRUCTIONS}

Please carefully analyze the entire document, including any images, tables, or complex layouts. Extract all relevant information accurately. Pay special attention to the contact/header section for the candidate's name, phone, and LinkedIn URL. DO NOT extract email from the resume — the uploader provides the email separately.`;

    const raw = await this.gemini.generateContentWithFile(
      prompt,
      fileBuffer,
      mimeType,
      3,
      tracking
    );
    return this.parseResponseWithContact(raw);
  }

  public parseResponseWithContact(
    responseText: string
  ): ResumeExtractionWithContact {
    const base = this.parseResponse(responseText);

    // Re-parse to extract contactInfo
    try {
      const jsonText =
        extractOrRepairTopLevelJsonObject(responseText) ??
        responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim() ??
        responseText.trim().match(/\{[\s\S]*\}/)?.[0] ??
        null;

      let contactInfo: ResumeContactInfo = {
        firstName: null,
        lastName: null,
        email: null,
        phone: null,
        linkedinUrl: null,
      };

      if (jsonText) {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(jsonText) as Record<string, unknown>;
        } catch {
          parsed = JSON.parse(
            escapeNewlinesInsideJsonStrings(jsonText)
          ) as Record<string, unknown>;
        }

        const ci = parsed.contactInfo as Record<string, unknown> | undefined;
        if (ci && typeof ci === "object") {
          contactInfo = {
            firstName:
              typeof ci.firstName === "string" ? ci.firstName.trim() : null,
            lastName:
              typeof ci.lastName === "string" ? ci.lastName.trim() : null,
            // Email is intentionally never sourced from the resume — it is
            // supplied by the connector at upload time and injected later.
            email: null,
            phone: typeof ci.phone === "string" ? ci.phone.trim() : null,
            linkedinUrl:
              typeof ci.linkedinUrl === "string" ? ci.linkedinUrl.trim() : null,
          };
        }
      }

      return { ...base, contactInfo };
    } catch (error) {
      this.logger.error(
        `RESUME_EXTRACTION_AI :: parseResponseWithContact : ERROR : ${String(error)}`
      );
      return {
        ...base,
        contactInfo: {
          firstName: null,
          lastName: null,
          email: null,
          phone: null,
          linkedinUrl: null,
        },
      };
    }
  }

  public parseResponse(responseText: string): ResumeExtractionParsed {
    try {
      let jsonText = extractOrRepairTopLevelJsonObject(responseText);
      if (!jsonText) {
        const fenced = responseText
          .match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]
          ?.trim();
        const candidate = (fenced ?? responseText.trim()).replace(
          /\s*```\s*$/i,
          ""
        );
        jsonText = candidate.match(/\{[\s\S]*\}/)?.[0] ?? null;
      }
      if (!jsonText) {
        throw new Error("No JSON object in provider response");
      }
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(jsonText) as Record<string, unknown>;
      } catch {
        parsed = JSON.parse(
          escapeNewlinesInsideJsonStrings(jsonText)
        ) as Record<string, unknown>;
      }

      const metadata = { ...this.asRecord(parsed.metadata) };
      const skills = this.asStringArray(parsed.skills);
      const totalYearsExp = this.formatYears(parsed.totalYearsExp);

      const tools = mergeUniqueTrimmedStrings([
        ...this.asStringArray(metadata.tools),
        ...this.asStringArray(metadata.toolsTechnologies),
      ]);
      const technologies = mergeUniqueTrimmedStrings([
        ...this.asStringArray(metadata.technologies),
      ]);
      metadata.tools = tools;
      metadata.technologies = technologies;
      delete metadata.toolsTechnologies;

      return {
        jobTitle:
          typeof parsed.jobTitle === "string" && parsed.jobTitle.trim()
            ? parsed.jobTitle.trim()
            : null,
        skills,
        totalYearsExp,
        aiSummary:
          typeof parsed.aiSummary === "string" ? parsed.aiSummary : null,
        metadata,
      };
    } catch (error) {
      this.logger.error(
        `RESUME_EXTRACTION_AI :: parseResponse : ERROR : ${String(error)}`
      );
      throw new InternalServerErrorException(
        "Failed to parse resume extraction response"
      );
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private formatYears(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" && !Number.isNaN(value)) {
      return String(value);
    }
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    return null;
  }
}
