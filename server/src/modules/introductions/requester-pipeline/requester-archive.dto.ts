import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString, Length } from "class-validator";
import { TrimString } from "decorators/trim-string.decorator";
import { REQUESTER_ARCHIVE_REASON_VALUES } from "./requester-archive.constants";

export class ArchiveRequesterIntroductionDto {
  @ApiProperty({
    description: "Why the requester is withdrawing this introduction",
    enum: REQUESTER_ARCHIVE_REASON_VALUES,
  })
  @IsIn(REQUESTER_ARCHIVE_REASON_VALUES, {
    message: `archiveReason must be one of: ${REQUESTER_ARCHIVE_REASON_VALUES.join(", ")}`,
  })
  @TrimString()
  archiveReason: string;

  @ApiProperty({
    description: "Additional context (required, min 10 characters)",
    minLength: 10,
    maxLength: 255,
  })
  @IsNotEmpty({ message: "Additional notes are required" })
  @IsString()
  @Length(10, 255, {
    message: "Additional notes must be between 10 and 255 characters",
  })
  @TrimString()
  archiveNotes: string;
}
