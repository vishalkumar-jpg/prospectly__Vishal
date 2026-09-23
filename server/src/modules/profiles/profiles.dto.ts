import {
  IsOptional,
  MaxLength,
  Length,
  Matches,
  IsUrl,
  IsNotEmpty,
  IsNumber,
  IsPhoneNumber,
  IsIn,
  ValidateIf,
  IsBoolean,
  Equals,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";
import { SUPPORTED_PAYOUT_COUNTRIES } from "config/payment.config";

export class UpdateProfileInformationDto {
  @ApiPropertyOptional({
    example: "John",
    description: "First name (2-50 chars, letters only)",
  })
  @IsOptional()
  @TrimString()
  @Length(2, 50, { message: "First name must be between 2 and 50 characters" })
  @Matches(/^[A-Za-z\s'-]+$/, {
    message:
      "First name can only contain letters, spaces, hyphens, and apostrophes",
  })
  firstName?: string;

  @ApiPropertyOptional({
    example: "Doe",
    description: "Last name (2-50 chars, letters only)",
  })
  @IsOptional()
  @TrimString()
  @Length(2, 50, { message: "Last name must be between 2 and 50 characters" })
  @Matches(/^[A-Za-z\s'-]+$/, {
    message:
      "Last name can only contain letters, spaces, hyphens, and apostrophes",
  })
  lastName?: string;

  @ApiPropertyOptional({
    example: "VP of Sales",
    description: "Job title (max 50 chars)",
  })
  @IsOptional()
  @TrimString()
  @MaxLength(50, { message: "Job title must not exceed 50 characters" })
  jobTitle?: string;

  @ApiPropertyOptional({
    example: "Acme Corporation",
    description: "Company name (max 50 chars)",
  })
  @TrimString()
  @IsOptional()
  @MaxLength(50, { message: "Company name must not exceed 50 characters" })
  company?: string;

  @ApiPropertyOptional({
    example: "SaaS",
    description: "Industry (max 100 chars)",
  })
  @TrimString()
  @IsOptional()
  @MaxLength(100, { message: "Industry must not exceed 100 characters" })
  industry?: string;

  @ApiPropertyOptional({
    example: "San Francisco, CA",
    description: "Location (max 50 chars)",
  })
  @TrimString()
  @IsOptional()
  @MaxLength(50, { message: "Location must not exceed 50 characters" })
  location?: string;

  @ApiPropertyOptional({
    example: "IN",
    description:
      "ISO 3166-1 alpha-2 payout country. Supported: US, IN, PH, MX, ZA.",
  })
  @TrimString()
  @IsOptional()
  @IsIn([...SUPPORTED_PAYOUT_COUNTRIES], {
    message: "Country must be one of: US, IN, PH, MX, ZA",
  })
  country?: string;

  @ApiPropertyOptional({
    example: "Experienced sales professional with 10+ years in B2B SaaS",
    description: "Professional bio",
  })
  @TrimString()
  @IsOptional()
  @MaxLength(500, {
    message: "Professional bio must not exceed 500 characters",
  })
  bio?: string;

  @ApiPropertyOptional({
    example: "+1234567890",
    description: "Phone number (max 30 chars)",
  })
  @TrimString()
  @IsOptional()
  @MaxLength(30, { message: "Phone must not exceed 30 characters" })
  @ValidateIf(
    (o) => o.phone !== undefined && o.phone !== null && o.phone !== ""
  )
  @IsPhoneNumber(undefined, { message: "Invalid phone number format" })
  phone?: string;

  @ApiPropertyOptional({
    example: "https://linkedin.com/in/johndoe",
    description: "LinkedIn profile URL (max 255 chars)",
  })
  @TrimString()
  @IsOptional()
  @MaxLength(255, { message: "LinkedIn URL must not exceed 255 characters" })
  @IsUrl({}, { message: "LinkedIn URL must be a valid URL" })
  linkedinUrl?: string;

  @ApiPropertyOptional({
    example: "https://yourcompany.com",
    description: "Website URL (max 255 chars)",
  })
  @TrimString()
  @IsOptional()
  @MaxLength(255, { message: "Website URL must not exceed 255 characters" })
  @IsUrl({}, { message: "Website URL must be a valid URL" })
  websiteUrl?: string;

  @ApiPropertyOptional({
    example: "Enterprise CRM solutions and sales automation software",
    description: "Products or services you sell",
  })
  @TrimString()
  @IsOptional()
  @MaxLength(500, { message: "Products must not exceed 500 characters" })
  products?: string;

  @ApiPropertyOptional({
    example:
      "We deliver 40% faster sales cycles through AI-powered lead qualification",
    description:
      "Why customers choose your product/service over the competition",
  })
  @TrimString()
  @IsOptional()
  @MaxLength(300, {
    message: "Unique selling proposition must not exceed 300 characters",
  })
  uniqueSellingProposition?: string;

  @ApiPropertyOptional({
    example:
      "Mid-market to enterprise B2B companies (500-5000 employees) in SaaS and fintech",
    description: "Your ideal target market description",
  })
  @TrimString()
  @IsOptional()
  @MaxLength(300, { message: "Target market must not exceed 300 characters" })
  targetMarket?: string;

  @ApiPropertyOptional({
    example: "51-200",
    description: "Company size band",
  })
  @TrimString()
  @IsOptional()
  companySize?: string;

  @ApiPropertyOptional({
    example: "$10M-$50M",
    description: "Annual revenue range",
  })
  @TrimString()
  @IsOptional()
  revenueRange?: string;

  @ApiPropertyOptional({
    example:
      "Certified Salesforce partner, 99% client retention rate, speaker at SaaStr",
    description:
      "Key credentials, certifications, awards, and professional accomplishments",
  })
  @TrimString()
  @IsOptional()
  @MaxLength(800, { message: "Key credentials must not exceed 800 characters" })
  keyCredentials?: string;

  @ApiPropertyOptional({
    example: "profiles/user-id/photo.jpg",
    description: "S3 key for profile photo",
  })
  @TrimString()
  @IsOptional()
  profilePhotoUrl?: string;

  @ApiPropertyOptional({
    example: false,
    description: "Whether the user has unsubscribed from subscription emails",
  })
  @IsBoolean()
  @IsOptional()
  isUserUnsubscribe?: boolean;
}

export class GenerateProfilePhotoUploadUrlDto {
  @ApiProperty({
    description: "Name of the file including extension",
    example: "profile.jpg",
  })
  @TrimString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: "Size of the file in bytes",
    example: 1024,
  })
  @IsNumber()
  @IsNotEmpty()
  fileSize: number;

  @ApiPropertyOptional({
    description: "MIME type of the file",
    example: "image/jpeg",
  })
  @TrimString()
  @IsOptional()
  mimeType?: string;
}

export class AccountDeletionSurveyDto {
  @ApiProperty({
    example: "I'm switching to a different platform",
    description: "Primary reason for account deletion",
  })
  @TrimString()
  @IsNotEmpty()
  primaryReason: string;

  @ApiPropertyOptional({
    example: "Using a cheaper alternative",
    description: "Additional details about the reason",
  })
  @TrimString()
  @IsOptional()
  additionalDetails?: string;

  @ApiPropertyOptional({
    example: "Great UI, but we need more integrations.",
    description: "Optional feedback text",
  })
  @TrimString()
  @IsOptional()
  feedbackText?: string;
}

export class DeleteAccountDto {
  @ApiProperty({ description: "Must be true to confirm irreversible deletion" })
  @IsBoolean()
  @Equals(true, { message: "Account deletion must be confirmed with true" })
  confirm!: boolean;

  @ApiPropertyOptional({
    description: "Detailed structured survey data in JSON format",
    type: AccountDeletionSurveyDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountDeletionSurveyDto)
  surveyData?: AccountDeletionSurveyDto;
}

export { UpdateUserConfigurationDto } from "./update-user-configuration.dto";
