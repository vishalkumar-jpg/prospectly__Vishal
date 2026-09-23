import { Injectable, Logger } from "@nestjs/common";
import { geminiConfig } from "config/gemini.config";
import type { AiUsageTrackingData } from "services/ai-usage-logger.service";
import { JobExtractionGeminiClientUtil } from "../utils/job-extraction-gemini-client.util";

/** Defence-in-depth clip applied to every prompt unless a caller raises it. */
const DEFAULT_MAX_PROMPT_CHARS = 15_000;

export interface GeminiGenerateTextOptions {
  jsonMode?: boolean;
  /**
   * Overrides the default prompt clip. Raise it where silently dropping the
   * tail of the prompt would corrupt the result rather than merely shorten it.
   */
  maxPromptChars?: number;
}

@Injectable()
export class JobExtractionGeminiService {
  constructor(private readonly client: JobExtractionGeminiClientUtil) {}

  private readonly logger = new Logger(JobExtractionGeminiService.name);

  async generateText(
    prompt: string,
    retries = 3,
    trackingData?: AiUsageTrackingData,
    options?: GeminiGenerateTextOptions
  ): Promise<string> {
    // Defence-in-depth: clip the prompt so we never send an oversized request.
    const maxPromptChars = options?.maxPromptChars ?? DEFAULT_MAX_PROMPT_CHARS;
    const safePrompt =
      prompt.length > maxPromptChars
        ? prompt.substring(0, maxPromptChars)
        : prompt;

    if (prompt.length > maxPromptChars) {
      // Silent truncation changes the answer, so make it visible.
      this.logger.warn(
        `JOB_EXTRACTION_GEMINI_SERVICE :: generateText :: prompt clipped from ${String(prompt.length)} to ${String(maxPromptChars)} chars`
      );
    }

    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: Math.max(geminiConfig.maxTokens, 8192),
    };
    if (options?.jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }

    const requestBody = {
      contents: [{ parts: [{ text: safePrompt }] }],
      generationConfig,
    };

    return this.client.executeRequest(
      requestBody,
      retries,
      "generateText",
      trackingData
    );
  }

  async generateContentWithFile(
    prompt: string,
    fileBuffer: Buffer,
    mimeType: string,
    retries = 3,
    trackingData?: AiUsageTrackingData
  ): Promise<string> {
    const safePrompt =
      prompt.length > 15_000 ? prompt.substring(0, 15_000) : prompt;

    const fileData = {
      mimeType,
      data: fileBuffer.toString("base64"),
    };

    const requestBody = {
      contents: [
        {
          parts: [
            { text: safePrompt },
            {
              inlineData: fileData,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: Math.max(geminiConfig.maxTokens, 8192),
      },
    };

    return this.client.executeRequest(
      requestBody,
      retries,
      "generateContentWithFile",
      trackingData
    );
  }
}
