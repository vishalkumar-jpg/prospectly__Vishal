import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import type { ExtractedJobData } from "../job-extraction.dto";
import {
  escapeNewlinesInsideJsonStrings,
  extractOrRepairTopLevelJsonObject,
} from "../utils/job-extraction-json-repair.utils";
import {
  buildFilePrompt,
  buildTextPrompt,
} from "../constants/job-extraction-prompts";

@Injectable()
export class JobExtractionParserService {
  private readonly logger = new Logger(JobExtractionParserService.name);

  buildPromptForFile(): string {
    return buildFilePrompt();
  }

  // DEPRECATED: Old text-based approach (used only for URL extraction)
  buildPrompt(documentText: string): string {
    return buildTextPrompt(documentText);
  }

  parseResponse(responseText: string): ExtractedJobData {
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
        throw new Error("No JSON object found in provider response");
      }
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(jsonText) as Record<string, unknown>;
      } catch {
        parsed = JSON.parse(
          escapeNewlinesInsideJsonStrings(jsonText)
        ) as Record<string, unknown>;
      }

      return {
        title: this.str(parsed.title),
        companyName: this.str(parsed.companyName),
        industry: this.str(parsed.industry),
        department: this.str(parsed.department),
        experienceLevel: this.normalizeExperienceLevel(
          this.str(parsed.experienceLevel)
        ),
        workType: this.normalizeWorkType(this.str(parsed.workType)),
        employmentType: this.normalizeEmploymentType(
          this.str(parsed.employmentType)
        ),
        location: this.str(parsed.location),
        description: this.str(parsed.description),
        requirements: this.str(parsed.requirements),
        responsibilities: this.str(parsed.responsibilities),
        benefits: this.str(parsed.benefits),
        requiredSkills: this.strArr(parsed.requiredSkills),
        preferredSkills: this.strArr(parsed.preferredSkills),
        salaryRangeMin: 0,
        salaryRangeMax: 0,
      };
    } catch (error) {
      this.logger.error(
        `JOB_EXTRACTION_PARSER :: parseResponse : ERROR : ${error} (responseLength: ${responseText.length})`
      );
      throw new InternalServerErrorException(
        "Failed to parse extracted job details. Please try again."
      );
    }
  }

  private str(val: unknown): string {
    return typeof val === "string" ? val.trim() : "";
  }

  private strArr(val: unknown): string[] {
    return Array.isArray(val)
      ? val
          .filter((v) => typeof v === "string" && v.trim())
          .map((v) => v.trim())
      : [];
  }

  private normalizeExperienceLevel(val: string): string {
    if (!val || typeof val !== "string") return "";

    const normalized = val.trim().toLowerCase();
    const synonyms: Record<string, string> = {
      internship: "intern",
      intern: "intern",
      trainee: "intern",
      entry: "junior",
      "entry-level": "junior",
      "entry level": "junior",
      junior: "junior",
      associate: "junior",
      mid: "mid",
      "mid-level": "mid",
      "mid level": "mid",
      intermediate: "mid",
      regular: "mid",
      senior: "senior",
      sr: "senior",
      lead: "lead",
      staff: "lead",
      principal: "lead",
      executive: "executive",
      director: "executive",
      vp: "executive",
      "c-level": "executive",
      "c-level executive": "executive",
    };

    return synonyms[normalized] || "";
  }

  /**
   * Contractual terms, not location. Kept separate from `normalizeWorkType`
   * because "remote contract" states both, and collapsing them would lose one.
   *
   * Returns "" rather than guessing: a posting silent on its terms is left null
   * so the candidate-search facet does not report a number the JD never stated.
   */
  private normalizeEmploymentType(val: string): string {
    if (!val || typeof val !== "string") return "";

    const normalized = val
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    const synonyms: Record<string, string> = {
      full_time: "full_time",
      fulltime: "full_time",
      permanent: "full_time",
      regular: "full_time",
      part_time: "part_time",
      parttime: "part_time",
      contract: "contract",
      contractual: "contract",
      contractor: "contract",
      fixed_term: "contract",
      c2c: "contract",
      temporary: "temporary",
      temp: "temporary",
      seasonal: "temporary",
      casual: "temporary",
      internship: "internship",
      intern: "internship",
      trainee: "internship",
      apprenticeship: "internship",
      freelance: "freelance",
      freelancer: "freelance",
      consultant: "freelance",
    };

    return synonyms[normalized] || "";
  }

  private normalizeWorkType(val: string): string {
    if (!val || typeof val !== "string") return "";

    const normalized = val.trim().toLowerCase();
    const synonyms: Record<string, string> = {
      remote: "remote",
      "work from home": "remote",
      wfh: "remote",
      "home-based": "remote",
      hybrid: "hybrid",
      mixed: "hybrid",
      flexible: "hybrid",
      onsite: "onsite",
      "on-site": "onsite",
      office: "onsite",
      "in-office": "onsite",
      "in office": "onsite",
    };

    return synonyms[normalized] || "";
  }
}
