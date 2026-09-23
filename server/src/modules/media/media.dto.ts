import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber } from "class-validator";
import { TrimString } from "decorators/trim-string.decorator";
import { removeImageUrl } from "utils/helper.utils";
import { MediaModules, MediaType } from "./media.constants";

export class CreateMediaDto {
  @ApiProperty({ enum: MediaModules, enumName: "MediaModules" })
  @IsNotEmpty()
  @IsEnum(MediaModules)
  module: MediaModules;

  @ApiProperty()
  @IsNotEmpty()
  @TrimString()
  fileName: string;

  @ApiProperty()
  @IsNotEmpty()
  @TrimString()
  @Transform(({ value }) => removeImageUrl(value))
  filePath: string;

  @ApiProperty()
  @IsNotEmpty()
  @TrimString()
  mimeType: string;

  @ApiProperty({ enum: MediaType, enumName: "MediaType" })
  @IsNotEmpty()
  @IsEnum(MediaType)
  fileType: MediaType;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  size: number;
}
