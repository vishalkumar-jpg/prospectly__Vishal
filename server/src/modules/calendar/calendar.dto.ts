import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNotEmpty, IsNumber } from "class-validator";
import { TrimString } from "decorators/trim-string.decorator";

export class CallbackQueryDto {
  @ApiPropertyOptional({
    description: "Authorization code from OAuth provider",
  })
  @IsOptional()
  @TrimString()
  code?: string;

  @ApiPropertyOptional({ description: "State parameter (user ID)" })
  @IsOptional()
  @TrimString()
  state?: string;
}

export class ProcessCallbackDto {
  @ApiProperty({ description: "Authorization code from OAuth provider" })
  @IsNotEmpty()
  @TrimString()
  code: string;

  @ApiProperty({ description: "State parameter (user ID)" })
  @IsNotEmpty()
  @TrimString()
  state: string;
}

export class CalendarTokensDto {
  @TrimString()
  @IsNotEmpty()
  accessToken: string;

  @IsOptional()
  @TrimString()
  refreshToken?: string;

  @IsOptional()
  @IsNumber()
  expiryDate?: number;
}
