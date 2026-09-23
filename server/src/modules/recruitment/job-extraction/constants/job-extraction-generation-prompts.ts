import type { GenerateWithAiDto } from "../job-extraction.dto";

export const JOB_GENERATION_INSTRUCTIONS = `
INSTRUCTIONS:
- Generate professional, engaging, and inclusive job description content
- Description should be 2-3 paragraphs introducing the role and team
- Requirements should clearly separate required and preferred qualifications using bullet points (•)
- Responsibilities should be a bulleted list with proper bullet points (•) for 5-7 key duties
- Benefits should highlight competitive perks and work-life balance using bullet points (•)
- Use \\n for line breaks within string values
- Keep content professional but approachable
- Tailor the tone to match the experience level
- Use proper bullet points (•) instead of asterisks (*) for all lists`;

export const JOB_GENERATION_JSON_SCHEMA = `{
  "description": "",
  "requirements": "",
  "responsibilities": "",
  "benefits": ""
}`;

export const JOB_GENERATION_CRITICAL_INSTRUCTIONS = `CRITICAL: Return ONLY syntactically valid JSON (no markdown wrapper or code fences). Every newline inside a string value MUST be written as \\n so the output is one parseable JSON object. Respond only with JSON that exactly matches JOB_GENERATION_JSON_SCHEMA.`;

/**
 * Sanitizes a string value to prevent prompt injection
 */
function sanitizeString(value: string, maxLength = 200): string {
  return value
    .replace(/[\r\n]/g, " ") // Remove newlines
    .replace(/[`]/g, "") // Remove backticks
    .replace(/\${/g, "\\${") // Escape template literals
    .slice(0, maxLength) // Limit length
    .trim();
}

export function buildGenerationPrompt(data: GenerateWithAiDto): string {
  // Create sanitized job details object
  const jobDetails = {
    title: sanitizeString(data.title, 200),
    industry: sanitizeString(data.industryName || "Not specified", 100),
    department: sanitizeString(data.departmentName || "Not specified", 100),
    experienceLevel: sanitizeString(data.experienceLevel, 50),
    workType: sanitizeString(data.workType, 50),
    location: sanitizeString(data.location, 100),
    requiredSkills: data.requiredSkills
      .slice(0, 5)
      .map((skill) => sanitizeString(skill, 50)),
    preferredSkills: data.preferredSkills
      .slice(0, 3)
      .map((skill) => sanitizeString(skill, 50)),
  };

  return `You are an expert job description writer. Generate compelling and professional job description content based on the provided job details.

JOB DETAILS: ${JSON.stringify(jobDetails)}

${JOB_GENERATION_INSTRUCTIONS}
${JOB_GENERATION_CRITICAL_INSTRUCTIONS}
${JOB_GENERATION_JSON_SCHEMA}`;
}
