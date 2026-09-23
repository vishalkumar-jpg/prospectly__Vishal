import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsNumberString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { TrimString } from "decorators/trim-string.decorator";

@ValidatorConstraint({ name: "atLeastOneSearchField", async: false })
class AtLeastOneSearchField implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const obj = args.object as SearchTypesenseContactsQueryDto;
    // Bypass when linkedinUrl is provided (separate search path)
    if (obj.linkedinUrl?.trim()) return true;
    const filled = [
      obj.name,
      obj.title,
      obj.company,
      obj.website,
      obj.location,
    ].filter((v) => v?.trim()).length;
    return filled >= 1;
  }

  defaultMessage() {
    return "At least 1 search field (name, title, company, website, location) is required";
  }
}

export class SearchTypesenseContactsQueryDto {
  @ApiPropertyOptional({
    description: "Legacy search query (searches across all fields)",
  })
  @IsOptional()
  @TrimString()
  q?: string;

  @ApiPropertyOptional({
    description: "LinkedIn profile URL or username",
  })
  @IsOptional()
  @TrimString()
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: "Person's full name" })
  @IsOptional()
  @TrimString()
  name?: string;

  @ApiPropertyOptional({ description: "Company name" })
  @IsOptional()
  @TrimString()
  company?: string;

  @ApiPropertyOptional({ description: "Job title of the person" })
  @IsOptional()
  @TrimString()
  @Validate(AtLeastOneSearchField)
  title?: string;

  @ApiPropertyOptional({ description: "Website URL" })
  @IsOptional()
  @TrimString()
  website?: string;

  @ApiPropertyOptional({ description: "Location (city, state, or country)" })
  @IsOptional()
  @TrimString()
  location?: string;

  @ApiPropertyOptional({ description: "Maximum number of results" })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ description: "Page number (1-based)" })
  @IsOptional()
  @IsNumberString()
  page?: string;
}
