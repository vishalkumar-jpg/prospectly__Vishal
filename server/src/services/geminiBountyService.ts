import { Logger } from "@nestjs/common";
import { geminiConfig } from "config/gemini.config";
import {
  geminiModelIdFromApiUrl,
  tokensFromGeminiUsageMetadata,
} from "utils/gemini-usage-metadata.util";
import {
  isTransientHttpResponse,
  retryAfterDelayMs,
} from "utils/gemini-fetch-retry.utils";
import type { BountyContactData } from "modules/introductions/bounty-calculator/bounty-contact-data.types";
import type { ContactImportRow } from "./contactImportService";
import {
  AI_PROVIDER_GEMINI,
  type AiUsageLoggerService,
  type AiUsageTrackingData,
} from "./ai-usage-logger.service";

const logger = new Logger("GeminiBountyService");

/** Optional AI usage logging (Nest-injected service passed from callers). */
export interface GeminiBountyCallOptions {
  aiUsageLogger?: AiUsageLoggerService;
  trackingData?: AiUsageTrackingData;
}

interface GeminiBountyResponse {
  bounty_amount: number;
  [key: string]: unknown; // Allow other fields but we'll ignore them
}

interface GeminiContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
  };
  usageMetadata?: unknown;
}

/**
 * Check if a contact has researchable data (company name OR LinkedIn URL)
 *
 * This function performs strict validation to ensure we only calculate bounties
 * when we have sufficient context for accurate AI-powered bounty calculation.
 *
 * Requirements:
 * - Company: Must be a non-empty string after trimming (not null, undefined, or whitespace-only)
 * - LinkedIn: Must be a non-empty string after trimming AND contain "linkedin.com" (case-insensitive)
 *
 * @param contact - Contact to validate
 * @returns True if contact has at least one researchable data point (company OR LinkedIn URL)
 */
function hasResearchableData(contact: BountyContactData | ContactImportRow): {
  hasCompany: boolean;
  hasLinkedIn: boolean;
  isValid: boolean;
} {
  // Validate company: must exist, be a string, and have non-whitespace content after trimming
  const { company } = contact;
  const hasCompany =
    company !== null &&
    company !== undefined &&
    typeof company === "string" &&
    company.trim().length > 0;

  // Validate LinkedIn URL: must exist, be a string, have non-whitespace content after trimming,
  // and contain "linkedin.com" (case-insensitive check)
  const { linkedin } = contact;
  const hasLinkedIn =
    linkedin !== null &&
    linkedin !== undefined &&
    typeof linkedin === "string" &&
    linkedin.trim().length > 0 &&
    linkedin.toLowerCase().includes("linkedin.com");

  return {
    hasCompany,
    hasLinkedIn,
    isValid: hasCompany || hasLinkedIn,
  };
}

/**
 * Build prompt for a single contact
 */
function buildContactPrompt(contact: BountyContactData): string {
  const fullName = contact.first_name
    ? `${contact.first_name}${contact.last_name ? ` ${contact.last_name}` : ""}`
    : "Unknown";

  // Use the same validation helper for consistency
  const validation = hasResearchableData(contact);
  const { hasLinkedIn } = validation;
  const { hasCompany } = validation;

  // Build research instructions based on available data
  let researchInstructions = "";
  if (hasLinkedIn || hasCompany) {
    researchInstructions = `

IMPORTANT RESEARCH INSTRUCTIONS:
${hasLinkedIn ? `- Search the internet using the LinkedIn URL: ${contact.linkedin}` : ""}
${hasCompany ? `- Search the internet for information about the company: ${contact.company}` : ""}
- Gather additional data such as:
  * Company size, revenue, funding stage, and market valuation
  * Company's industry position and competitive standing
  * Person's professional background, experience, and network influence
  * Recent news, achievements, or notable connections
  * Industry trends and market value of similar roles
- Use this researched data to inform your referral payout calculation`;
  }

  // Build enrichment details section if available
  let enrichmentDetails = "";
  if (
    contact.company_domain ||
    contact.company_industry ||
    contact.company_description ||
    contact.company_type ||
    contact.location ||
    contact.company_linkedin_url
  ) {
    enrichmentDetails = `

Enrichment Details:
${contact.company_domain ? `- Company Domain: ${contact.company_domain}` : ""}
${contact.company_industry ? `- Company Industry: ${contact.company_industry}` : ""}
${contact.company_type ? `- Company Type: ${contact.company_type}` : ""}
${contact.location ? `- Location: ${contact.location}` : ""}
${contact.company_linkedin_url ? `- Company LinkedIn URL: ${contact.company_linkedin_url}` : ""}
${contact.company_description ? `- Company Description: ${contact.company_description}` : ""}`;
  }

  // Build enrichment data section for fields from Apollo JSONB
  let enrichedProfileDetails = "";
  const enrichedFields: string[] = [];
  if (contact.employees)
    enrichedFields.push(`- Company Employees: ${contact.employees}`);
  if (contact.seniority)
    enrichedFields.push(`- Seniority Level: ${contact.seniority}`);
  if (contact.total_years_of_experience)
    enrichedFields.push(
      `- Total Years of Experience: ${contact.total_years_of_experience}`
    );
  if (contact.annual_revenue)
    enrichedFields.push(`- Company Annual Revenue: ${contact.annual_revenue}`);
  if (contact.market_cap)
    enrichedFields.push(`- Company Market Cap: ${contact.market_cap}`);
  if (contact.founded_year)
    enrichedFields.push(`- Company Founded Year: ${contact.founded_year}`);
  if (enrichedFields.length > 0) {
    enrichedProfileDetails = `\n\nEnriched Profile Data:\n${enrichedFields.join("\n")}`;
  }

  return `Act as a professional networking expert. Given this profile, calculate a fair introduction referral payout in USD price.

Contact Information:
- Full Name: ${fullName}
- Company Name: ${contact.company || "Not provided"}
- Job Title: ${contact.title || "Not provided"}
- LinkedIn URL: ${contact.linkedin || "Not provided"}
${contact.linkedin_connections ? `- LinkedIn Connections: ${contact.linkedin_connections}` : ""}- Industry: ${contact.industry || "Not provided"}
- Website: ${contact.website || "Not provided"}${enrichmentDetails}${enrichedProfileDetails}${researchInstructions}

Consider the following factors:
- Role seniority (CEO, VP, Director, Manager, etc.)
- Company stage (startup, growth, established, enterprise)
- Company size, revenue, and market valuation (research this if company name is provided)
- Industry relevance and market value
- Network size and influence (LinkedIn connections count - higher connections often indicates more valuable network)
- Professional visibility and network influence (research LinkedIn profile if URL is provided)
- Recent achievements, news, or notable connections
- Company domain authority and online presence
- Company description and business model

${hasLinkedIn || hasCompany ? "Use your web search capabilities to gather current, accurate information about the company and person before calculating the referral payout." : ""}

CRITICAL: Return ONLY valid JSON with a whole number (no decimals). Do not include any explanatory text, markdown formatting, or additional commentary. Just the raw JSON object.
Format: {"bounty_amount": <number>}`;
}

/**
 * Build batched prompt for multiple contacts
 */
function buildBatchedPrompt(contacts: BountyContactData[]): string {
  const contactPrompts = contacts.map((contact, index) => {
    const prompt = buildContactPrompt(contact);
    return `Contact ${index + 1}:\n${prompt}`;
  });

  // Check if any contact has LinkedIn or company info using the same validation helper
  const hasAnyResearchableData = contacts.some(
    (c) => hasResearchableData(c).isValid
  );

  return `You are a professional networking expert. Calculate fair introduction bounties in USD for the following contacts. Return a JSON array where each element corresponds to the contact at the same index.

${hasAnyResearchableData ? "IMPORTANT: For contacts with LinkedIn URLs or company names, use your web search capabilities to research current information about the company and person before calculating bounties. This will ensure accurate, data-driven bounty amounts.\n\n" : ""}${contactPrompts.join("\n\n---\n\n")}

CRITICAL: Return ONLY a valid JSON array. Do not include any explanatory text, markdown formatting, code blocks, or additional commentary. Just the raw JSON array.
Format: [{"bounty_amount": <number>}, {"bounty_amount": <number>}, ...]`;
}

/**
 * Parse JSON response from Gemini API
 */
function parseBountyResponse(
  text: string,
  contactIndex?: number
): number | null {
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = text.match(
      /```(?:json)?\s*(\[[\s\S]*\]|\{[\s\S]*\})\s*```/
    );
    const jsonText = jsonMatch ? jsonMatch[1] : text.trim();

    // Try parsing as array first (for batched responses)
    if (jsonText.trim().startsWith("[")) {
      const array = JSON.parse(jsonText) as GeminiBountyResponse[];
      if (contactIndex !== undefined && array[contactIndex]) {
        const bounty = array[contactIndex].bounty_amount;
        return typeof bounty === "number" && !isNaN(bounty)
          ? Math.round(bounty)
          : null;
      }
      // If no index provided, return first item
      if (array.length > 0 && array[0].bounty_amount !== undefined) {
        const bounty = array[0].bounty_amount;
        return typeof bounty === "number" && !isNaN(bounty)
          ? Math.round(bounty)
          : null;
      }
    }

    // Try parsing as single object
    const parsed = JSON.parse(jsonText) as GeminiBountyResponse;
    if (parsed.bounty_amount !== undefined) {
      const bounty = parsed.bounty_amount;
      return typeof bounty === "number" && !isNaN(bounty)
        ? Math.round(bounty)
        : null;
    }

    return null;
  } catch (error) {
    logger.warn(
      `JSON parse failed, attempting regex fallback. Error: ${error instanceof Error ? error.message : "Unknown error"}. Response: ${text.substring(0, 200)}`
    );

    // Regex fallback: extract bounty from text responses
    return extractBountyFromText(text);
  }
}

/**
 * Extract bounty amount from text when JSON parsing fails.
 * Handles cases where Gemini returns prose instead of JSON (common with Google Search grounding).
 */
function extractBountyFromText(text: string): number | null {
  // Pattern 1: JSON-like pattern embedded in text — "bounty_amount": 500
  const jsonPattern = /"bounty_amount"\s*:\s*(\d+)/;
  const jsonMatch = text.match(jsonPattern);
  if (jsonMatch) {
    const value = parseInt(jsonMatch[1], 10);
    if (!isNaN(value) && value >= 0) return value;
  }

  // Pattern 2: Dollar amount — $500 or $1,000
  const dollarPattern = /\$\s*(\d[\d,]*)/;
  const dollarMatch = text.match(dollarPattern);
  if (dollarMatch) {
    const value = parseInt(dollarMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(value) && value >= 0) return value;
  }

  // Pattern 3: Number near "bounty" keyword — "bounty of 500" or "bounty: 500"
  const bountyKeywordPattern = /bounty[\s\S]{0,30}?(\d[\d,]*)/i;
  const bountyMatch = text.match(bountyKeywordPattern);
  if (bountyMatch) {
    const value = parseInt(bountyMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(value) && value >= 0) return value;
  }

  logger.error(
    `Failed to extract bounty from text response. Response: ${text.substring(0, 300)}`
  );
  return null;
}

/**
 * Call Gemini API for a batch of contacts
 */
async function callGeminiAPI(
  prompt: string,
  contacts: (BountyContactData | ContactImportRow)[] | undefined,
  retries: number,
  options?: GeminiBountyCallOptions
): Promise<string> {
  if (!geminiConfig.apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const url = `${geminiConfig.apiUrl}?key=${geminiConfig.apiKey}`;
  const modelId = geminiModelIdFromApiUrl(geminiConfig.apiUrl);
  const runStarted = Date.now();
  const log = options?.aiUsageLogger;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Check if any contacts have LinkedIn or company info that would benefit from web search
      // Use the same validation helper for consistency
      const shouldEnableWebSearch = contacts
        ? contacts.some((c) => hasResearchableData(c).isValid)
        : prompt.includes("LinkedIn URL:") &&
          (prompt.includes("http") || prompt.includes("linkedin.com"));

      // Prepare request body with optional web search tool and max tokens
      const requestBody: {
        contents: Array<{
          parts: Array<{ text: string }>;
        }>;
        tools?: Array<{ googleSearch: Record<string, never> }>;
        generationConfig?: {
          maxOutputTokens: number;
          responseMimeType?: string;
        };
      } = {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: geminiConfig.maxTokens,
          // responseMimeType is incompatible with googleSearch tool (controlled generation not supported)
          // Only enforce JSON output when web search is disabled; regex fallback handles text responses
          ...(!shouldEnableWebSearch && {
            responseMimeType: "application/json",
          }),
        },
      };

      // Enable web search/grounding when LinkedIn URLs or company names are available
      // This allows Gemini to search the internet for current company and person information
      if (shouldEnableWebSearch) {
        requestBody.tools = [
          {
            googleSearch: {},
          },
        ];
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();

        if (isTransientHttpResponse(response) && attempt < retries) {
          const delay = retryAfterDelayMs(
            response.headers.get("Retry-After"),
            attempt
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as GeminiContentResponse;

      logger.log("Gemini API response:", JSON.stringify(data, null, 2));
      if (data.error) {
        throw new Error(
          `Gemini API error: ${data.error.message || "Unknown error"}`
        );
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      const tok = tokensFromGeminiUsageMetadata(data.usageMetadata);
      void log?.logUsage({
        trackingData: options?.trackingData,
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
      if (attempt === retries) {
        const message = error instanceof Error ? error.message : String(error);
        void log?.logUsage({
          trackingData: options?.trackingData,
          provider: AI_PROVIDER_GEMINI,
          model: modelId,
          status: "failure",
          errorMessage: message,
          responseTimeMs: Date.now() - runStarted,
          retryCount: Math.max(0, attempt - 1),
        });
        throw error;
      }

      const delay = retryAfterDelayMs(null, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Failed to call Gemini API after retries");
}

/**
 * Calculate bounty amounts for a batch of contacts
 */
async function calculateBountyBatch(
  contacts: (BountyContactData | ContactImportRow)[],
  options?: GeminiBountyCallOptions
): Promise<Map<number, number>> {
  const results = new Map<number, number>();

  if (contacts.length === 0) {
    return results;
  }

  const prompt = buildBatchedPrompt(contacts);
  const response = await callGeminiAPI(prompt, contacts, 3, options);

  // Parse response for each contact
  let successfulParses = 0;
  for (let i = 0; i < contacts.length; i++) {
    const bounty = parseBountyResponse(response, i);
    if (bounty !== null && bounty >= 0) {
      results.set(i, bounty);
      successfulParses++;
    }
  }

  // If we couldn't parse ANY bounties from the response, throw an error
  // This indicates Gemini returned invalid JSON (like plain text)
  if (successfulParses === 0) {
    throw new Error(
      `Failed to parse any valid referral payout amounts from Gemini response. Response may be in wrong format (expected JSON, got text).`
    );
  }

  // If we only parsed some bounties, set the rest to 0 but log a warning
  if (successfulParses < contacts.length) {
    logger.warn(
      `Only parsed ${successfulParses}/${contacts.length} bounties from Gemini response. Setting remaining to 0.`
    );
    for (let i = 0; i < contacts.length; i++) {
      if (!results.has(i)) {
        results.set(i, 0);
      }
    }
  }

  return results;
}
/**
 * Calculate bounty amounts for contacts using Gemini API
 * Batches contacts for efficient API usage
 * Only processes contacts that have company name OR LinkedIn URL to save tokens
 *
 * @param contacts - Array of contacts to calculate bounties for
 * @returns Map of contact index to bounty amount
 */
export async function calculateBountyAmounts(
  contacts: (BountyContactData | ContactImportRow)[],
  options?: GeminiBountyCallOptions
): Promise<Map<number, number>> {
  const results = new Map<number, number>();

  // Check feature flag first - if disabled, skip all bounty calculation and API calls
  if (!geminiConfig.bountyCalculationEnabled) {
    logger.warn(
      "Gemini referral payout calculation feature flag is disabled. Setting all referral payout amounts to 0."
    );
    // Set all to 0 if bounty calculation feature is disabled
    for (let i = 0; i < contacts.length; i++) {
      results.set(i, 0);
    }
    return results;
  }

  if (!geminiConfig.enabled) {
    logger.warn(
      "Gemini API is not enabled. Setting all referral payout amounts to 0."
    );
    // Set all to 0 if Gemini is disabled
    for (let i = 0; i < contacts.length; i++) {
      results.set(i, 0);
    }
    return results;
  }

  if (contacts.length === 0) {
    return results;
  }

  // Filter contacts to only include those with company name OR LinkedIn URL
  // This saves API tokens and ensures we only calculate bounties when we have enough context
  // Validation happens BEFORE any API calls to prevent unnecessary requests
  const contactsWithResearchableData: Array<{
    contact: ContactImportRow;
    originalIndex: number;
  }> = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const validation = hasResearchableData(contact);
    if (validation.isValid) {
      contactsWithResearchableData.push({
        contact,
        originalIndex: i,
      });
    } else {
      // Set default bounty of 0 for contacts without company or LinkedIn
      results.set(i, 0);
      const contactName =
        `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
        "Unknown";
      const skipReasons: string[] = [];
      if (!validation.hasCompany) {
        skipReasons.push("missing company name");
      }
      if (!validation.hasLinkedIn) {
        skipReasons.push("missing LinkedIn URL");
      }

      logger.debug(
        `Skipping Gemini API call for contact ${i} (${contactName}) - ${skipReasons.join(" and ")}`
      );
    }
  }

  // Early return guard: If no contacts have researchable data, return immediately
  // This prevents any API calls from being made when there's no valid data to process
  if (contactsWithResearchableData.length === 0) {
    return results;
  }

  // Process contacts with researchable data in batches
  const { batchSize } = geminiConfig;
  const researchableContacts = contactsWithResearchableData.map(
    (item) => item.contact
  );

  for (let i = 0; i < researchableContacts.length; i += batchSize) {
    const batch = researchableContacts.slice(i, i + batchSize);
    const batchResults = await calculateBountyBatch(batch, options);

    // Map batch indices back to original contact indices
    for (const [batchIndex, bounty] of batchResults.entries()) {
      const researchableIndex = i + batchIndex;
      const { originalIndex } = contactsWithResearchableData[researchableIndex];
      results.set(originalIndex, bounty);
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < researchableContacts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
