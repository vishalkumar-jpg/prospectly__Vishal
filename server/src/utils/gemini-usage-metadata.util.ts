/**
 * Gemini REST / unified responses expose usage under `usageMetadata`.
 * Names vary slightly by endpoint; we normalize into logging fields.
 */
export interface GeminiUsageMetadataShape {
  promptTokenCount?: number;
  promptTokens?: number;
  candidatesTokenCount?: number;
  candidatesTokensCount?: number;
  totalTokenCount?: number;
  totalTokens?: number;
}

export function geminiModelIdFromApiUrl(apiUrl: string | undefined): string {
  if (!apiUrl?.trim()) {
    return "gemini";
  }
  const m = apiUrl.match(/models\/([^/:?]+)/);
  return m?.[1] ?? "gemini";
}

export function tokensFromGeminiUsageMetadata(raw: unknown): {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
} {
  if (!raw || typeof raw !== "object") {
    return {
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    };
  }
  const u = raw as GeminiUsageMetadataShape;
  const prompt = u.promptTokenCount ?? u.promptTokens ?? null;
  const completion = u.candidatesTokenCount ?? u.candidatesTokensCount ?? null;
  const total = u.totalTokenCount ?? u.totalTokens ?? null;
  return {
    promptTokens: typeof prompt === "number" ? prompt : null,
    completionTokens: typeof completion === "number" ? completion : null,
    totalTokens: typeof total === "number" ? total : null,
  };
}
