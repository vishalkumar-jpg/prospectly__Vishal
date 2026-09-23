import { IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

export class SendIntroductionEmailDto {
  @ApiProperty()
  @TrimString()
  emailSubject: string;

  @ApiProperty()
  @TrimString()
  emailBody: string;

  @ApiProperty()
  @TrimString()
  contactId: string;

  @ApiProperty()
  @TrimString()
  targetContactName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  proposedMeetingDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  proposedMeetingTime?: string | null;

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
  customHtml?: string;
}
