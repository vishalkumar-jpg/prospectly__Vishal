import { IsNumber, IsOptional, IsDateString, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

export class CreateIntroductionDto {
  @ApiProperty()
  @TrimString()
  contactName: string;

  @ApiProperty()
  @IsNumber()
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
  @IsNumber()
  contactId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  contactOwnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  proposedMeetingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  proposedMeetingTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  meetingDuration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  meetingPlatform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;
}

export class GenerateProfilePhotoUploadUrlDto {
  @ApiProperty({
    description: "Name of the file including extension",
    example: "profile.jpg",
  })
  @TrimString()
  fileName: string;

  @ApiProperty({
    description: "Size of the file in bytes",
    example: 1024,
  })
  @IsNumber()
  fileSize: number;

  @ApiPropertyOptional({
    description: "MIME type of the file",
    example: "image/jpeg",
  })
  @IsOptional()
  @TrimString()
  mimeType?: string;
}
