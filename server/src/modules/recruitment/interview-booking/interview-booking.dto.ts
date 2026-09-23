import { IsNotEmpty, IsString, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class InterviewBookingParamDto {
  @IsNotEmpty()
  @IsUUID()
  candidateId: string;

  @IsNotEmpty()
  @IsString()
  token: string;
}

class SelectedSlotDto {
  @IsNotEmpty()
  @IsString()
  start: string;

  @IsNotEmpty()
  @IsString()
  end: string;
}

export class ConfirmInterviewBookingDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => SelectedSlotDto)
  selectedSlot: SelectedSlotDto;

  @IsNotEmpty()
  @IsString()
  timezone: string;

  @IsNotEmpty()
  @IsString()
  requesterTimezone: string;
}
