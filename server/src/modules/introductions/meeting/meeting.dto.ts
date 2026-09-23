import { IsNumber, IsEmail, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

export class SelectedSlotDto {
  @ApiProperty()
  @TrimString()
  start: string;

  @ApiProperty()
  @TrimString()
  end: string;
}

export class ConfirmMeetingBookingDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => SelectedSlotDto)
  selectedSlot: SelectedSlotDto;

  @ApiProperty()
  @IsNumber()
  duration: number;

  @ApiProperty()
  @IsEmail()
  targetContactEmail: string;

  @ApiProperty()
  @TrimString()
  targetContactName: string;

  @ApiProperty()
  @TrimString()
  timezone: string;

  @ApiProperty()
  @TrimString()
  requesterTimezone: string;
}
