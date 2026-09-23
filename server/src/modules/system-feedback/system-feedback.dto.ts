import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  ValidateNested,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CreateMediaDto } from "modules/media/media.dto";
import { Type } from "class-transformer";

export enum FeedbackPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum FeedbackType {
  BUG = "bug",
  FEATURE = "feature",
  UI_UX = "ui_ux",
  GENERAL = "general",
}

export class CreateSystemFeedbackDto {
  @ApiProperty({ enum: FeedbackType })
  @IsEnum(FeedbackType)
  @IsNotEmpty()
  type: string;

  @ApiProperty({ enum: FeedbackPriority })
  @IsEnum(FeedbackPriority)
  @IsNotEmpty()
  priority: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currentPage?: string;

  @ApiPropertyOptional({
    description: "Media of the user",
    type: [CreateMediaDto],
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMediaDto)
  media?: CreateMediaDto[];
}

export class GenerateSystemFeedbackScreenshotUploadUrlDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mimeType?: string;
}
