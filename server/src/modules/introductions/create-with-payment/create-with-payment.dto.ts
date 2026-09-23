import {
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsString,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

export class CreateIntroductionWithPaymentDto {
  @ApiProperty()
  @TrimString()
  contactName: string;

  @ApiProperty({
    description:
      "Referral payout amount in dollars (must be a whole number between 10 and 999,999)",
    example: 100,
    minimum: 10,
    maximum: 999999,
  })
  @IsNumber({}, { message: "Referral payout amount must be a valid number" })
  @IsInt({
    message:
      "Referral payout amount must be a whole number (no decimals allowed)",
  })
  @Min(10, { message: "Referral payout amount must be at least $10" })
  @Max(999999, { message: "Referral payout amount cannot exceed $999,999" })
  bountyAmount: number;

  @ApiProperty()
  @TrimString()
  meetingDescription: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  meetingTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  additionalContext?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  contactOwnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @ApiPropertyOptional({
    description:
      "Array of privacy rule IDs to apply to this request. If not provided, all active privacy rules will be used.",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedPrivacyRuleIds?: string[];
}
