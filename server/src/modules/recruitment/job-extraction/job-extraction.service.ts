import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  ExtractedJobData,
  GenerateWithAiDto,
  GeneratedJobDescription,
} from "./job-extraction.dto";
import type { AiUsageTrackingData } from "services/ai-usage-logger.service";
import {
  JobExtractionGeminiService,
  JobExtractionGenerationService,
  JobExtractionParserService,
  JobPageService,
} from "./services";
import {
  GEMINI_MAX_RETRIES,
  JOB_EXTRACTION_ERRORS,
} from "./job-extraction.constants";
import { hasMeaningfulData } from "./utils/job-extraction-validation.utils";

@Injectable()
export class JobExtractionService {
  constructor(
    private readonly jobPage: JobPageService,
    private readonly gemini: JobExtractionGeminiService,
    private readonly parser: JobExtractionParserService,
    private readonly generation: JobExtractionGenerationService
  ) {}

  async extractFromFile(
    buffer: Buffer,
    mimetype: string,
    tracking?: AiUsageTrackingData
  ): Promise<ExtractedJobData> {
    const prompt = this.parser.buildPromptForFile();
    const responseText = await this.gemini.generateContentWithFile(
      prompt,
      buffer,
      mimetype,
      GEMINI_MAX_RETRIES,
      tracking
    );
    const parsed = this.parser.parseResponse(responseText);

    if (!hasMeaningfulData(parsed)) {
      throw new BadRequestException(JOB_EXTRACTION_ERRORS.NO_JOB_DETAILS);
    }

    return parsed;
  }

  async extractFromUrl(
    urlString: string,
    tracking?: AiUsageTrackingData
  ): Promise<ExtractedJobData> {
    const text = await this.jobPage.fetchJobPagePlainText(urlString);
    return this.extractFromText(text, tracking);
  }

  /**
   * Extraction from plain text a caller already holds — a pasted job
   * description, for instance.
   *
   * Factored out of `extractFromUrl` rather than added alongside it: both feed
   * the same prompt and the same parser, and a second copy would be a second
   * place to keep the prompt in step.
   */
  async extractFromText(
    text: string,
    tracking?: AiUsageTrackingData
  ): Promise<ExtractedJobData> {
    const prompt = this.parser.buildPrompt(text);
    const responseText = await this.gemini.generateText(
      prompt,
      GEMINI_MAX_RETRIES,
      tracking
    );

    const parsed = this.parser.parseResponse(responseText);

    if (!hasMeaningfulData(parsed)) {
      throw new BadRequestException(JOB_EXTRACTION_ERRORS.PARSE_FAILURE);
    }

    return parsed;
  }

  /**
   * Generates a job description using AI based on the provided job details.
   *
   * @param data - The job details including title, industry, department, and other requirements
   * @returns A promise that resolves to the generated job description with description, requirements, responsibilities, and benefits
   * @throws {Error} When the AI generation fails or returns invalid data
   */
  async generateWithAi(
    data: GenerateWithAiDto,
    tracking?: AiUsageTrackingData
  ): Promise<GeneratedJobDescription> {
    return this.generation.generateWithAi(data, tracking);
  }
}
