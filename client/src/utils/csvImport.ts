// Utility functions for CSV/Excel import with intelligent field mapping

import { AnyType } from "@/types/common";

export interface FieldMapping {
  csvField: string;
  dbField: string;
  confidence: number; // 0-1 confidence score
  required: boolean;
}

export interface ImportPreview {
  headers: string[];
  sampleData: Record<string, string>[];
  suggestedMappings: FieldMapping[];
  warnings: string[];
  totalRows: number;
}

// Database field definitions with their common variations
export const DB_FIELDS = {
  first_name: {
    required: true,
    variations: [
      "first_name",
      "firstname",
      "first name",
      "fname",
      "given_name",
      "forename",
      "first",
      "name_first",
      "christian_name",
      "prenom",
      // iPhone/Apple variations
      "given name",
      "first_name_display",
      // Salesforce variations
      "firstname",
      "contact_first_name",
      "lead_first_name",
      // HubSpot variations
      "first name",
      "firstname",
    ],
  },
  last_name: {
    required: true,
    variations: [
      "last_name",
      "lastname",
      "last name",
      "lname",
      "surname",
      "family_name",
      "last",
      "name_last",
      "nom",
      "apellido",
      // iPhone/Apple variations
      "family name",
      "last_name_display",
      // Salesforce variations
      "lastname",
      "contact_last_name",
      "lead_last_name",
      // HubSpot variations
      "last name",
      "lastname",
    ],
  },
  email: {
    required: true,
    variations: [
      "email",
      "email_address",
      "email address",
      "e_mail",
      "e-mail",
      "mail",
      "primary_email",
      "work_email",
      "business_email",
      "contact_email",
      // iPhone/Apple variations
      "email_address",
      "primary email",
      "work email",
      // Salesforce variations
      "email",
      "contact_email__c",
      "lead_email__c",
      "emailaddress",
      // HubSpot variations
      "email",
      "hs_email_domain",
      "work_email",
    ],
  },
  phone_number: {
    required: false,
    variations: [
      "phone",
      "phone_number",
      "phone number",
      "telephone",
      "mobile",
      "cell",
      "work_phone",
      "business_phone",
      "primary_phone",
      "tel",
      "telefono",
      // iPhone/Apple variations
      "phone_number",
      "mobile phone",
      "work phone",
      "home phone",
      // Salesforce variations
      "phone",
      "mobilephone",
      "homephone",
      "workphone",
      "contact_phone__c",
      // HubSpot variations
      "phone",
      "mobilephone",
      "hs_phone_number",
    ],
  },
  company: {
    required: false,
    variations: [
      "company",
      "company_name",
      "company name",
      "organization",
      "employer",
      "workplace",
      "business",
      "firm",
      "corporation",
      "org",
      "empresa",
      // iPhone/Apple variations
      "organization",
      "company_name",
      "work organization",
      // Salesforce variations
      "company",
      "account_name",
      "account.name",
      "lead_company__c",
      "account__c",
      // HubSpot variations
      "company",
      "company_name",
      "hs_company_name",
      "associatedcompanyid",
    ],
  },
  title: {
    required: false,
    variations: [
      "title",
      "job_title",
      "job title",
      "position",
      "role",
      "designation",
      "job_position",
      "work_title",
      "professional_title",
      "cargo",
      "puesto",
      // iPhone/Apple variations
      "job_title",
      "title",
      "work title",
      // Salesforce variations
      "title",
      "contact_title__c",
      "lead_title__c",
      "jobtitle",
      // HubSpot variations
      "jobtitle",
      "hs_job_title",
      "job_title",
    ],
  },
  industry: {
    required: false,
    variations: [
      "industry",
      "sector",
      "business_type",
      "field",
      "domain",
      "vertical",
      "business_sector",
      "market",
      "industria",
      // Salesforce variations
      "industry",
      "account.industry",
      "lead_industry__c",
      "company_industry__c",
      // HubSpot variations
      "industry",
      "hs_industry",
      "company_industry",
    ],
  },
  city: {
    required: false,
    variations: [
      "city",
      "town",
      "locality",
      "municipality",
      "ciudad",
      "ville",
      // iPhone/Apple variations
      "city",
      "work city",
      "home city",
      // Salesforce variations
      "mailingcity",
      "othercity",
      "city",
      "contact_city__c",
      // HubSpot variations
      "city",
      "hs_city",
    ],
  },
  state: {
    required: false,
    variations: [
      "state",
      "province",
      "region",
      "estado",
      "provincia",
      "territory",
      // iPhone/Apple variations
      "state",
      "work state",
      "home state",
      // Salesforce variations
      "mailingstate",
      "otherstate",
      "state",
      "contact_state__c",
      // HubSpot variations
      "state",
      "hs_state",
    ],
  },
  country: {
    required: false,
    variations: [
      "country",
      "nation",
      "pais",
      "pays",
      "nationality",
      // iPhone/Apple variations
      "country",
      "work country",
      "home country",
      // Salesforce variations
      "mailingcountry",
      "othercountry",
      "country",
      "contact_country__c",
      // HubSpot variations
      "country",
      "hs_country",
    ],
  },
  linkedin: {
    required: false,
    variations: [
      "linkedin",
      "linkedin_url",
      "linkedin url",
      "linkedin_profile",
      "li_url",
      "linkedin link",
      "social_profile",
      "linkedin_id",
      // Salesforce variations
      "linkedin_url__c",
      "social_profile__c",
      "linkedin_profile__c",
      // HubSpot variations
      "linkedinbio",
      "hs_linkedin_url",
      "linkedin_profile",
    ],
  },
  website: {
    required: false,
    variations: [
      "website",
      "website_url",
      "web",
      "url",
      "homepage",
      "site",
      "web_url",
      "company_website",
      "personal_website",
      "web_address",
      // iPhone/Apple variations
      "url",
      "website",
      "homepage",
      // Salesforce variations
      "website",
      "account.website",
      "company_website__c",
      // HubSpot variations
      "website",
      "hs_website",
      "company_domain",
    ],
  },
  secondary_email: {
    required: false,
    variations: [
      "secondary_email",
      "second_email",
      "personal_email",
      "alternate_email",
      "backup_email",
      "other_email",
      "email_2",
      "home_email",
      // iPhone/Apple variations
      "alternate email",
      "secondary email",
      "personal email",
      // Salesforce variations
      "alternate_email__c",
      "personal_email__c",
      "secondary_email__c",
      // HubSpot variations
      "hs_additional_emails",
      "secondary_email",
    ],
  },
};

/** Ordered keys matching DB_FIELDS (stable template column order). */
const CONTACT_IMPORT_DB_FIELD_ORDER = Object.keys(
  DB_FIELDS
) as (keyof typeof DB_FIELDS)[];

/**
 * Human-readable headers for the official download template (Title Case, spaces).
 * Upload parsing maps these back to snake_case via {@link normalizeContactImportHeaders}.
 */
export const CONTACT_CSV_TEMPLATE_DISPLAY_HEADERS: Record<
  keyof typeof DB_FIELDS,
  string
> = {
  first_name: "First Name",
  last_name: "Last Name",
  email: "Email",
  phone_number: "Phone Number",
  company: "Company",
  title: "Title",
  industry: "Industry",
  city: "City",
  state: "State",
  country: "Country",
  linkedin: "LinkedIn",
  website: "Website",
  secondary_email: "Secondary Email",
};

/** Header row for CSV template downloads (same order as backend fields). */
export function getContactCsvTemplateHeaders(): string[] {
  return CONTACT_IMPORT_DB_FIELD_ORDER.map(
    (key) => CONTACT_CSV_TEMPLATE_DISPLAY_HEADERS[key]
  );
}

function normalizeImportHeaderKey(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const NORMALIZED_HEADER_TO_DB_FIELD: Map<string, keyof typeof DB_FIELDS> =
  (() => {
    const map = new Map<string, keyof typeof DB_FIELDS>();
    for (const dbField of CONTACT_IMPORT_DB_FIELD_ORDER) {
      map.set(normalizeImportHeaderKey(dbField), dbField);
      map.set(
        normalizeImportHeaderKey(CONTACT_CSV_TEMPLATE_DISPLAY_HEADERS[dbField]),
        dbField
      );
    }
    return map;
  })();

/**
 * Maps official template headers (and legacy snake_case) to DB field names so
 * mapping/transform logic always sees snake_case keys the API expects.
 */
export function normalizeContactImportHeaders(headers: string[]): string[] {
  const mapped = headers.map((h) => {
    const db = NORMALIZED_HEADER_TO_DB_FIELD.get(normalizeImportHeaderKey(h));
    return db ?? h;
  });

  const outputToOriginals = new Map<string, Set<string>>();
  headers.forEach((original, i) => {
    const out = mapped[i];
    let set = outputToOriginals.get(out);
    if (!set) {
      set = new Set<string>();
      outputToOriginals.set(out, set);
    }
    set.add(original);
  });

  for (const [outKey, originals] of outputToOriginals) {
    if (originals.size > 1) {
      const list = [...originals].join(", ");
      throw new Error(
        `Conflicting CSV columns map to the same field "${outKey}": ${list}`
      );
    }
  }

  return mapped;
}

/**
 * Human-readable column title for import UI (template / snake_case keys stay
 * internal; this is for tables and labels only).
 */
export function formatContactImportHeaderForDisplay(header: string): string {
  if (Object.prototype.hasOwnProperty.call(DB_FIELDS, header)) {
    return CONTACT_CSV_TEMPLATE_DISPLAY_HEADERS[
      header as keyof typeof DB_FIELDS
    ];
  }
  return header
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// Calculate similarity between two strings using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Intelligent field mapping
export function suggestFieldMappings(headers: string[]): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const usedHeaders = new Set<string>();

  // For each database field, find the best matching header
  Object.entries(DB_FIELDS).forEach(([dbField, config]) => {
    let bestMatch: { header: string; confidence: number } | null = null;

    headers.forEach((header) => {
      if (usedHeaders.has(header)) return;

      const headerLower = header.toLowerCase().trim();

      // Check exact matches first
      const exactMatch = config.variations.find(
        (variation) => variation.toLowerCase() === headerLower
      );

      if (exactMatch) {
        bestMatch = { header, confidence: 1.0 };
        return;
      }

      // Check partial matches
      config.variations.forEach((variation) => {
        const similarity = calculateSimilarity(headerLower, variation);

        // Also check if header contains the variation or vice versa
        const containsMatch =
          headerLower.includes(variation.toLowerCase()) ||
          variation.toLowerCase().includes(headerLower);

        const adjustedSimilarity = containsMatch
          ? Math.max(similarity, 0.8)
          : similarity;

        if (
          adjustedSimilarity > 0.6 &&
          (!bestMatch || adjustedSimilarity > bestMatch.confidence)
        ) {
          bestMatch = { header, confidence: adjustedSimilarity };
        }
      });
    });

    if (bestMatch && bestMatch.confidence > 0.6) {
      mappings.push({
        csvField: bestMatch.header,
        dbField,
        confidence: bestMatch.confidence,
        required: config.required,
      });
      usedHeaders.add(bestMatch.header);
    } else if (config.required) {
      // Add unmapped required fields
      mappings.push({
        csvField: "",
        dbField,
        confidence: 0,
        required: true,
      });
    }
  });

  return mappings.sort((a, b) => b.confidence - a.confidence);
}

// Parse CSV content
export function parseCSV(content: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error("Empty CSV file");
  }

  const headers = parseCSVLine(lines[0]);
  if (headers.length > 0 && headers[0]) {
    headers[0] = headers[0].replace(/^\uFEFF/, "");
  }
  const rows = lines.slice(1).map((line) => parseCSVLine(line));

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone format
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

// Clean and format phone number
export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

// Generate import preview
export function generateImportPreview(
  headers: string[],
  rows: string[][],
  mappings?: FieldMapping[]
): ImportPreview {
  const suggestedMappings = mappings || suggestFieldMappings(headers);
  const warnings: string[] = [];

  // Check for required fields
  const requiredFields = Object.entries(DB_FIELDS)
    .filter(([_, config]) => config.required)
    .map(([field]) => field);

  const mappedRequiredFields = suggestedMappings
    .filter((m) => m.required && m.csvField && m.confidence > 0.6)
    .map((m) => m.dbField);

  const missingRequired = requiredFields.filter(
    (field) => !mappedRequiredFields.includes(field)
  );

  if (missingRequired.length > 0) {
    warnings.push(`Missing required fields: ${missingRequired.join(", ")}`);
  }

  // Generate sample data (all rows, not just first 5)
  const sampleData = rows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || "";
    });
    return record;
  });

  // Validate sample data
  const emailMapping = suggestedMappings.find((m) => m.dbField === "email");
  if (emailMapping && emailMapping.csvField) {
    const emailIndex = headers.indexOf(emailMapping.csvField);
    const invalidEmails = sampleData.filter((record) => {
      const email = record[emailMapping.csvField];
      return email && !isValidEmail(email);
    });

    if (invalidEmails.length > 0) {
      warnings.push(
        `Found ${invalidEmails.length} rows with invalid email formats in sample`
      );
    }
  }

  return {
    headers,
    sampleData,
    suggestedMappings,
    warnings,
    totalRows: rows.length,
  };
}

// Transform row data according to mappings
export function transformRowData(
  row: string[],
  headers: string[],
  mappings: FieldMapping[]
): Record<string, AnyType> {
  const transformedData: Record<string, AnyType> = {};

  mappings.forEach((mapping) => {
    if (!mapping.csvField) return;

    const index = headers.indexOf(mapping.csvField);
    if (index === -1) return;

    let value = row[index]?.trim() || "";

    // Apply field-specific transformations
    switch (mapping.dbField) {
      case "email":
      case "secondary_email":
        value = value.toLowerCase();
        break;
      case "phone_number":
        value = formatPhoneNumber(value);
        break;
      case "first_name":
      case "last_name":
        value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        break;
    }

    if (value) {
      transformedData[mapping.dbField] = value;
    }
  });

  return transformedData;
}
