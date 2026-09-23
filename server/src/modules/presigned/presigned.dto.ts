import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { TrimString } from "decorators/trim-string.decorator";
import { AccessControl } from "./presigned.types";

export class PresignDto {
  @ApiProperty()
  @TrimString()
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiPropertyOptional()
  @TrimString()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty()
  @TrimString()
  @IsNotEmpty()
  fileType: string;

  @ApiPropertyOptional({ enum: AccessControl })
  @IsEnum(AccessControl)
  @IsOptional()
  accessControl?: AccessControl;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata: Record<string, AnyType>;
}
