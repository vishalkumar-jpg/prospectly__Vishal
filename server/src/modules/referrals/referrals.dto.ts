import { IsEmail, IsNotEmpty, IsUUID, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

export class SendReferralInviteDto {
  @ApiProperty({ required: true, example: "user@example.com" })
  @IsNotEmpty()
  @IsEmail({}, { message: "Email must be a valid email address" })
  @TrimString()
  email: string;

  @ApiProperty({
    required: true,
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsNotEmpty()
  @IsUUID("4", { message: "planId must be a valid UUID" })
  @TrimString()
  planId: string;

  @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440001" })
  @IsOptional()
  @IsUUID("4", { message: "organisationId must be a valid UUID" })
  @TrimString()
  organisationId?: string;
}
