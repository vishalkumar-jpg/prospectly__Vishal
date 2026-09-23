import { IsOptional, IsString, MaxLength } from "class-validator";
import { TrimString } from "decorators/trim-string.decorator";

export class CreatePayoutAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @TrimString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @TrimString()
  refreshUrl?: string;
}
