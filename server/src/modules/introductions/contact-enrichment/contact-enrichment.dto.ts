import { IsString, IsIn, IsOptional, IsNotEmpty } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EnrichContactDto {
  @ApiProperty({ description: "Contact DB ID or Apollo person ID" })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "Source: contacts (existing DB record) or apollo (cache)",
    enum: ["contacts", "apollo"],
  })
  @IsString()
  @IsIn(["contacts", "apollo"])
  source: "contacts" | "apollo";

  @ApiPropertyOptional({
    description: "LinkedIn URL (passed for contacts source)",
  })
  @IsOptional()
  @IsString()
  linkedin_url?: string;
}
