import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { geminiConfig } from "config/gemini.config";
import {
  AiUsageLoggerService,
  AI_PROVIDER_GEMINI,
  type AiUsageTrackingData,
} from "services/ai-usage-logger.service";
import {
  geminiModelIdFromApiUrl,
  tokensFromGeminiUsageMetadata,
} from "utils/gemini-usage-metadata.util";
import {
  isTransientFailure,
  isTransientHttpResponse,
  retryAfterDelayMs,
} from "utils/gemini-fetch-retry.utils";
import { JOB_EXTRACTION_ERRORS } from "../job-extraction.constants";

interface GeminiContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string; code?: number };
  usageMetadata?: unknown;
}

@Injectable()
export class JobExtractionGeminiClientUtil {
  private readonly logger = new Logger(JobExtractionGeminiClientUtil.name);

  constructor(private readonly aiUsageLogger: AiUsageLoggerService) {}

  async executeRequest(
    requestBody: Record<string, unknown>,
    retries: number,
    methodName: string,
    trackingData?: AiUsageTrackingData
  ): Promise<string> {
    const runStarted = Date.now();
    const modelId = geminiModelIdFromApiUrl(geminiConfig.apiUrl);
    if (!geminiConfig.apiKey) {
      this.logger.error(
        `JOB_EXTRACTION_GEMINI :: ${methodName} : ERROR : AI provider key is not configured`
      );
      throw new InternalServerErrorException(
        JOB_EXTRACTION_ERRORS.GENERIC_EXTRACTION_FAILURE
      );
    }

    const sanitizedUrl = geminiConfig.apiUrl?.trim() ?? "";
    if (!sanitizedUrl) {
      this.logger.error(
        `JOB_EXTRACTION_GEMINI :: ${methodName} : ERROR : AI provider URL is not configured`
      );
      throw new InternalServerErrorException(
        JOB_EXTRACTION_ERRORS.GENERIC_EXTRACTION_FAILURE
      );
    }

    let url: string;
    let redactedUrl: string;
    try {
      const endpointUrl = new URL(sanitizedUrl);
      endpointUrl.searchParams.set("key", geminiConfig.apiKey);
      url = endpointUrl.toString();
      redactedUrl = endpointUrl.origin + endpointUrl.pathname;
    } catch (err) {
      this.logger.error(
        `JOB_EXTRACTION_GEMINI :: ${methodName} : ERROR : invalid GEMINI_API_URL err=${String(err)}`
      );
      throw new InternalServerErrorException(
        JOB_EXTRACTION_ERRORS.GENERIC_EXTRACTION_FAILURE
      );
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      let response: Response | null = null;
      try {
        response = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          this.logger.error(
            `JOB_EXTRACTION_GEMINI :: ${methodName} : ERROR : non-ok response status=${response.status} attempt=${attempt}/${retries}`
          );

          if (isTransientHttpResponse(response)) {
            if (attempt < retries) {
              const delay = retryAfterDelayMs(
                response.headers.get("Retry-After"),
                attempt
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw new InternalServerErrorException(
              JOB_EXTRACTION_ERRORS.GENERIC_EXTRACTION_FAILURE
            );
          }

          // 400 errors need different handling based on context
          if (response.status === 400) {
            // Try to parse error response to determine error type
            let errorData: AnyType;
            try {
              const errorText = await response.text();
              errorData = errorText ? JSON.parse(errorText) : {};
            } catch {
              // If parsing fails, continue with generic error
            }

            // Check for file-specific error indicators
            const errorMessage =
              errorData?.error?.message || errorData?.message || "";
            const isFileError =
              errorMessage.toLowerCase().includes("corrupted") ||
              errorMessage.toLowerCase().includes("unreadable") ||
              errorMessage.toLowerCase().includes("invalid file") ||
              errorMessage.toLowerCase().includes("unsupported") ||
              methodName.includes("File");

            if (isFileError) {
              this.logger.error(
                `JOB_EXTRACTION_GEMINI :: ${methodName} : ERROR : Gemini API returned 400 (corrupted file) url=${redactedUrl}`
              );
              throw new BadRequestException(
                JOB_EXTRACTION_ERRORS.CORRUPTED_FILE
              );
            }

            // For non-file 400 errors, return the actual error message
            this.logger.error(
              `JOB_EXTRACTION_GEMINI :: ${methodName} : ERROR : Gemini API returned 400 url=${redactedUrl} error=${errorMessage}`
            );
            throw new BadRequestException(
              errorMessage ||
                "Invalid request. Please check your input and try again."
            );
          }

          // Other non-transient errors
          this.logger.error(
            `JOB_EXTRACTION_GEMINI :: ${methodName} : ERROR : Gemini API returned status=${response.status} url=${redactedUrl}`
          );
          throw new InternalServerErrorException(
            JOB_EXTRACTION_ERRORS.GENERIC_EXTRACTION_FAILURE
          );
        }

        const data = (await response.json()) as GeminiContentResponse;

        if (data.error) {
          this.logger.error(
            `JOB_EXTRACTION_GEMINI :: ${methodName} : ERROR : provider error body=${JSON.stringify(data.error)} url=${redactedUrl}`
          );
          throw new InternalServerErrorException(
            "Failed to process external provider response"
          );
        }

        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const text = parts
          .map((p) => p.text)
          .filter(Boolean)
          .join("\n");
        if (!text) {
          throw new InternalServerErrorException(
            "Empty response from Gemini API"
          );
        }

        const tok = tokensFromGeminiUsageMetadata(data.usageMetadata);
        void this.aiUsageLogger.logUsage({
          trackingData,
          provider: AI_PROVIDER_GEMINI,
          model: modelId,
          promptTokens: tok.promptTokens,
          completionTokens: tok.completionTokens,
          totalTokens: tok.totalTokens,
          status: "success",
          responseTimeMs: Date.now() - runStarted,
          retryCount: Math.max(0, attempt - 1),
        });

        return text;
      } catch (error) {
        this.logger.error(
          `JOB_EXTRACTION_GEMINI :: ${methodName} : ERROR : attempt ${attempt}/${retries} failed: ${String(error)} url=${redactedUrl}`
        );

        const fail = (message: string) =>
          void this.aiUsageLogger.logUsage({
            trackingData,
            provider: AI_PROVIDER_GEMINI,
            model: modelId,
            status: "failure",
            errorMessage: message,
            responseTimeMs: Date.now() - runStarted,
            retryCount: Math.max(0, attempt - 1),
          });

        if (error instanceof HttpException) {
          fail(error.message);
          throw error;
        }

        if (
          (error instanceof SyntaxError || error instanceof TypeError) &&
          response?.status === 200
        ) {
          this.logger.error(
            `JOB_EXTRACTION_GEMINI :: ${methodName} : PARSE ERROR : Failed to parse 200 response from Gemini API`
          );
          fail("Invalid response format from AI provider");
          throw new InternalServerErrorException(
            "Invalid response format from AI provider"
          );
        }

        if (!isTransientFailure(response, error)) {
          if (error instanceof Error) {
            fail(error.message);
            throw new InternalServerErrorException(
              `Failed to process AI response: ${error.message}`
            );
          }
          fail(String(error));
          throw error;
        }
        if (attempt === retries) {
          fail("Max retries exceeded (transient errors)");
          throw new InternalServerErrorException(
            JOB_EXTRACTION_ERRORS.GENERIC_EXTRACTION_FAILURE
          );
        }
        const delay = retryAfterDelayMs(null, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } finally {
        clearTimeout(timeoutId);
      }
    }

    void this.aiUsageLogger.logUsage({
      trackingData,
      provider: AI_PROVIDER_GEMINI,
      model: modelId,
      status: "failure",
      errorMessage: "Exhausted retries without success",
      responseTimeMs: Date.now() - runStarted,
      retryCount: Math.max(0, retries - 1),
    });
    throw new InternalServerErrorException(
      JOB_EXTRACTION_ERRORS.GENERIC_EXTRACTION_FAILURE
    );
  }
}
