import {
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsNumberString,
  ValidateNested,
  Matches,
  Length,
  MaxLength,
  IsUrl,
  IsEmail,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";
import {
  CONTACT_LIST_SORT_BY,
  CONTACT_LIST_SORT_DIR,
  type ContactListSortBy,
  type ContactListSortDir,
} from "./contacts.constants";

export class CreateContactDto {
  @ApiProperty({ required: true })
  @IsNotEmpty({ message: "First name must be provided" })
  @Length(1, 50, {
    message: "First name must be between 1 and 50 characters",
  })
  @TrimString()
  firstName: string;

  @ApiProperty({ required: true })
  @IsNotEmpty({ message: "Last name must be provided" })
  @Length(1, 50, {
    message: "Last name must be between 1 and 50 characters",
  })
  @TrimString()
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail({}, { message: "Email must be a valid email address" })
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @MaxLength(50, { message: "Company must not exceed 50 characters" })
  @TrimString()
  company?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @MaxLength(50, { message: "Title must not exceed 50 characters" })
  @TrimString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  industry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({}, { message: "LinkedIn must be a valid URL" })
  @MaxLength(255, { message: "LinkedIn URL must not exceed 255 characters" })
  @Matches(/linkedin\.com/i, {
    message: "LinkedIn URL must contain linkedin.com",
  })
  @TrimString()
  linkedin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  secondaryEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  source?: string;
}

class ImportContactItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  first_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  last_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail({}, { message: "Email must be a valid email address" })
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  phone_number?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  company?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  industry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  linkedin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  secondary_email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @TrimString()
  profile_photo_url?: string;
}

export class ImportContactsDto {
  @ApiProperty({ type: [ImportContactItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportContactItemDto)
  contacts: ImportContactItemDto[];

  @ApiProperty({ required: false, default: "csv_import" })
  @IsOptional()
  @TrimString()
  source?: string;
}

export class GetContactsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  searchTerm?: string;

  @ApiPropertyOptional({
    enum: CONTACT_LIST_SORT_BY,
    description: "Column to sort by when sortDir is asc or desc",
  })
  @IsOptional()
  @TrimString()
  @IsIn([...CONTACT_LIST_SORT_BY])
  sortBy?: ContactListSortBy;

  @ApiPropertyOptional({
    enum: CONTACT_LIST_SORT_DIR,
    description:
      "default or omitted: updatedAt DESC. asc/desc: sort by sortBy.",
  })
  @IsOptional()
  @TrimString()
  @IsIn([...CONTACT_LIST_SORT_DIR])
  sortDir?: ContactListSortDir;
}

export class SearchGlobalContactsQueryDto {
  @ApiPropertyOptional({
    description: "Legacy search query (searches across all fields)",
  })
  @IsOptional()
  @TrimString()
  q?: string;

  @ApiPropertyOptional({
    description:
      "LinkedIn profile URL or username (e.g., linkedin.com/in/johndoe or just johndoe)",
  })
  @IsOptional()
  @TrimString()
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: "Person's full name" })
  @IsOptional()
  @TrimString()
  name?: string;

  @ApiPropertyOptional({ description: "Person's email address" })
  @IsOptional()
  @TrimString()
  email?: string;

  @ApiPropertyOptional({ description: "Company name" })
  @IsOptional()
  @TrimString()
  company?: string;

  @ApiPropertyOptional({ description: "Company website/domain" })
  @IsOptional()
  @TrimString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export { SearchGlobalContactsBodyDto } from "./search-global-contacts-body.dto";

export class CheckEmailDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail({}, { message: "Email must be a valid email address" })
  @TrimString()
  email: string;
}

export class ConnectAppleContactsDto {
  @ApiProperty()
  @IsNotEmpty()
  @TrimString()
  apple_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @TrimString()
  app_password: string;
}

export class ImportAppleContactsDto {
  @ApiProperty()
  @IsNotEmpty()
  @TrimString()
  apple_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @TrimString()
  app_password: string;
}

export class GoogleImportProcessCallbackDto {
  @ApiProperty()
  @IsNotEmpty()
  @TrimString()
  code: string;
}

export class MicrosoftImportProcessCallbackDto extends GoogleImportProcessCallbackDto {}

export class ImportMicrosoftContactsDto {
  @ApiProperty()
  @IsNotEmpty()
  @TrimString()
  code: string;

  @ApiProperty()
  @IsNotEmpty()
  @TrimString()
  redirectUri: string;
}

export class UpdateBountyAmountDto {
  @ApiProperty({
    description:
      "Referral payout amount as a string (must be a whole number between 1 and 999,999)",
    example: "100",
    maximum: 999999,
  })
  @IsNotEmpty({ message: "Referral payout amount is required" })
  @IsNumberString(
    {},
    { message: "Referral payout amount must be a valid number" }
  )
  @Matches(/^\d+$/, {
    message:
      "Referral payout amount must be a whole number (no decimals allowed)",
  })
  @TrimString()
  bountyAmount: string;
}

export class GenerateLinkedInZipUploadUrlDto {
  @ApiProperty({
    description: "Name of the zip file including extension",
    example: "linkedin-export.zip",
  })
  @TrimString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: "Size of the file in bytes",
    example: "1024000",
  })
  @IsNumberString()
  @IsNotEmpty()
  fileSize: string;
}

export class CompleteLinkedInZipUploadDto {
  @ApiProperty({
    description: "S3 key of the uploaded zip file",
    example: "linkedin-imports/user-id/uuid/linkedin-export.zip",
  })
  @TrimString()
  @IsNotEmpty()
  s3Key: string;
}

export class ListContactImportAccountsQueryDto {
  @ApiPropertyOptional({
    description: "Filter by contacts provider",
    enum: ["google", "microsoft", "apple"],
  })
  @IsOptional()
  @TrimString()
  @IsIn(["google", "microsoft", "apple"], {
    message: "provider must be google, microsoft, or apple",
  })
  provider?: "google" | "microsoft" | "apple";
}
