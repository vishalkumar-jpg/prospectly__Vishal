import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import type {
  GenerateWithAiDto,
  GeneratedJobDescription,
} from "../job-extraction.dto";
import type { AiUsageTrackingData } from "services/ai-usage-logger.service";
import { JobExtractionGeminiService } from "./job-extraction-gemini.service";
import { buildGenerationPrompt } from "../constants/job-extraction-generation-prompts";

@Injectable()
export class JobExtractionGenerationService {
  private readonly logger = new Logger(JobExtractionGenerationService.name);

  constructor(private readonly gemini: JobExtractionGeminiService) {}

  /**
   * Generates job description sections using AI.
   * @param data - Input data containing job title, company info, and requirements
   * @returns Generated job description with all required sections
   */
  async generateWithAi(
    data: GenerateWithAiDto,
    tracking?: AiUsageTrackingData
  ): Promise<GeneratedJobDescription> {
    const prompt = buildGenerationPrompt(data);
    const responseText = await this.gemini.generateText(prompt, 3, tracking);
    return this.parseGenerationResponse(responseText);
  }

  /** Parses the generation response.
   * @param responseText - raw response string
   * @returns GeneratedJobDescription
   */
  private parseGenerationResponse(
    responseText: string
  ): GeneratedJobDescription {
    try {
      const jsonText = responseText.match(/\{[\s\S]*\}/)?.[0] ?? null;
      if (!jsonText) {
        throw new InternalServerErrorException(
          "No JSON object found in provider response"
        );
      }

      const parsed = JSON.parse(jsonText) as Record<string, unknown>;

      // Validate all required fields are present and non-empty
      const requiredFields: Array<keyof GeneratedJobDescription> = [
        "description",
        "requirements",
        "responsibilities",
        "benefits",
      ];

      const missingFields: string[] = [];
      const result: Partial<GeneratedJobDescription> = {};

      for (const field of requiredFields) {
        const value = parsed[field];
        if (typeof value !== "string" || value.trim() === "") {
          missingFields.push(field);
        } else {
          result[field] = value.trim();
        }
      }

      if (missingFields.length > 0) {
        throw new InternalServerErrorException(
          `AI generation failed: Missing or empty fields: ${missingFields.join(", ")}`
        );
      }

      return result as GeneratedJobDescription;
    } catch (error) {
      this.logger.error(
        `JOB_EXTRACTION_GENERATION :: parseGenerationResponse : ERROR : ${error} (responseLength: ${responseText.length})`
      );
      throw new InternalServerErrorException(
        "Failed to parse AI-generated job description. Please try again."
      );
    }
  }
}
