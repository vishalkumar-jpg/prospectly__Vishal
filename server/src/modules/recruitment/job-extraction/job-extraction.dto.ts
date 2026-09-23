import { IsString, IsUrl, MaxLength } from "class-validator";

export interface ExtractedJobData {
  title: string;
  companyName: string;
  industry: string;
  department: string;
  experienceLevel: string;
  workType: string;
  /** Contractual terms — "" when the document did not state them. */
  employmentType: string;
  location: string;
  description: string;
  requirements: string;
  responsibilities: string;
  benefits: string;
  requiredSkills: string[];
  preferredSkills: string[];
  salaryRangeMin: number;
  salaryRangeMax: number;
}

export const ALLOWED_MIMETYPES = ["application/pdf"];

export const ALLOWED_EXTENSIONS = [".pdf"];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export class ExtractJobFromUrlDto {
  @IsString()
  @MaxLength(2000)
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  url!: string;
}

export class GenerateWithAiDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  industryName?: string;

  @IsString()
  departmentName?: string;

  @IsString()
  experienceLevel!: string;

  @IsString()
  workType!: string;

  @IsString()
  location!: string;

  @IsString({ each: true })
  requiredSkills!: string[];

  @IsString({ each: true })
  preferredSkills!: string[];
}

export interface GeneratedJobDescription {
  description: string;
  requirements: string;
  responsibilities: string;
  benefits: string;
}
