import { IsOptional, MaxLength, IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

export class AcceptRequestDto {
  @ApiProperty({
    required: false,
    description: "Optional message from the connector to the requester",
  })
  @IsOptional()
  @TrimString()
  responderMessage?: string;
}

export class DeclineRequestDto {
  @ApiProperty({
    required: true,
    description: "Reason for declining the request",
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @TrimString()
  @MaxLength(100)
  declineReason: string;

  @ApiProperty({
    required: false,
    description: "Optional additional message/notes for declining the request",
    maxLength: 1000,
  })
  @IsOptional()
  @TrimString()
  @MaxLength(1000)
  declineMessage?: string;
}
