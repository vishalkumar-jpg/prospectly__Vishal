import {
  IsNotEmpty,
  IsUUID,
  IsIn,
  IsOptional,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

export class CreateJobShareDto {
  @ApiProperty({ description: "ID of the recruitment job to share" })
  @IsNotEmpty()
  @IsUUID()
  jobId: string;

  @ApiProperty({
    enum: ["linkedin", "twitter", "facebook", "copy"],
    description: "Platform where the job is being shared",
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

export class GetMyJobSharesQueryDto {
  @ApiPropertyOptional({ default: "1" })
  @IsOptional()
  @TrimString()
  page?: string;

  @ApiPropertyOptional({ default: "20" })
  @IsOptional()
  @TrimString()
  limit?: string;
}
