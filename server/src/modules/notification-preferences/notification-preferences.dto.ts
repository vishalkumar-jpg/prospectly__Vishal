import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class UnsubscribeQueryDto {
  @IsOptional()
  @IsUUID()
  u?: string;

  @IsOptional()
  @IsString()
  e?: string;

  @IsOptional()
  @IsString()
  sig?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class CategoryPreferenceDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsBoolean()
  enabled!: boolean;
}

export class SaveNotificationPreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryPreferenceDto)
  categories!: CategoryPreferenceDto[];

  @IsOptional()
  @IsBoolean()
  unsubscribeAll?: boolean;
}

export class PublicSaveNotificationPreferencesDto extends SaveNotificationPreferencesDto {
  @IsOptional()
  @IsUUID()
  u?: string;

  @IsOptional()
  @IsString()
  e?: string;

  @IsString()
  @IsNotEmpty()
  sig!: string;
}

export class OneClickUnsubscribeDto {
  @IsOptional()
  @IsUUID()
  u?: string;

  @IsOptional()
  @IsString()
  e?: string;

  @IsString()
  @IsNotEmpty()
  sig!: string;

  @IsOptional()
  @IsString()
  category?: string;
}
