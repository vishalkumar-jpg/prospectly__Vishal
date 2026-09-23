import {
  IsString,
  Matches,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  IsNotEmpty,
  IsIn,
} from "class-validator";
import { Transform } from "class-transformer";
import { SUPPORTED_PAYOUT_COUNTRIES } from "config/payment.config";

export class ResendInviteDto {
  @IsString()
  @Matches(/^\d+$/, { message: "contactId must be numeric" })
  contactId!: string;
}

export class GenerateInviteDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsNotEmpty()
  @IsString({ each: true })
  contactIds!: string[];

  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsString()
  @IsOptional()
  organisationId?: string;

  @IsString()
  @IsOptional()
  customHtml?: string;

  @IsString()
  @IsOptional()
  inviteText?: string;

  @IsString()
  @IsNotEmpty({ message: "Country is required" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value
  )
  @IsIn([...SUPPORTED_PAYOUT_COUNTRIES], {
    message: "Country must be a supported payout country",
  })
  country!: string;
}
