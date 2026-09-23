import {
  IsOptional,
  IsNumberString,
  IsUUID,
  IsString,
  MaxLength,
} from "class-validator";
import { TrimString } from "decorators/trim-string.decorator";

export class GetJobPoolMatchesQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @TrimString()
  search?: string;
}

export class ApproveJobPoolMatchParamDto {
  @IsUUID()
  id: string;
}

export class DeclineJobPoolMatchParamDto {
  @IsUUID()
  id: string;
}

export class DeclineJobPoolMatchBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
