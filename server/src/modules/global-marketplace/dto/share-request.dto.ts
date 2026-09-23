import {
  IsNotEmpty,
  IsUUID,
  IsIn,
  IsOptional,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

export class ShareRequestDto {
  @ApiProperty({ description: "ID of the introduction request to share" })
  @IsNotEmpty()
  @IsUUID()
  introductionRequestId: string;

  @ApiProperty({
    enum: ["linkedin", "twitter", "facebook", "copy"],
    description: "Platform where the request is being shared",
  })
  @IsNotEmpty()
  @IsIn(["linkedin", "twitter", "facebook", "copy"])
  platform: string;

  @ApiPropertyOptional({ description: "UTM source parameter" })
  @IsOptional()
  @MaxLength(100)
  @TrimString()
  utmSource?: string;

  @ApiPropertyOptional({ description: "UTM medium parameter" })
  @IsOptional()
  @MaxLength(100)
  @TrimString()
  utmMedium?: string;

  @ApiPropertyOptional({ description: "UTM campaign parameter" })
  @IsOptional()
  @MaxLength(100)
  @TrimString()
  utmCampaign?: string;
}

export class ShareRequestResponseDto {
  shareId: string;
  sharerCode: string;
  shareUrl: string;
  platform: string;
}

export class GetMySharesQueryDto {
  @ApiPropertyOptional({ default: "1" })
  @IsOptional()
  @TrimString()
  page?: string;

  @ApiPropertyOptional({ default: "20" })
  @IsOptional()
  @TrimString()
  limit?: string;

  @ApiPropertyOptional({
    enum: ["active", "claimed", "expired", "completed", "all"],
    default: "all",
  })
  @IsOptional()
  @IsIn(["active", "claimed", "expired", "completed", "all"])
  status?: string;
}
