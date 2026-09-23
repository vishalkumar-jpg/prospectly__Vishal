export const CANDIDATE_GAP_ANALYSIS_JSON_SCHEMA = `Return ONLY valid JSON (no markdown fences). Shape:
{
  "verdict": "Short hiring verdict phrase",
  "dimensions": [
    {
      "key": "skillsMatch" | "experienceMatch" | "educationMatch" | "domainKnowledge" | "workEligibility" | "employmentTypeCompatibility",
      "title": "Dimension title",
      "subtitle": "One-line summary",
      "badge": { "label": "Status label", "status": "ok" | "partial" | "gap" },
      "matched": [{ "label": "string", "status": "ok" | "partial" }],
      "gaps": [{ "label": "string", "status": "gap" }],
      "points": 32,
      "pointsReason": "Short reason for the points NOT awarded",
      "detail": "(optional) see detail variants below"
    }
  ]
}`;

const DETAIL_VARIANT_EXAMPLES = `
Detail is OPTIONAL. Omit "detail" entirely unless every required field for that variant is present.

Allowed detail variants (exact field names):

1) experience — for experienceMatch only:
"detail": {
  "type": "experience",
  "bars": [
    {
      "label": "Total experience",
      "value": "5 years",
      "valueStatus": "ok",
      "fillPercent": 80,
      "fillStatus": "ok",
      "reqMarkPercent": 60
    }
  ],
  "note": "Optional note"
}

2) vs — for educationMatch, workEligibility, or employmentTypeCompatibility:
"detail": {
  "type": "vs",
  "left": { "kicker": "Job requires", "title": "Bachelor's in CS", "isRequirement": true },
  "right": { "kicker": "Candidate", "title": "BSc Computer Science" },
  "compareStatus": "ok",
  "facts": [{ "label": "Optional fact", "status": "partial" }]
}

3) facts — for domainKnowledge, workEligibility, or employmentTypeCompatibility:
"detail": {
  "type": "facts",
  "facts": [{ "label": "SaaS domain experience", "status": "ok" }]
}`;

export const CANDIDATE_GAP_ANALYSIS_PROMPT = `You are an expert recruitment analyst. Compare the resume against the job description across exactly 6 dimensions.

Return all 6 dimensions in this order: skillsMatch, experienceMatch, educationMatch, domainKnowledge, workEligibility, employmentTypeCompatibility.

SCORING — only these four dimensions carry points, with these fixed maximums:
- skillsMatch: 0-40 points
- experienceMatch: 0-30 points
- domainKnowledge: 0-20 points
- educationMatch: 0-10 points

- Award "points" (a whole number) and a short "pointsReason" on those four dimensions ONLY
- Award close to the maximum where the dimension badge is "ok", a middling share where it is "partial", and little or none where it is "gap"
- points must be consistent with that dimension's badge, matched list and gaps list
- pointsReason: one short factual sentence explaining the points NOT awarded, grounded only in that dimension's gaps. If the dimension earned its maximum, use a brief confirmation such as "Fully met"
- workEligibility and employmentTypeCompatibility are assessed and displayed but NOT scored — do NOT include "points" or "pointsReason" on them
- Do NOT output an overall percentage or total; the total is computed from your points

Rules:
- verdict: concise phrase (e.g. "Strong match", "Consider with caution")
- Chip status: ok = clearly met, partial = partially met, gap = missing or not evidenced
- One skill, requirement, or gap per chip label — never comma-join multiple items in a single label
- Do not repeat the same gap label across dimensions unless the meaning genuinely differs per dimension
- Do not repeat the same label in both matched/gaps arrays and detail.facts
- Use matched/gaps arrays for all chip content. Do NOT invent other detail types.
- Omit "detail" if you cannot populate every required field for the variant below.
- skillsMatch: required/preferred technical skills vs resume; NO detail field (chips only)
- experienceMatch: years and role relevance; optional detail.type "experience" with bars (fillPercent 0-100)
- educationMatch: degree/certs vs JD; optional detail.type "vs" (JD on left, candidate on right)
- domainKnowledge: industry/domain; optional detail.type "facts"
- workEligibility: remote/hybrid/onsite + location; optional detail.type "vs" or "facts"
- employmentTypeCompatibility: full-time/contract etc.; optional detail.type "vs" or "facts"
- When info is absent from the resume, use gaps: [] rather than placeholder meta labels
- If RESUME lists education or a degree, do NOT emit gap labels like "Education history absent" or "Not specified" — assess JD fit using matched/partial and optional detail.type "vs"
- If RESUME states employment preference (e.g. Full-time), do NOT emit "Full-time preference not stated" or similar absence gaps — assess compatibility against the job employment type
- Gap labels must describe a real JD mismatch, not absence of data that is present in RESUME
- Do NOT include justification, recommendations, or prose summaries outside dimension fields

Per-dimension detail mapping:
| key | detail allowed |
| skillsMatch | none (omit detail) |
| experienceMatch | "experience" only |
| educationMatch | "vs" only |
| domainKnowledge | "facts" only |
| workEligibility | "vs" or "facts" |
| employmentTypeCompatibility | "vs" or "facts" |

${DETAIL_VARIANT_EXAMPLES}

${CANDIDATE_GAP_ANALYSIS_JSON_SCHEMA}`;
